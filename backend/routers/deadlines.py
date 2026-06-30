import calendar
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Deadline, DeadlineStatus, UrgencyLevel, RecurrenceType
from schemas import DeadlineCreate, DeadlineRead, DeadlineUpdateStatus
import gemini_service as gemini

router = APIRouter(prefix="/deadlines", tags=["deadlines"])

URGENCY_ORDER = {
    UrgencyLevel.critical: 0,
    UrgencyLevel.high: 1,
    UrgencyLevel.medium: 2,
    UrgencyLevel.low: 3,
}


def calculate_next_due_date(current_date: date, recurrence: str) -> date:
    if recurrence == "monthly":
        year = current_date.year
        month = current_date.month + 1
        if month > 12:
            month = 1
            year += 1
        _, last_day = calendar.monthrange(year, month)
        day = min(current_date.day, last_day)
        return date(year, month, day)
    elif recurrence == "yearly":
        year = current_date.year + 1
        month = current_date.month
        day = current_date.day
        if month == 2 and day == 29:
            if not calendar.isleap(year):
                day = 28
        return date(year, month, day)
    return current_date


@router.post("", response_model=DeadlineRead)
def create_deadline(payload: DeadlineCreate, session: Session = Depends(get_session)):
    """Create a deadline either from free text (Gemini parses it) or
    from structured fields (Gemini classifies urgency)."""
    if payload.text:
        try:
            parsed = gemini.parse_deadline_text(payload.text)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        deadline = Deadline(
            title=parsed["title"],
            raw_input=payload.text,
            type=parsed.get("type", "other"),
            due_date=date.fromisoformat(parsed["due_date"]),
            consequence=parsed.get("consequence"),
            urgency=parsed.get("urgency", "medium"),
            recurrence=parsed.get("recurrence", "none"),
        )
    else:
        if not (payload.title and payload.due_date):
            raise HTTPException(
                status_code=422,
                detail="Provide either `text`, or both `title` and `due_date`.",
            )
        urgency = gemini.classify_urgency(
            payload.title,
            payload.type or "other",
            payload.due_date.isoformat(),
            payload.consequence or "",
        )
        deadline = Deadline(
            title=payload.title,
            type=payload.type or "other",
            due_date=payload.due_date,
            consequence=payload.consequence,
            urgency=urgency,
            recurrence=payload.recurrence or RecurrenceType.none,
        )

    session.add(deadline)
    session.commit()
    session.refresh(deadline)
    return deadline


@router.get("", response_model=List[DeadlineRead])
def list_deadlines(session: Session = Depends(get_session)):
    """List all deadlines, sorted by urgency then due date."""
    deadlines = session.exec(select(Deadline)).all()
    deadlines.sort(key=lambda d: (URGENCY_ORDER.get(d.urgency, 4), d.due_date))
    return deadlines


@router.get("/{deadline_id}", response_model=DeadlineRead)
def get_deadline(deadline_id: int, session: Session = Depends(get_session)):
    deadline = session.get(Deadline, deadline_id)
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return deadline


@router.patch("/{deadline_id}/status", response_model=DeadlineRead)
def update_status(
    deadline_id: int,
    payload: DeadlineUpdateStatus,
    session: Session = Depends(get_session),
):
    deadline = session.get(Deadline, deadline_id)
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    
    old_status = deadline.status
    deadline.status = payload.status
    
    if payload.status == DeadlineStatus.resolved and old_status != DeadlineStatus.resolved:
        if deadline.recurrence != RecurrenceType.none:
            next_due = calculate_next_due_date(deadline.due_date, deadline.recurrence)
            new_deadline = Deadline(
                title=deadline.title,
                raw_input=deadline.raw_input,
                type=deadline.type,
                due_date=next_due,
                consequence=deadline.consequence,
                urgency=deadline.urgency,
                recurrence=deadline.recurrence,
                status=DeadlineStatus.pending,
            )
            session.add(new_deadline)

    session.add(deadline)
    session.commit()
    session.refresh(deadline)
    return deadline


@router.post("/{deadline_id}/draft-action", response_model=DeadlineRead)
def generate_draft_action(deadline_id: int, session: Session = Depends(get_session)):
    """The core agentic step: generate a ready-to-send action for this deadline."""
    deadline = session.get(Deadline, deadline_id)
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    draft = gemini.draft_action(
        deadline.title,
        deadline.type,
        deadline.due_date.isoformat(),
        deadline.consequence or "",
    )
    deadline.drafted_action = draft
    if deadline.status == DeadlineStatus.pending:
        deadline.status = DeadlineStatus.actioned
    session.add(deadline)
    session.commit()
    session.refresh(deadline)
    return deadline


@router.delete("/{deadline_id}")
def delete_deadline(deadline_id: int, session: Session = Depends(get_session)):
    deadline = session.get(Deadline, deadline_id)
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    session.delete(deadline)
    session.commit()
    return {"ok": True}
