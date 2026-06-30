import calendar
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Deadline, DeadlineStatus, UrgencyLevel, RecurrenceType
from schemas import DeadlineCreate, DeadlineRead, DeadlineUpdateStatus
import gemini_service as gemini
from auth import get_current_user, firebase_auth_enabled

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
def create_deadline(
    payload: DeadlineCreate,
    session: Session = Depends(get_session),
    uid: str = Depends(get_current_user),
):
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
            user_id=uid,
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
            user_id=uid,
        )

    if firebase_auth_enabled:
        from firebase_admin import db
        ref = db.reference(f"deadlines/{uid}")
        new_ref = ref.push()
        deadline_id = new_ref.key
        data_dict = {
            "id": deadline_id,
            "title": deadline.title,
            "raw_input": deadline.raw_input,
            "type": deadline.type.value if hasattr(deadline.type, 'value') else deadline.type,
            "due_date": deadline.due_date.isoformat(),
            "consequence": deadline.consequence,
            "urgency": deadline.urgency.value if hasattr(deadline.urgency, 'value') else deadline.urgency,
            "status": deadline.status.value if hasattr(deadline.status, 'value') else deadline.status,
            "recurrence": deadline.recurrence.value if hasattr(deadline.recurrence, 'value') else deadline.recurrence,
            "drafted_action": deadline.drafted_action,
            "user_id": uid,
        }
        new_ref.set(data_dict)
        return data_dict

    session.add(deadline)
    session.commit()
    session.refresh(deadline)
    return deadline


@router.get("", response_model=List[DeadlineRead])
def list_deadlines(
    session: Session = Depends(get_session),
    uid: str = Depends(get_current_user),
):
    """List all deadlines, sorted by urgency then due date."""
    if firebase_auth_enabled:
        from firebase_admin import db
        ref = db.reference(f"deadlines/{uid}")
        data = ref.get() or {}
        deadlines_list = []
        for k, v in data.items():
            v["id"] = k
            deadlines_list.append(v)
        deadlines_list.sort(key=lambda d: (URGENCY_ORDER.get(d.get("urgency", "medium"), 4), d.get("due_date", "")))
        return deadlines_list

    deadlines = session.exec(select(Deadline).where(Deadline.user_id == uid)).all()
    deadlines.sort(key=lambda d: (URGENCY_ORDER.get(d.urgency, 4), d.due_date))
    return deadlines


@router.get("/{deadline_id}", response_model=DeadlineRead)
def get_deadline(
    deadline_id: str,
    session: Session = Depends(get_session),
    uid: str = Depends(get_current_user),
):
    if firebase_auth_enabled:
        from firebase_admin import db
        ref = db.reference(f"deadlines/{uid}/{deadline_id}")
        data = ref.get()
        if not data:
            raise HTTPException(status_code=404, detail="Deadline not found")
        data["id"] = deadline_id
        return data

    try:
        db_id = int(deadline_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Deadline not found")

    deadline = session.get(Deadline, db_id)
    if not deadline or deadline.user_id != uid:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return deadline


@router.patch("/{deadline_id}/status", response_model=DeadlineRead)
def update_status(
    deadline_id: str,
    payload: DeadlineUpdateStatus,
    session: Session = Depends(get_session),
    uid: str = Depends(get_current_user),
):
    if firebase_auth_enabled:
        from firebase_admin import db
        ref = db.reference(f"deadlines/{uid}/{deadline_id}")
        data = ref.get()
        if not data:
            raise HTTPException(status_code=404, detail="Deadline not found")
        
        old_status = data.get("status", "pending")
        new_status = payload.status.value if hasattr(payload.status, 'value') else payload.status
        
        ref.update({"status": new_status})
        data["status"] = new_status
        
        if new_status == "resolved" and old_status != "resolved":
            recurrence = data.get("recurrence", "none")
            if recurrence != "none":
                due_date_str = data.get("due_date")
                due_date_val = date.fromisoformat(due_date_str)
                next_due = calculate_next_due_date(due_date_val, recurrence)
                
                list_ref = db.reference(f"deadlines/{uid}")
                new_ref = list_ref.push()
                new_id = new_ref.key
                new_deadline = {
                    "id": new_id,
                    "title": data.get("title"),
                    "raw_input": data.get("raw_input"),
                    "type": data.get("type"),
                    "due_date": next_due.isoformat(),
                    "consequence": data.get("consequence"),
                    "urgency": data.get("urgency"),
                    "recurrence": recurrence,
                    "status": "pending",
                    "user_id": uid,
                }
                new_ref.set(new_deadline)
        
        data["id"] = deadline_id
        return data

    try:
        db_id = int(deadline_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Deadline not found")

    deadline = session.get(Deadline, db_id)
    if not deadline or deadline.user_id != uid:
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
                user_id=uid,
            )
            session.add(new_deadline)

    session.add(deadline)
    session.commit()
    session.refresh(deadline)
    return deadline


@router.post("/{deadline_id}/draft-action", response_model=DeadlineRead)
def generate_draft_action(
    deadline_id: str,
    session: Session = Depends(get_session),
    uid: str = Depends(get_current_user),
):
    """The core agentic step: generate a ready-to-send action for this deadline."""
    if firebase_auth_enabled:
        from firebase_admin import db
        ref = db.reference(f"deadlines/{uid}/{deadline_id}")
        data = ref.get()
        if not data:
            raise HTTPException(status_code=404, detail="Deadline not found")
        
        draft = gemini.draft_action(
            data.get("title", ""),
            data.get("type", "other"),
            data.get("due_date", ""),
            data.get("consequence", ""),
        )
        
        update_dict = {"drafted_action": draft}
        if data.get("status") == "pending":
            update_dict["status"] = "actioned"
            data["status"] = "actioned"
            
        ref.update(update_dict)
        data["drafted_action"] = draft
        data["id"] = deadline_id
        return data

    try:
        db_id = int(deadline_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Deadline not found")

    deadline = session.get(Deadline, db_id)
    if not deadline or deadline.user_id != uid:
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
def delete_deadline(
    deadline_id: str,
    session: Session = Depends(get_session),
    uid: str = Depends(get_current_user),
):
    if firebase_auth_enabled:
        from firebase_admin import db
        ref = db.reference(f"deadlines/{uid}/{deadline_id}")
        if not ref.get():
            raise HTTPException(status_code=404, detail="Deadline not found")
        ref.delete()
        return {"ok": True}

    try:
        db_id = int(deadline_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Deadline not found")

    deadline = session.get(Deadline, db_id)
    if not deadline or deadline.user_id != uid:
        raise HTTPException(status_code=404, detail="Deadline not found")
    session.delete(deadline)
    session.commit()
    return {"ok": True}
