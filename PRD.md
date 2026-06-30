# DueRight — Product Requirements Document

## 1. Problem Statement
**Track:** The Last-Minute Life Saver (Hackathon: Vibe2Ship)

People miss bills, renewals, and application deadlines not because they don't know about them, but because passive reminders are easy to ignore and don't help them actually act. DueRight is a focused AI agent for **financial and time-bound deadlines** (bills, renewals, applications) that goes beyond reminding — it prepares the next concrete action for the user.

## 2. High-Level Understanding

DueRight is a narrow-scope, agentic deadline assistant. Instead of trying to manage all tasks (calendar, habits, projects), it focuses only on **deadlines with a financial/administrative consequence** — late fees, lapsed coverage, missed renewals, rejected applications.

Core loop:
1. User adds a deadline (manual or natural language).
2. Gemini parses/classifies it (type, urgency, consequence of missing it).
3. Agent surfaces the next action, ranked by urgency.
4. Agent auto-drafts one real action (email/message) the user can review and send.
5. Dashboard shows what's pending, what's urgent, what's been actioned.

**Not in scope (v1):** real bank/payment integration, auto-detecting bills from email/SMS, multi-user/team features, calendar sync. These are explicitly out so the MVP stays shippable in the hackathon window.

## 3. Target User
Students, young professionals, and anyone juggling personal admin (insurance renewals, subscription payments, application deadlines, government form due dates) who currently relies on memory or scattered reminders.

## 4. Core Features (MVP — must build)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Add Deadline | Manual form OR natural language input ("car insurance renews June 30") parsed via Gemini into structured fields: title, type, due date, consequence |
| 2 | AI Classification | Gemini auto-tags urgency (critical/high/medium) and category (bill, renewal, application, other) |
| 3 | Smart Dashboard | List of deadlines sorted by urgency, with countdown and status (pending / action-taken / done) |
| 4 | Agentic Action Draft | One-click: agent drafts a real, ready-to-send message for the deadline context (e.g. payment confirmation request, extension request, renewal inquiry email) — user reviews and copies/sends |
| 5 | Mark Resolved | User marks a deadline as handled; moves to history |
| 6 | Status Tracking | Pending vs Actioned vs Resolved states, visible at a glance |

## 5. Stretch Features (only if time remains)
- Voice input for adding deadlines
- Recurring deadlines (monthly/yearly bills)
- Email draft sent directly via integration (not just copy-paste)
- Basic auth (multi-device sync)

## 6. Tech Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI (Python) |
| DB | SQLite + SQLModel |
| AI | Gemini API (via Google AI Studio) — parsing, classification, draft generation |
| Frontend | Simple React or server-rendered HTML/JS (keep light) |
| Deployment | Backend: Cloud Run (Docker). Frontend: Firebase Hosting or same Cloud Run service |
| Auth (if time) | Simple session/local — no OAuth complexity in v1 |

## 7. Key API Endpoints (high-level)

- `POST /deadlines` — create (accepts free text or structured fields)
- `GET /deadlines` — list, sorted by urgency
- `PATCH /deadlines/{id}/status` — update status
- `POST /deadlines/{id}/draft-action` — generate agentic action draft via Gemini
- `DELETE /deadlines/{id}` — remove

## 8. Success Criteria (mapped to hackathon evaluation matrix)

| Criteria | How DueRight addresses it |
|---|---|
| Problem Solving & Impact (20%) | Directly solves the "missed bill/deadline" pain point named in the problem statement |
| Agentic Depth (20%) | Action drafting = real autonomous output, not just a reminder |
| Innovation & Creativity (20%) | Differentiator: action-oriented agent vs. existing passive reminder apps |
| Google Tech Usage (15%) | Gemini API for parsing, classification, and draft generation |
| Product Experience (10%) | Clean dashboard, urgency-first UX |
| Technical Implementation (10%) | FastAPI + SQLModel, deployed on Cloud Run |
| Completeness & Usability (5%) | Narrow scope = fully working end-to-end flow, not half-built breadth |

## 9. Demo Script (for submission video/walkthrough)
1. Add 2-3 deadlines via natural language (one urgent, one routine).
2. Show dashboard auto-sorted by urgency with AI-classified tags.
3. Click "Generate Action" on the urgent one → show drafted email/message.
4. Mark one resolved → show it move to history.
5. One-line close: "DueRight doesn't just remind you — it gets the next step ready."
