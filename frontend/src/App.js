import React, { useState, useEffect, useCallback } from "react";
import AppointmentForm from "./components/AppointmentForm";

const API_BASE = "http://127.0.0.1:8000";

const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  start_time: "09:00",
  end_time: "10:00",
};

function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/appointments`;
      const params = new URLSearchParams();
      if (dateFilter) params.append("date", dateFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load appointments");
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      addMessage(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  function addMessage(text, type) {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 6000);
  }

  function closeMessage(id) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleCreate(payload) {
    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not create appointment");
      addMessage(`Appointment "${data.title}" added successfully.`, "success");
      setShowForm(false);
      fetchAppointments();
    } catch (err) {
      addMessage(err.message, "error");
      throw err;
    }
  }

  async function handleUpdate(payload) {
    try {
      const res = await fetch(`${API_BASE}/appointments/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not update appointment");
      addMessage(`Appointment "${data.title}" updated successfully.`, "success");
      setShowForm(false);
      setEditing(null);
      fetchAppointments();
    } catch (err) {
      addMessage(err.message, "error");
      throw err;
    }
  }

  async function handleStatus(appointment, newStatus) {
    const labels = { completed: "completed", cancelled: "cancelled" };
    try {
      const res = await fetch(
        `${API_BASE}/appointments/${appointment.id}/status?status=${newStatus}`,
        { method: "PATCH" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not update status");
      addMessage(`Appointment marked as ${labels[newStatus]}.`, "success");
      fetchAppointments();
    } catch (err) {
      addMessage(err.message, "error");
    }
  }

  function openEdit(appointment) {
    setEditing(appointment);
    setShowForm(true);
  }

  function handleSubmit(payload) {
    if (editing) {
      return handleUpdate({ ...payload, status: editing.status });
    }
    return handleCreate(payload);
  }

  const clearFilters = () => {
    setDateFilter("");
    setStatusFilter("");
  };

  return (
    <div className="container">
      <header>
        <div>
          <h1>📅 Appointment Board</h1>
          <p>View, add, edit, complete, and cancel team appointments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Add Appointment
        </button>
      </header>

      {messages.length > 0 && (
        <div className="messages">
          {messages.map((m) => (
            <div key={m.id} className={`alert ${m.type}`}>
              <span>{m.text}</span>
              <button className="close" onClick={() => closeMessage(m.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="toolbar">
        <div className="field">
          <label htmlFor="dateFilter">Filter by Date</label>
          <input
            id="dateFilter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="statusFilter">Filter by Status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
      </div>

      {loading ? (
        <div className="empty">Loading appointments…</div>
      ) : appointments.length === 0 ? (
        <div className="empty">
          No appointments found.{" "}
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginLeft: 8 }}>
            + Add one
          </button>
        </div>
      ) : (
        <div className="board">
          {appointments.map((a) => (
            <div key={a.id} className={`card ${a.status}`}>
              <div className="card-top">
                <h3>{a.title}</h3>
                <span className={`badge ${a.status}`}>{a.status}</span>
              </div>
              {a.description && <p className="description">{a.description}</p>}
              <div className="time">
                {a.start_time} – {a.end_time}
                <span className="date">{a.date}</span>
              </div>
              <div className="card-actions">
                <button className="btn btn-secondary" onClick={() => openEdit(a)}>Edit</button>
                {a.status !== "completed" && (
                  <button className="btn btn-success" onClick={() => handleStatus(a, "completed")}>
                    Complete
                  </button>
                )}
                {a.status !== "cancelled" && (
                  <button className="btn btn-danger" onClick={() => handleStatus(a, "cancelled")}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AppointmentForm
          initial={editing ? {
            title: editing.title,
            description: editing.description,
            date: editing.date,
            start_time: editing.start_time,
            end_time: editing.end_time,
          } : EMPTY_FORM}
          isEdit={Boolean(editing)}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

export default App;
