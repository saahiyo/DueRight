# DueRight Backend

FastAPI + SQLModel + Gemini-powered deadline agent.

## Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Edit `.env` and set your real `GEMINI_API_KEY`
(get one free at https://aistudio.google.com/app/apikey).

## Run locally

```bash
uvicorn main:app --reload --port 8000
```

Docs at: http://localhost:8000/docs

## Quick test (curl)

```bash
# Free-text create — Gemini parses it
curl -X POST http://localhost:8000/deadlines ^
  -H "Content-Type: application/json" ^
  -d "{\"text\": \"car insurance renews June 30\"}"

# List, sorted by urgency
curl http://localhost:8000/deadlines

# Generate the agentic action draft (use the id from above)
curl -X POST http://localhost:8000/deadlines/1/draft-action
```

## Deploy to Cloud Run

```bash
gcloud run deploy duright-backend ^
  --source . ^
  --region us-central1 ^
  --allow-unauthenticated ^
  --set-env-vars GEMINI_API_KEY=your_key,GEMINI_MODEL=gemini-2.5-flash
```

Note: SQLite on Cloud Run is ephemeral (resets on redeploy/restart) — fine
for a hackathon demo. For persistence, swap `DATABASE_URL` to a Cloud SQL
Postgres instance.

## Project structure

```
backend/
  main.py              # FastAPI app, CORS, startup
  database.py           # SQLModel engine/session
  models.py              # Deadline table model
  schemas.py              # Pydantic request/response models
  gemini_service.py        # All Gemini calls: parse, classify, draft
  routers/deadlines.py      # CRUD + agentic action endpoint
  requirements.txt
  Dockerfile
  .env / .env.example
```
