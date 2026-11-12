import { useEffect, useState } from "react";

const emptyForm = {
  name: "",
  email: "",
  course: "",
  graduation_year: "",
  placement_status: "Not Placed",
  company_name: "",
  skills: "",
  cv_text: "",
  interview_date: "",
  follow_up_notes: "",
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function Field({ label, name, children }) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={name}>
      {label}
      {children}
    </label>
  );
}

export default function StudentForm({ student, saving, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [cvFile, setCvFile] = useState(null);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    setCvFile(null);
    setFileError("");
    setForm(
      student
        ? {
            name: student.name,
            email: student.email,
            course: student.course,
            graduation_year: String(student.graduation_year),
            placement_status: student.placement_status,
            company_name: student.company_name || "",
            skills: student.skills || "",
            cv_text: student.cv_text || "",
            interview_date: student.interview_date || "",
            follow_up_notes: student.follow_up_notes || "",
          }
        : emptyForm,
    );
  }, [student]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      graduation_year: Number(form.graduation_year),
      company_name: form.company_name.trim() || null,
      interview_date: form.interview_date || null,
      cv_file: cvFile,
    });
  }

  function selectCv(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setFileError("");
    if (!file) return;
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setFileError("Choose a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("CV files must be 10 MB or smaller.");
      return;
    }
    setCvFile(file);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Student name" name="name">
          <input
            className={inputClass}
            id="name"
            name="name"
            value={form.name}
            onChange={updateField}
            placeholder="e.g. Aisha Khan"
            maxLength={100}
            required
          />
        </Field>
        <Field label="Email address" name="email">
          <input
            className={inputClass}
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            placeholder="aisha@example.com"
            maxLength={254}
            required
          />
        </Field>
        <Field label="Course" name="course">
          <input
            className={inputClass}
            id="course"
            name="course"
            value={form.course}
            onChange={updateField}
            placeholder="e.g. Computer Science"
            maxLength={100}
            required
          />
        </Field>
        <Field label="Graduation year" name="graduation_year">
          <input
            className={inputClass}
            id="graduation_year"
            name="graduation_year"
            type="number"
            min="1900"
            max="2200"
            step="1"
            value={form.graduation_year}
            onChange={updateField}
            placeholder="e.g. 2026"
            required
          />
        </Field>
        <Field label="Placement status" name="placement_status">
          <select
            className={inputClass}
            id="placement_status"
            name="placement_status"
            value={form.placement_status}
            onChange={updateField}
          >
            <option>Not Placed</option>
            <option>Applied</option>
            <option>Interview</option>
            <option>Selected</option>
            <option>Placed</option>
          </select>
        </Field>
        <Field label="Company name (optional)" name="company_name">
          <input
            className={inputClass}
            id="company_name"
            name="company_name"
            value={form.company_name}
            onChange={updateField}
            placeholder="e.g. Acme Inc."
            maxLength={100}
          />
        </Field>
        <Field label="Skills (comma separated)" name="skills">
          <input className={inputClass} id="skills" name="skills" value={form.skills} onChange={updateField}
            placeholder="e.g. Python, SQL, React, data analysis" maxLength={4000} />
        </Field>
      </div>

      <Field label="CV / resume text" name="cv_text">
        <textarea className={`${inputClass} min-h-32 resize-y`} id="cv_text" name="cv_text" value={form.cv_text}
          onChange={updateField} placeholder="Paste resume text to create a searchable summary and match it against company roles."
          maxLength={20000} />
      </Field>

      <div>
        <div className="text-sm font-medium text-slate-700">CV file</div>
        <div className="mt-1.5 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg text-blue-700 shadow-sm">↥</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800">{cvFile?.name || student?.cv_file_name || "Add a student CV"}</div>
              <div className="text-xs text-slate-500">PDF, DOC, or DOCX · up to 10 MB</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {student?.cv_file_name && !cvFile && <a className="text-sm font-semibold text-blue-700 hover:text-blue-900" href={`/api/students/${student.id}/cv`}>Download</a>}
            {cvFile && <button type="button" onClick={() => setCvFile(null)} className="text-sm font-semibold text-slate-500">Remove</button>}
            <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {cvFile || student?.cv_file_name ? "Replace file" : "Choose file"}
              <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={selectCv} className="sr-only" />
            </label>
          </div>
        </div>
        {fileError && <p className="mt-1.5 text-xs font-medium text-rose-700" role="alert">{fileError}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Interview date and time (optional)" name="interview_date">
          <input className={inputClass} id="interview_date" name="interview_date" type="datetime-local"
            value={form.interview_date} onChange={updateField} />
        </Field>
        <Field label="Follow-up notes" name="follow_up_notes">
          <textarea className={`${inputClass} min-h-24 resize-y`} id="follow_up_notes" name="follow_up_notes"
            value={form.follow_up_notes} onChange={updateField} maxLength={5000}
            placeholder="Interview feedback, next steps, or recruiter follow-up" />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving..." : student ? "Save changes" : "Add student"}
        </button>
      </div>
    </form>
  );
}
