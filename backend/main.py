from datetime import datetime, date
import os
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import sqlite3

app = FastAPI(title="Appointment Board API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Store the DB at the project root so it is stable regardless of the
# current working directory and is tracked by git for pre-seeded clones.
DB_PATH = os.path.join(BASE_DIR, "..", "appointments.db")
DATABASE_URL = None  # kept as a placeholder for swapping to PostgreSQL/MySQL


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled'
        )
        """
    )
    conn.commit()
    conn.close()


# ---------------- Models ----------------

class AppointmentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=1000)
    date: str
    start_time: str
    end_time: str

    @validator("date")
    def validate_date(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format")
        return v

    @validator("start_time", "end_time")
    def validate_time(cls, v):
        try:
            datetime.strptime(v, "%H:%M")
        except ValueError:
            raise ValueError("Time must be in HH:MM (24-hour) format")
        return v


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None


class Appointment(AppointmentBase):
    id: int
    status: str


# ---------------- Helpers ----------------

def row_to_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "date": row["date"],
        "start_time": row["start_time"],
        "end_time": row["end_time"],
        "status": row["status"],
    }


def check_time_slot_conflict(
    conn,
    date_val: str,
    start_time: str,
    end_time: str,
    exclude_id: Optional[int] = None,
):
    """Return True if there is a conflicting appointment (excluding exclude_id)."""
    rows = conn.execute(
        "SELECT * FROM appointments WHERE date = ? AND status != 'cancelled'",
        (date_val,),
    ).fetchall()
    for row in rows:
        if exclude_id is not None and row["id"] == exclude_id:
            continue
        # Conflict if time ranges overlap
        if start_time < row["end_time"] and end_time > row["start_time"]:
            return True
    return False


# ---------------- Routes ----------------

@app.on_event("startup")
def startup():
    init_db()
    seed_sample_data()


def seed_sample_data():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM appointments").fetchone()[0]
    if count > 0:
        conn.close()
        return

    today = date.today().isoformat()
    samples = [
        ("Design review", "Weekly design sync for the landing page", today, "09:00", "10:00", "scheduled"),
        ("Sprint planning", "Plan next sprint backlog and goals", today, "11:00", "12:30", "scheduled"),
        ("Client call", "Intro call with new onboarding client", today, "14:00", "14:45", "completed"),
        ("Code review", "Review PR for auth module", today, "16:00", "17:00", "cancelled"),
        ("Standup", "Daily team standup", today, "17:30", "18:00", "scheduled"),
    ]
    conn.executemany(
        "INSERT INTO appointments (title, description, date, start_time, end_time, status) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        samples,
    )
    conn.commit()
    conn.close()


@app.get("/appointments", response_model=List[Appointment])
def list_appointments(date: Optional[str] = None, status: Optional[str] = None):
    conn = get_db()
    query = "SELECT * FROM appointments WHERE 1=1"
    params = []
    if date:
        query += " AND date = ?"
        params.append(date)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY date ASC, start_time ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.post("/appointments", response_model=Appointment, status_code=201)
def create_appointment(payload: AppointmentCreate):
    conn = get_db()

    if payload.end_time <= payload.start_time:
        conn.close()
        raise HTTPException(status_code=400, detail="End time must be after start time.")

    if check_time_slot_conflict(conn, payload.date, payload.start_time, payload.end_time):
        conn.close()
        raise HTTPException(status_code=409, detail="Time slot is already booked. Please choose another time.")

    cur = conn.execute(
        "INSERT INTO appointments (title, description, date, start_time, end_time, status) "
        "VALUES (?, ?, ?, ?, ?, 'scheduled')",
        (payload.title, payload.description, payload.date, payload.start_time, payload.end_time),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM appointments WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return row_to_dict(row)


@app.get("/appointments/{appointment_id}", response_model=Appointment)
def get_appointment(appointment_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return row_to_dict(row)


@app.put("/appointments/{appointment_id}", response_model=Appointment)
def update_appointment(appointment_id: int, payload: AppointmentUpdate):
    conn = get_db()
    row = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found.")

    current = row_to_dict(row)
    new_date = payload.date if payload.date is not None else current["date"]
    new_start = payload.start_time if payload.start_time is not None else current["start_time"]
    new_end = payload.end_time if payload.end_time is not None else current["end_time"]
    new_title = payload.title if payload.title is not None else current["title"]

    try:
        datetime.strptime(new_start, "%H:%M")
        datetime.strptime(new_end, "%H:%M")
    except ValueError:
        conn.close()
        raise HTTPException(status_code=400, detail="Time must be in HH:MM (24-hour) format.")

    if new_end <= new_start:
        conn.close()
        raise HTTPException(status_code=400, detail="End time must be after start time.")

    if check_time_slot_conflict(conn, new_date, new_start, new_end, exclude_id=appointment_id):
        conn.close()
        raise HTTPException(status_code=409, detail="Time slot is already booked. Please choose another time.")

    new_status = payload.status if payload.status is not None else current["status"]
    new_description = payload.description if payload.description is not None else current["description"]

    conn.execute(
        "UPDATE appointments SET title = ?, description = ?, date = ?, start_time = ?, end_time = ?, status = ? "
        "WHERE id = ?",
        (new_title, new_description, new_date, new_start, new_end, new_status, appointment_id),
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    conn.close()
    return row_to_dict(updated)


@app.patch("/appointments/{appointment_id}/status", response_model=Appointment)
def change_status(appointment_id: int, status: str):
    if status not in ("scheduled", "completed", "cancelled"):
        raise HTTPException(status_code=400, detail="Invalid status. Use scheduled, completed, or cancelled.")
    return update_appointment(appointment_id, AppointmentUpdate(status=status))


@app.delete("/appointments/{appointment_id}", status_code=204)
def delete_appointment(appointment_id: int):
    conn = get_db()
    cur = conn.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found.")
    conn.commit()
    conn.close()
    return None
