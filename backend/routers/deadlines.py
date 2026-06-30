import calendar
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from models import Deadline, DeadlineStatus, UrgencyLevel, RecurrenceType
from schemas import DeadlineCreate, DeadlineRead, DeadlineUpdateStatus
import gemini_service as gemini
from auth import get_current_user

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


@router.get("", response_model=List[DeadlineRead])
def list_deadlines(
    uid: str = Depends(get_current_user),
):
    """List all deadlines, sorted by urgency then due date."""
    from firebase_admin import db
    ref = db.reference(f"deadlines/{uid}")
    data = ref.get() or {}
    deadlines_list = []
    for k, v in data.items():
        v["id"] = k
        deadlines_list.append(v)
    deadlines_list.sort(key=lambda d: (URGENCY_ORDER.get(d.get("urgency", "medium"), 4), d.get("due_date", "")))
    return deadlines_list


@router.get("/{deadline_id}", response_model=DeadlineRead)
def get_deadline(
    deadline_id: str,
    uid: str = Depends(get_current_user),
):
    from firebase_admin import db
    ref = db.reference(f"deadlines/{uid}/{deadline_id}")
    data = ref.get()
    if not data:
        raise HTTPException(status_code=404, detail="Deadline not found")
    data["id"] = deadline_id
    return data


@router.patch("/{deadline_id}/status", response_model=DeadlineRead)
def update_status(
    deadline_id: str,
    payload: DeadlineUpdateStatus,
    uid: str = Depends(get_current_user),
):
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


@router.post("/{deadline_id}/draft-action", response_model=DeadlineRead)
def generate_draft_action(
    deadline_id: str,
    uid: str = Depends(get_current_user),
):
    """The core agentic step: generate a ready-to-send action for this deadline."""
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


@router.delete("/{deadline_id}")
def delete_deadline(
    deadline_id: str,
    uid: str = Depends(get_current_user),
):
    from firebase_admin import db
    ref = db.reference(f"deadlines/{uid}/{deadline_id}")
    if not ref.get():
        raise HTTPException(status_code=404, detail="Deadline not found")
    ref.delete()
    return {"ok": True}
