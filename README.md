# DueRight 🎯

**The next step, ready before it's due.**  
*A focused, agentic productivity companion built for the **Vibe2Ship Hackathon (The Last-Minute Life Saver track)**.*

DueRight goes beyond traditional passive reminders (which are easily ignored and require manual effort to act upon). Instead, it focuses on high-stakes **financial and administrative deadlines** (bills, renewals, applications) and **automatically prepares the next actionable step** for the user.

---

## 🌟 Key Features

### 1. Agentic Action Drafts & Direct Sharing
* **Context-Aware Drafting**: Uses Gemini to auto-draft a concise, polite message tailored to the deadline context (e.g. extension requests, payment confirmation, or renewal inquiries).
* **Direct Share Hooks**: One-click actions to copy the draft, launch a pre-filled **Email** (`mailto:` with custom subject/body), or share directly via **WhatsApp**.

### 2. Intelligent Urgency & Quick Stats Widget
* **Conversational AI Banner**: A friendly conversational banner greets the user and highlights critical pending tasks needing immediate action.
* **Statistics Counters**: Grid cards showing counts for *Pending*, *Critical*, *Actioned*, and *Resolved* tasks at a glance.
* **Urgency-Capsule UI**: Soft color-coded countdown capsules (Critical, High, Medium, Low) that sit cleanly at the top-left of each card.

### 3. Dual Input Methods (AI Parsing vs. Detailed Manual Form)
* **✨ Quick Add (AI)**: Type simple phrases like *"car insurance renews in 3 days, consequence is $100 penalty"* — parsed reliably into structured entities using Gemini.
* **📝 Detailed Add (Manual)**: Toggle to a structured form to specify title, category (Bill, Renewal, Application, Other), due date, consequence, and recurrence.

### 4. Smart Recurring Deadlines
* **Automatic Clone Loop**: Support for **Monthly** or **Yearly** recurrence. When you mark a recurring deadline as resolved, the system calculates the next due date and automatically schedules a new pending clone in the database.

### 5. Calendar Integration (`.ics` Exporter)
* **Single-Click Sync**: Click the calendar icon `📅` on any card to instantly generate and download a standard `.ics` file. This lets you import the deadline along with its details and consequences straight into Google Calendar, Outlook, or Apple Calendar.

---

## 🛠️ Technology Stack

| Layer | Technology | Key Usage |
|---|---|---|
| **AI Engine** | **Gemini 2.5 Flash** | Processing inputs, drafting context-aware templates, and structured output parsing. |
| **Backend API** | **FastAPI (Python 3.11+)** | High-performance asynchronous endpoint routing. |
| **Database** | **SQLite + SQLModel** | Relational data persistence with declarative models. |
| **Frontend** | **React (Vite, Javascript)** | Fast SPA with premium typography and interactive transitions. |
| **Aesthetics** | **Vanilla CSS** | Modern responsive grid layouts, custom variables, card hovers, and soft shadow transitions. |

---

## 🚀 Quick Start & Installation

### Prerequisites
- Python 3.11 or higher
- Node.js (v18+)
- A **Gemini API Key** (get one free at [Google AI Studio](https://aistudio.google.com/))

---

### 1. Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file from the template and paste your API key:
   ```bash
   cp .env.example .env
   ```
   Modify `.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   DATABASE_URL=sqlite:///./duedright.db
   ```
5. Run the backend API server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The backend will be running at `http://localhost:8000`.*

---

### 2. Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file pointing to the backend API:
   ```bash
   cp .env.example .env
   ```
   Verify `.env` content:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Run the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend application will be running at `http://localhost:5173` (or the next available port).*

---

## 📂 Project Structure

```
DueRight/
├── backend/
│   ├── routers/
│   │   └── deadlines.py       # API endpoints & cloning logic
│   ├── database.py            # SQLite database initialization
│   ├── gemini_service.py      # Structured parsing & drafting prompts
│   ├── models.py              # SQLModel database schemas
│   ├── schemas.py             # Pydantic validation schemas
│   ├── main.py                # FastAPI app & CORS middleware config
│   └── requirements.txt       # Python backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddDeadline.jsx  # AI Tab / Detailed input forms
│   │   │   ├── DeadlineCard.jsx # Sharing links & .ics download logic
│   │   │   └── DeadlineList.jsx # Pending & resolved sections
│   │   ├── App.jsx            # Calculation of stats & greeting banners
│   │   ├── api.js             # API request service definitions
│   │   ├── index.css          # Design system, styling & hover effects
│   │   └── main.jsx           # React app entry point
│   ├── index.html
│   └── package.json
```

---

## 🎯 Submission Guidelines Check

This project has been developed fully aligned with the **Vibe2Ship Build Phase Guidelines**:
* **Select Track**: The Last-Minute Life Saver.
* **Agentic Depth**: Auto-drafting messages, direct mailto/whatsapp hooks, and database cloning for recurring entries.
* **Completeness**: Tested and verified end-to-end flow with structured LLM parsing.
* **Google Tech**: Integration with the new `google-genai` SDK and Structured Outputs API.
