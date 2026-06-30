import os
import json
import logging
from datetime import date
from enum import Enum
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client: genai.Client | None = None


def get_client() -> genai.Client:
    """Lazily create the Gemini client (reads GEMINI_API_KEY from env)."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to backend/.env "
                "(get one at https://aistudio.google.com/app/apikey)"
            )
        _client = genai.Client(api_key=api_key)
    return _client


# Pydantic schemas for Gemini Structured Outputs
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


class RecurrenceType(str, Enum):
    none = "none"
    monthly = "monthly"
    yearly = "yearly"


class DeadlineParsed(BaseModel):
    title: str = Field(..., description="A concise, actionable title of the deadline")
    type: DeadlineType = Field(..., description="The classification of the deadline task")
    due_date: str = Field(..., description="The due date of the deadline in YYYY-MM-DD format")
    consequence: str = Field(..., description="Brief summary of what happens if missed")
    urgency: UrgencyLevel = Field(..., description="The calculated level of urgency based on the due date and consequence")
    recurrence: RecurrenceType = Field(default=RecurrenceType.none, description="The recurrence interval if mentioned (e.g., 'monthly', 'every month', 'annually', 'each year'). Default is 'none'")


class UrgencyClassification(BaseModel):
    urgency: UrgencyLevel = Field(..., description="The urgency level based on proximity and consequences")


# ---------------------------------------------------------------------------
# 1. Parse free text -> structured deadline
# ---------------------------------------------------------------------------

PARSE_PROMPT = """You are a deadline-extraction assistant for a personal finance/admin app.
Given the user's free text, extract a single deadline.
Today's date is {today}.

User input: "{text}"
"""


def parse_deadline_text(text: str) -> dict:
    client = get_client()
    prompt = PARSE_PROMPT.format(today=date.today().isoformat(), text=text)
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=DeadlineParsed,
            temperature=0.2,
        ),
    )
    try:
        return json.loads(response.text)
    except (json.JSONDecodeError, TypeError) as e:
        logger.error("Failed to parse Gemini response: %s | raw=%s", e, response.text)
        raise ValueError("Could not understand that deadline. Try rephrasing.") from e


# ---------------------------------------------------------------------------
# 2. Classify urgency for manually-entered deadlines
# ---------------------------------------------------------------------------

CLASSIFY_PROMPT = """Classify the urgency of this deadline for a personal admin app.
Title: {title}
Type: {type}
Due date: {due_date}
Today: {today}
Consequence if missed: {consequence}
"""


def classify_urgency(title: str, type_: str, due_date: str, consequence: str) -> str:
    client = get_client()
    prompt = CLASSIFY_PROMPT.format(
        title=title, type=type_, due_date=due_date,
        today=date.today().isoformat(), consequence=consequence or "unspecified",
    )
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=UrgencyClassification,
            temperature=0.1,
        ),
    )
    try:
        data = json.loads(response.text)
        return data.get("urgency", "medium")
    except Exception as e:
        logger.error("Failed to classify urgency: %s | raw=%s", e, response.text)
        return "medium"


# ---------------------------------------------------------------------------
# 3. Draft the agentic action (the core differentiator)
# ---------------------------------------------------------------------------

DRAFT_PROMPT = """You are an assistant that drafts a short, ready-to-send message
helping a user act on an upcoming deadline before it's missed.

Deadline: {title}
Type: {type}
Due date: {due_date}
Consequence if missed: {consequence}

Write a concise, polite, ready-to-send email or message (3-6 sentences) appropriate
for this deadline -- e.g. a payment confirmation request, a renewal inquiry,
or an extension request, whichever fits best. Return ONLY the message text,
no subject line, no markdown, no explanation.
"""


def draft_action(title: str, type_: str, due_date: str, consequence: str) -> str:
    client = get_client()
    prompt = DRAFT_PROMPT.format(
        title=title, type=type_, due_date=due_date,
        consequence=consequence or "unspecified",
    )
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.4),
    )
    return (response.text or "").strip()
