import { useEffect, useMemo, useState } from "react";
import StudentForm from "./StudentForm";
import useStudentStore from "./store/studentStore";

const pipeline = ["Not Placed", "Applied", "Interview", "Selected", "Placed"];
const cx = (...parts) => parts.filter(Boolean).join(" ");
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function initials(name = "") { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function skillList(value = "") { return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean); }
function cvSummary(student) {
  const text = (student.cv_text || "").replace(/\s+/g, " ").trim();
  if (text) return text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 240);
  const skills = skillList(student.skills);
  return skills.length ? `${student.course} student with experience in ${skills.slice(0, 5).join(", ")}.` : `${student.course} graduate, class of ${student.graduation_year}. Add CV text and skills for a richer profile.`;
}
function matches(student, role) {
  const listedSkills = new Set(skillList(student.skills).map((skill) => skill.toLowerCase()));
  const cvText = ` ${(student.cv_text || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ")} `;
  return skillList(role.skills).filter((skill) => {
    const normalized = skill.toLowerCase();
    const cvNeedle = ` ${normalized.replace(/[^a-z0-9+#.]+/g, " ").trim()} `;
    return listedSkills.has(normalized) || (cvNeedle.trim().length > 1 && cvText.includes(cvNeedle));
  });
}
function escapeCsv(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

function StatusBadge({ status }) {
  const palette = {
    "Placed": "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    "Selected": "bg-violet-50 text-violet-700 ring-violet-600/10",
    "Interview": "bg-amber-50 text-amber-800 ring-amber-600/10",
    "Applied": "bg-sky-50 text-sky-700 ring-sky-600/10",
    "Not Placed": "bg-slate-100 text-slate-600 ring-slate-600/10",
  };
  return <span className={cx("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", palette[status] || palette["Not Placed"])}>{status}</span>;
}

function emailStudent(student) {
  const subject = encodeURIComponent("Congratulations on your selection!");
  const body = encodeURIComponent(`Hi ${student.name},\n\nCongratulations! We are delighted to share that you have been selected${student.company_name ? ` by ${student.company_name}` : ""}. Your placement team will share the next steps shortly.\n\nBest,\nPlacement Team`);
  window.location.href = `mailto:${encodeURIComponent(student.email)}?subject=${subject}&body=${body}`;
}

function downloadCsv(students) {
  const headers = ["Name", "Email", "Course", "Graduation year", "Status", "Company", "Skills", "CV summary", "CV text", "Interview date", "Follow-up notes"];
  const rows = students.map((student) => [student.name, student.email, student.course, student.graduation_year, student.placement_status, student.company_name, student.skills, cvSummary(student), student.cv_text, student.interview_date, student.follow_up_notes]);
  const content = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }));
  link.download = "placement-students.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function parseCsv(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = (rows.shift() || []).map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  return rows.filter((values) => values.some((value) => value.trim())).map((values) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""]));
    return {
      name: record.name || "", email: record.email || "", course: record.course || "",
      graduation_year: Number(record["graduation year"] || record.graduation_year),
      placement_status: pipeline.includes(record.status) ? record.status : pipeline.includes(record["placement status"]) ? record["placement status"] : "Not Placed",
      company_name: record.company || record["company name"] || null,
      skills: record.skills || "", cv_text: record["cv text"] || record["cv summary"] || "",
      interview_date: record["interview date"] || null,
      follow_up_notes: record["follow-up notes"] || record.notes || "",
    };
  });
}

function StatCard({ label, value, note, icon, accent = "blue" }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
    <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={cx("flex h-10 w-10 items-center justify-center rounded-xl text-lg", accent === "green" ? "bg-emerald-50 text-emerald-700" : accent === "violet" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700")}>{icon}</span></div>
    <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div>
  </div>;
}

export default function App() {
  const store = useStudentStore();
  const { students, roles, loading, saving, error, success } = store;
  const [editingStudent, setEditingStudent] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [roleForm, setRoleForm] = useState({ company: "", title: "", skills: "", description: "" });
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => { store.fetchStudents(); store.fetchRoles(); }, []);

  const visibleStudents = useMemo(() => students.filter((student) => {
    const haystack = `${student.name} ${student.email} ${student.course} ${student.company_name || ""} ${student.skills || ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (statusFilter === "All statuses" || student.placement_status === statusFilter);
  }), [students, query, statusFilter]);
  const placed = students.filter((student) => student.placement_status === "Placed").length;
  const active = students.filter((student) => ["Applied", "Interview", "Selected"].includes(student.placement_status)).length;

  function openAddForm() { store.clearMessages(); setEditingStudent(null); setFormOpen(true); }
  function openEditForm(student) { store.clearMessages(); setEditingStudent(student); setFormOpen(true); }
  async function handleSubmit(student) {
    const { cv_file: cvFile, ...details } = student;
    const saved = editingStudent
      ? await store.editStudent(editingStudent.id, details)
      : await store.addStudent(details);
    if (!saved) return;
    if (cvFile && !(await store.uploadCv(saved.id, cvFile))) {
      setEditingStudent(saved);
      return;
    }
    setFormOpen(false);
    setEditingStudent(null);
  }
  async function handleDelete(student) {
    if (window.confirm(`Delete ${student.name}'s record? This cannot be undone.`)) await store.removeStudent(student.id);
  }
  async function submitRole(event) {
    event.preventDefault();
    if (await store.addRole(roleForm)) setRoleForm({ company: "", title: "", skills: "", description: "" });
  }
  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 5_000_000) {
      store.clearMessages();
      useStudentStore.setState({ error: "Choose a CSV file smaller than 5 MB." });
      return;
    }
    const records = parseCsv(await file.text());
    const valid = records.filter((record) => record.name && record.email && record.course && Number.isInteger(record.graduation_year));
    if (!valid.length) {
      useStudentStore.setState({ error: "No importable rows found. Include Name, Email, Course, and Graduation year columns." });
      return;
    }
    await store.importStudents(valid);
    if (records.length > valid.length) useStudentStore.setState({ error: `${records.length - valid.length} row(s) skipped because required fields were missing.` });
  }
  async function handleBulkStatus(status) {
    if (!status || !selectedIds.length) return;
    const done = await store.bulkUpdateStatus(selectedIds, status);
    if (done) setSelectedIds([]);
  }

  return <main className="min-h-screen pb-12">
    <div className="border-b border-slate-200 bg-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-xl text-white shadow-sm">✦</div><div><div className="font-bold tracking-tight text-slate-900">Pathway<span className="text-blue-700">.</span></div><div className="text-xs text-slate-500">Placement workspace</div></div></div>
        <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Data synced to local workspace</div>
      </header>
    </div>
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <section className="flex flex-col justify-between gap-5 py-8 sm:flex-row sm:items-end">
        <div><div className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-blue-700">STUDENT SUCCESS, IN ONE PLACE</div><h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Placement manager</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Track your talent pipeline, understand CV fit for open roles, and keep every placement moving.</p></div>
        <div className="flex gap-2"><button onClick={() => downloadCsv(visibleStudents)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">↓ Export CSV</button><button onClick={openAddForm} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">＋ Add student</button></div>
      </section>
      {(error || success) && <div className={cx("mb-5 rounded-xl border px-4 py-3 text-sm", error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")} role="status">{error || success}</div>}
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Main navigation">{["Overview", "Students", "Talent match", "Company roles"].map((item) => <button key={item} onClick={() => setTab(item)} className={cx("whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition", tab === item ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800")}>{item}</button>)}</nav>

      {formOpen && <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7"><div className="mb-5"><h2 className="text-lg font-bold text-slate-900">{editingStudent ? "Edit student" : "Add a student"}</h2><p className="mt-1 text-sm text-slate-500">Add academic details, skills and CV text to power role matching.</p></div><StudentForm student={editingStudent} saving={saving} onSubmit={handleSubmit} onCancel={() => { setFormOpen(false); setEditingStudent(null); }}/></section>}

      {tab === "Overview" && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Students" value={students.length} note="Profiles in your workspace" icon="♙"/>
          <StatCard label="Placed" value={placed} note={students.length ? `${Math.round(placed / students.length * 100)}% placement rate` : "Your placement rate"} icon="✓" accent="green"/>
          <StatCard label="In pipeline" value={active} note="Applied, interviewing or selected" icon="◷" accent="violet"/>
          <StatCard label="Open roles" value={roles.length} note="Company profiles to match against" icon="⌕"/>
        </section>
        <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">Recent students</h2><p className="mt-1 text-xs text-slate-500">The latest profiles added to your workspace</p></div><button onClick={() => setTab("Students")} className="text-sm font-semibold text-blue-700">View all →</button></div><StudentTable students={students.slice(0, 5)} onEdit={openEditForm} onDelete={handleDelete} compact/></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Placement pipeline</h2><p className="mt-1 text-xs text-slate-500">Students by current stage</p></div><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{students.length} total</span></div><div className="mt-5 space-y-4">{pipeline.map((stage) => {const count = students.filter((student) => student.placement_status === stage).length; return <div key={stage}><div className="mb-1.5 flex justify-between text-xs"><span className="font-medium text-slate-600">{stage}</span><span className="font-semibold text-slate-800">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cx("h-full rounded-full", stage === "Placed" ? "bg-emerald-500" : stage === "Selected" ? "bg-violet-500" : stage === "Interview" ? "bg-amber-400" : "bg-blue-500")} style={{width: `${students.length ? count / students.length * 100 : 0}%`}}/></div></div>;})}</div></div>
        </section>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Upcoming interviews</h2><p className="mt-1 text-xs text-slate-500">Your next scheduled student conversations</p></div><button onClick={() => setTab("Students")} className="text-sm font-semibold text-blue-700">Manage schedule →</button></div><UpcomingInterviews students={students}/></section>
        <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-5"><div className="flex gap-3"><span className="text-xl">✧</span><div><h2 className="font-bold text-slate-900">Make every student profile match-ready</h2><p className="mt-1 text-sm leading-6 text-slate-600">Add CV text and skills, then create company roles to see matched skills, missing requirements and a ranked shortlist.</p><button className="mt-3 text-sm font-bold text-blue-800" onClick={() => setTab("Talent match")}>Explore talent match →</button></div></div></section>
      </>}

      {tab === "Students" && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center"><div><h2 className="font-bold text-slate-900">All students</h2><p className="mt-1 text-xs text-slate-500">{visibleStudents.length} of {students.length} profiles</p></div><div className="flex flex-col gap-2 sm:flex-row"><input className={`${inputClass} sm:w-56`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, skills..." aria-label="Search students"/><select className={`${inputClass} sm:w-40`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option>All statuses</option>{pipeline.map((status) => <option key={status}>{status}</option>)}</select><label className="cursor-pointer whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">↑ Import CSV<input type="file" accept=".csv,text/csv" onChange={handleImport} className="hidden"/></label></div></div>{selectedIds.length > 0 && <div className="flex flex-wrap items-center gap-3 border-b border-blue-100 bg-blue-50 px-5 py-3"><span className="text-sm font-semibold text-blue-900">{selectedIds.length} selected</span><select className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm" defaultValue="" onChange={(event) => handleBulkStatus(event.target.value)} aria-label="Set selected students' status"><option value="" disabled>Move to stage…</option>{pipeline.map((status) => <option key={status}>{status}</option>)}</select><button onClick={() => setSelectedIds([])} className="text-sm font-semibold text-slate-600">Clear selection</button></div>}{loading ? <div className="p-12 text-center text-sm text-slate-500">Loading profiles...</div> : <StudentTable students={visibleStudents} onEdit={openEditForm} onDelete={handleDelete} selectedIds={selectedIds} onToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onToggleAll={() => setSelectedIds((current) => visibleStudents.every((student) => current.includes(student.id)) ? current.filter((id) => !visibleStudents.some((student) => student.id === id)) : [...new Set([...current, ...visibleStudents.map((student) => student.id)])] )}/>}</section>}

      {tab === "Talent match" && <TalentMatch students={students} roles={roles} onAddRole={() => setTab("Company roles")}/>}

      {tab === "Company roles" && <div className="grid items-start gap-5 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><h2 className="font-bold text-slate-900">Add a company role</h2><p className="mt-1 text-sm text-slate-500">Define must-have skills to get explainable student matches.</p><form className="mt-5 space-y-3" onSubmit={submitRole}><input className={inputClass} placeholder="Company name" value={roleForm.company} onChange={(event) => setRoleForm({...roleForm, company: event.target.value})} maxLength={100} required/><input className={inputClass} placeholder="Role title" value={roleForm.title} onChange={(event) => setRoleForm({...roleForm, title: event.target.value})} maxLength={100} required/><textarea className={`${inputClass} min-h-24`} placeholder="Required skills, comma separated (e.g. SQL, Python, communication)" value={roleForm.skills} onChange={(event) => setRoleForm({...roleForm, skills: event.target.value})} maxLength={2000} required/><textarea className={`${inputClass} min-h-20`} placeholder="Role notes (optional)" value={roleForm.description} onChange={(event) => setRoleForm({...roleForm, description: event.target.value})} maxLength={2000}/><button disabled={saving} className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving ? "Saving..." : "Add role profile"}</button></form></section><section className="space-y-3"><div><h2 className="font-bold text-slate-900">Company role profiles</h2><p className="mt-1 text-sm text-slate-500">{roles.length} saved roles · used to rank student CV fit</p></div>{roles.length ? roles.map((role) => <div key={role.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-wide text-blue-700">{role.company}</div><h3 className="mt-1 font-bold text-slate-900">{role.title}</h3>{role.description && <p className="mt-1 text-sm text-slate-500">{role.description}</p>}<div className="mt-3 flex flex-wrap gap-1.5">{skillList(role.skills).map((skill) => <SkillChip key={skill}>{skill}</SkillChip>)}</div></div><button onClick={() => store.removeRole(role.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-800">Remove</button></div></div>) : <Empty title="No role profiles yet" text="Add the first company role to start matching your students."/>}</section></div>}
      <footer className="mt-8 text-center text-xs text-slate-400">Pathway Placement Workspace · CV summaries are generated from the text you provide.</footer>
    </div>
  </main>;
}

function SkillChip({ children, tone = "slate" }) { return <span className={cx("rounded-full px-2.5 py-1 text-xs font-medium", tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600")}>{children}</span>; }

function StudentTable({ students, onEdit, onDelete, compact = false, selectedIds = [], onToggle, onToggleAll }) {
  if (!students.length) return <Empty title="No students found" text="Adjust the filters or add a student to get started."/>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{onToggle && <th className="w-10 px-4 py-3"><input type="checkbox" checked={students.every((student) => selectedIds.includes(student.id))} onChange={onToggleAll} aria-label="Select all visible students" className="h-4 w-4 rounded border-slate-300 accent-blue-700"/></th>}<th className="px-5 py-3 font-semibold">Student</th><th className="px-5 py-3 font-semibold">Course</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Company</th>{!compact && <><th className="px-5 py-3 font-semibold">Skills</th><th className="px-5 py-3 font-semibold">Interview</th></>}<th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map((student) => <tr key={student.id} className="hover:bg-slate-50/70">{onToggle && <td className="px-4 py-3.5"><input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => onToggle(student.id)} aria-label={`Select ${student.name}`} className="h-4 w-4 rounded border-slate-300 accent-blue-700"/></td>}<td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-800">{initials(student.name)}</span><div><div className="font-semibold text-slate-800">{student.name}</div><div className="text-xs text-slate-500">{student.email}</div></div></div></td><td className="px-5 py-3.5 text-slate-600">{student.course}<div className="text-xs text-slate-400">Class of {student.graduation_year}</div></td><td className="px-5 py-3.5"><StatusBadge status={student.placement_status}/></td><td className="px-5 py-3.5 text-slate-600">{student.company_name || "—"}</td>{!compact && <><td className="px-5 py-3.5"><div className="flex max-w-56 flex-wrap gap-1">{skillList(student.skills).slice(0, 3).map((skill) => <SkillChip key={skill}>{skill}</SkillChip>)}{!student.skills && <span className="text-xs text-slate-400">Add skills</span>}</div></td><td className="px-5 py-3.5 text-xs text-slate-600">{student.interview_date ? new Date(student.interview_date).toLocaleString() : <span className="text-slate-400">Not scheduled</span>}</td></>}<td className="px-5 py-3.5"><div className="flex justify-end gap-3"><button onClick={() => onEdit(student)} className="font-semibold text-blue-700 hover:text-blue-900">Edit</button>{student.placement_status === "Selected" && <button onClick={() => emailStudent(student)} className="font-semibold text-violet-700 hover:text-violet-900">Email</button>}<button onClick={() => onDelete(student)} className="font-semibold text-rose-600 hover:text-rose-800">Delete</button></div></td></tr>)}</tbody></table></div>;
}

function UpcomingInterviews({ students }) {
  const now = new Date();
  const upcoming = students.filter((student) => student.interview_date && new Date(student.interview_date) >= now)
    .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date)).slice(0, 5);
  if (!upcoming.length) return <div className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No upcoming interviews. Add a date from a student profile to see it here.</div>;
  return <div className="mt-4 divide-y divide-slate-100">{upcoming.map((student) => <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-sm text-violet-700">◷</span><div><div className="text-sm font-semibold text-slate-800">{student.name}</div><div className="text-xs text-slate-500">{student.company_name || student.course} · {student.placement_status}</div></div></div><time className="text-sm font-semibold text-slate-700">{new Date(student.interview_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div>)}</div>;
}

function TalentMatch({ students, roles, onAddRole }) {
  const [selectedRole, setSelectedRole] = useState("");
  const role = roles.find((item) => String(item.id) === selectedRole) || roles[0];
  useEffect(() => { if (!selectedRole && roles.length) setSelectedRole(String(roles[0].id)); }, [roles, selectedRole]);
  const ranked = role ? students.map((student) => {
    const matched = matches(student, role); const required = skillList(role.skills);
    return { student, matched, missing: required.filter((skill) => !matched.some((item) => item.toLowerCase() === skill.toLowerCase())), score: required.length ? Math.round(matched.length / required.length * 100) : 0 };
  }).sort((a, b) => b.score - a.score || a.student.name.localeCompare(b.student.name)) : [];
  return <section><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-bold text-slate-900">Role-specific CV match</h2><p className="mt-1 text-sm text-slate-500">Compare student skills with requirements and review a concise CV summary.</p></div>{roles.length > 0 && <select className={`${inputClass} sm:w-72`} value={role ? String(role.id) : ""} onChange={(event) => setSelectedRole(event.target.value)} aria-label="Choose company role">{roles.map((item) => <option key={item.id} value={item.id}>{item.company} · {item.title}</option>)}</select>}</div>
    {!roles.length ? <Empty title="Create a role to start matching" text="Add a company role and its required skills. Matches are ranked with matched and missing skills shown." action={<button onClick={onAddRole} className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add company role</button>}/> : !students.length ? <Empty title="No student profiles yet" text="Add students and include their skills or CV text to build a shortlist."/> : <><div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><div className="text-xs font-bold uppercase tracking-wide text-blue-800">{role.company} · {role.title}</div><div className="mt-2 flex flex-wrap gap-1.5">{skillList(role.skills).map((skill) => <SkillChip key={skill}>{skill}</SkillChip>)}</div><p className="mt-2 text-xs text-slate-500">Fit score reflects the share of listed role skills found in each profile. Review the CV summary before shortlisting.</p></div><div className="space-y-3">{ranked.map(({student, matched, missing, score}) => <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div className="min-w-0"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-800">{initials(student.name)}</span><div><h3 className="font-bold text-slate-900">{student.name}</h3><div className="text-xs text-slate-500">{student.course} · {student.email}</div></div></div><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{cvSummary(student)}</p></div><div className="flex items-center gap-3 md:flex-col md:items-end"><div className="text-right"><div className={cx("text-2xl font-bold", score >= 70 ? "text-emerald-700" : score >= 35 ? "text-amber-700" : "text-slate-700")}>{score}%</div><div className="text-[11px] uppercase tracking-wide text-slate-400">skills fit</div></div><StatusBadge status={student.placement_status}/></div></div><div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"><div><div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Matched skills · {matched.length}</div><div className="flex flex-wrap gap-1.5">{matched.length ? matched.map((skill) => <SkillChip key={skill} tone="green">✓ {skill}</SkillChip>) : <span className="text-xs text-slate-400">No listed skills matched yet</span>}</div></div><div><div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-700">Skills to verify · {missing.length}</div><div className="flex flex-wrap gap-1.5">{missing.length ? missing.map((skill) => <SkillChip key={skill} tone="amber">{skill}</SkillChip>) : <span className="text-xs text-slate-400">All listed skills found</span>}</div></div></div></article>)}</div></>}
  </section>;
}

function Empty({ title, text, action }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-700">✦</div><h3 className="font-semibold text-slate-800">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>{action}</div>; }
