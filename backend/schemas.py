from datetime import date
from typing import Optional
from pydantic import BaseModel
from models import DeadlineType, UrgencyLevel, DeadlineStatus, RecurrenceType


class DeadlineCreate(BaseModel):
    # Provide EITHER free-text `text` (parsed by Gemini) OR the structured
    # fields below (title + due_date required, urgency auto-classified).
    text: Optional[str] = None
    title: Optional[str] = None
    type: Optional[DeadlineType] = None
    due_date: Optional[date] = None
    consequence: Optional[str] = None
    recurrence: Optional[RecurrenceType] = None


class DeadlineUpdateStatus(BaseModel):
    status: DeadlineStatus


class DeadlineRead(BaseModel):
    id: int
    title: str
    type: DeadlineType
    due_date: date
    consequence: Optional[str] = None
    urgency: UrgencyLevel
    status: DeadlineStatus
    recurrence: RecurrenceType
    drafted_action: Optional[str] = None

    class Config:
        from_attributes = True
