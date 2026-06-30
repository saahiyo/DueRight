from datetime import datetime, date
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DeadlineType(str, Enum):
    bill = "bill"
    renewal = "renewal"
    application = "application"
    other = "other"


class UrgencyLevel(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class DeadlineStatus(str, Enum):
    pending = "pending"
    actioned = "actioned"
    resolved = "resolved"


class RecurrenceType(str, Enum):
    none = "none"
    monthly = "monthly"
    yearly = "yearly"


class Deadline(BaseModel):
    id: Optional[str] = None
    title: str
    raw_input: Optional[str] = None
    type: DeadlineType = DeadlineType.other
    due_date: date
    consequence: Optional[str] = None
    urgency: UrgencyLevel = UrgencyLevel.medium
    status: DeadlineStatus = DeadlineStatus.pending
    recurrence: RecurrenceType = RecurrenceType.none
    drafted_action: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
