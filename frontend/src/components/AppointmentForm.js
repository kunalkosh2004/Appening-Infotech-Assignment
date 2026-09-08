import React, { useState } from "react";

export default function AppointmentForm({ initial, isEdit = false, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.date) errs.date = "Date is required.";
    if (!form.start_time) errs.start_time = "Start time is required.";
    if (!form.end_time) errs.end_time = "End time is required.";
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      errs.end_time = "End time must be after start time.";
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
    };
    try {
      onSubmit(payload).catch(() => setSubmitting(false));
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Edit Appointment" : "Add Appointment"}</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Client kickoff meeting"
              />
              {errors.title && <small style={{ color: "var(--error-text)" }}>{errors.title}</small>}
            </div>

            <div className="field full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="Optional notes about the appointment"
              />
            </div>

            <div className="field full">
              <label htmlFor="date">Date *</label>
              <input id="date" name="date" type="date" value={form.date} onChange={handleChange} />
              {errors.date && <small style={{ color: "var(--error-text)" }}>{errors.date}</small>}
            </div>

            <div className="field">
              <label htmlFor="start_time">Start Time *</label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleChange}
              />
              {errors.start_time && <small style={{ color: "var(--error-text)" }}>{errors.start_time}</small>}
            </div>

            <div className="field">
              <label htmlFor="end_time">End Time *</label>
              <input
                id="end_time"
                name="end_time"
                type="time"
                value={form.end_time}
                onChange={handleChange}
              />
              {errors.end_time && <small style={{ color: "var(--error-text)" }}>{errors.end_time}</small>}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {isEdit ? "Save Changes" : "Add Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
