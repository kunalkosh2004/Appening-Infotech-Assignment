# Appointment Board — Full Stack Developer Intern

A simple appointment board for a small team. View, add, update, complete, and cancel
appointments, with filtering by date and status, and automatic prevention of overlapping
time slots.

## Tech Stack
- **Frontend:** React 18 (Create React App), plain CSS
- **Backend:** Python, FastAPI, Pydantic
- **Database:** SQLite (schema kept adapter-friendly so it can be swapped to PostgreSQL/MySQL)

## Folder Structure
```
├── backend
│   ├── main.py            # FastAPI app (API + validation + DB logic)
│   └── requirements.txt
└── frontend
    ├── public/index.html
    ├── src
    │   ├── App.js         # Main board UI
    │   ├── index.css
    │   ├── index.js
    │   └── components/AppointmentForm.js
    └── package.json
```

## How to Run

### 1. Backend (Python / FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
- API docs (Swagger): http://localhost:8000/docs
- 5 sample appointments are auto-seeded on first run.

### 2. Frontend (React)
```bash
cd frontend
npm install
npm start
```
- Open http://localhost:3000

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/appointments?date=&status=` | List appointments (optional filters) |
| POST | `/appointments` | Create appointment (validated) |
| GET | `/appointments/{id}` | Get one appointment |
| PUT | `/appointments/{id}` | Update appointment |
| PATCH | `/appointments/{id}/status?status=...` | Set status to `scheduled`/`completed`/`cancelled` |
| DELETE | `/appointments/{id}` | Delete appointment |

## How It Works
1. The user opens the board; the app fetches and shows the appointments from the API.
2. Filters by date and/or status narrow the list.
3. **Add Appointment** opens a modal with title, description, date, start time, end time.
4. Validation happens on **both** the client and the server:
   - required fields present,
   - end time after start time,
   - no overlapping appointment on the same date (cancelled slots are ignored).
5. On success/failure, a clear success or error toast is shown.
6. The user can **Edit**, **Complete**, or **Cancel** any appointment from its card.
7. Cancelled appointments stay visible and are clearly marked with a "cancelled" badge and a red-tinted card.

## Assumptions & Notes
- Time slots overlap if their intervals intersect. Two appointments touching at the same
  boundary (e.g. one ends `10:00` and the next starts `10:00`) are **allowed**.
- A cancelled appointment **does not** block a time slot; only scheduled/completed
  appointments count towards conflicts.
- Completed and cancelled appointments can no longer be marked completed/cancelled again,
  but can still be edited or cancelled (cancellation only blocked once already cancelled
  in the UI, though the API allows resetting status via edit).
- Data is stored in a local `appointments.db` file. To use PostgreSQL/MySQL, replace the
  `sqlite3` connection block in `main.py` with your driver of choice (e.g. `psycopg2` /
  `mysql-connector-python`) — the schema and queries are standard SQL.
- Dates are `YYYY-MM-DD`; times are 24-hour `HH:MM`.
