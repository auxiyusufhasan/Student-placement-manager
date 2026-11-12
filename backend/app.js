const express = require("express");
const fs = require("node:fs");
const {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  clearStudents,
  bulkUpdateStatus,
  getRoles,
  createRole,
  deleteRole,
  getStudentCv,
  getAllStudentCvs,
  saveStudentCv,
} = require("./db");
const { saveCv, filePath, removeCv } = require("./cvStorage");

const app = express();
app.use(express.json());

function validateStudent(body) {
  const student = {
    name: typeof body.name === "string" ? body.name.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    course: typeof body.course === "string" ? body.course.trim() : "",
    graduation_year: Number(body.graduation_year),
    placement_status: body.placement_status,
    company_name:
      typeof body.company_name === "string" ? body.company_name.trim() : "",
    skills: typeof body.skills === "string" ? body.skills.trim() : "",
    cv_text: typeof body.cv_text === "string" ? body.cv_text.trim() : "",
    interview_date: typeof body.interview_date === "string" && body.interview_date.trim() ? body.interview_date.trim() : null,
    follow_up_notes: typeof body.follow_up_notes === "string" ? body.follow_up_notes.trim() : "",
  };

  if (!student.name || !student.email || !student.course) {
    return { error: "Name, email, and course are required." };
  }
  if (!Number.isInteger(student.graduation_year)) {
    return { error: "Graduation year must be a whole number." };
  }
  if (!["Not Placed", "Applied", "Interview", "Selected", "Placed"].includes(student.placement_status)) {
    return { error: "Choose a valid placement pipeline status." };
  }
  if (student.skills.length > 4000 || student.cv_text.length > 20000 || student.follow_up_notes.length > 5000) {
    return { error: "Skills, CV text, or notes are too long." };
  }
  if (student.interview_date && Number.isNaN(Date.parse(student.interview_date))) {
    return { error: "Interview date must be a valid date and time." };
  }
  if (!student.company_name) {
    student.company_name = null;
  }

  return { student };
}

function validateRole(body) {
  const role = {
    company: typeof body.company === "string" ? body.company.trim() : "",
    title: typeof body.title === "string" ? body.title.trim() : "",
    skills: typeof body.skills === "string" ? body.skills.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() : "",
  };
  if (!role.company || !role.title || !role.skills) {
    return { error: "Company, role title, and required skills are required." };
  }
  if (role.company.length > 100 || role.title.length > 100 || role.skills.length > 2000 || role.description.length > 2000) {
    return { error: "Role fields exceed the allowed length." };
  }
  return { role };
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET returns every student so the client can render the records table.
app.get("/api/students", async (req, res, next) => {
  try {
    res.json(await getStudents());
  } catch (error) {
    next(error);
  }
});

app.post("/api/students/:id/cv", express.raw({ type: "*/*", limit: "10mb" }), async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Student id must be a positive integer." });
  const previousCv = await getStudentCv(id);
  if (!previousCv) return res.status(404).json({ error: "Student not found." });
  try {
    const cv = await saveCv(req.query.filename, req.body);
    if (!(await saveStudentCv(id, cv))) {
      await removeCv(cv.storageKey);
      return res.status(404).json({ error: "Student not found." });
    }
    if (previousCv.cv_storage_key) await removeCv(previousCv.cv_storage_key);
    res.json({ cv_file_name: cv.fileName });
  } catch (error) { next(error); }
});

app.get("/api/students/:id/cv", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Student id must be a positive integer." });
  try {
    const cv = await getStudentCv(id);
    const target = cv && filePath(cv.cv_storage_key);
    if (!cv?.cv_storage_key || !target || !fs.existsSync(target)) {
      return res.status(404).json({ error: "No saved CV file for this student." });
    }
    res.type(cv.cv_mime || "application/octet-stream");
    res.download(target, cv.cv_file_name);
  } catch (error) { next(error); }
});

app.get("/api/roles", async (req, res, next) => {
  try { res.json(await getRoles()); } catch (error) { next(error); }
});

app.patch("/api/students/bulk-status", async (req, res, next) => {
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(Number))] : [];
  const status = req.body?.placement_status;
  if (!ids.length || ids.length > 500 || ids.some((id) => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ error: "Select between 1 and 500 valid student records." });
  }
  if (!["Not Placed", "Applied", "Interview", "Selected", "Placed"].includes(status)) {
    return res.status(400).json({ error: "Choose a valid placement pipeline status." });
  }
  try { res.json(await bulkUpdateStatus(ids, status)); } catch (error) { next(error); }
});

app.post("/api/roles", async (req, res, next) => {
  const result = validateRole(req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  try { res.status(201).json(await createRole(result.role)); } catch (error) { next(error); }
});

app.delete("/api/roles/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Role id must be a positive integer." });
  try {
    if (!(await deleteRole(id))) return res.status(404).json({ error: "Role not found." });
    res.json({ message: "Role deleted." });
  } catch (error) { next(error); }
});

// POST validates and creates one student, returning the newly saved record.
app.post("/api/students", async (req, res, next) => {
  const result = validateStudent(req.body || {});
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  try {
    res.status(201).json(await createStudent(result.student));
  } catch (error) {
    next(error);
  }
});

// PUT replaces the editable fields for an existing student.
app.put("/api/students/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Student id must be a positive integer." });
  }
  const result = validateStudent(req.body || {});
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  try {
    const student = await updateStudent(id, result.student);
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }
    res.json(student);
  } catch (error) {
    next(error);
  }
});

// DELETE all student records while keeping the database table.
app.delete("/api/students", async (req, res, next) => {
  try {
    const cvs = await getAllStudentCvs();
    await clearStudents();
    await Promise.all(cvs.map((cv) => removeCv(cv.cv_storage_key)));
    res.json({ message: "All student records cleared." });
  } catch (error) {
    next(error);
  }
});

// DELETE removes a student selected by primary key.
app.delete("/api/students/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Student id must be a positive integer." });
  }

  try {
    const cv = await getStudentCv(id);
    const deleted = await deleteStudent(id);
    if (!deleted) {
      return res.status(404).json({ error: "Student not found." });
    }
    if (cv?.cv_storage_key) await removeCv(cv.cv_storage_key);
    res.json({ message: "Student deleted." });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "CV files must be 10 MB or smaller." });
  }
  if (error.message && error.message.includes("UNIQUE constraint failed")) {
    return res.status(409).json({ error: "That email address is already in use." });
  }
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  console.error("API request failed:", error);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

module.exports = app;
