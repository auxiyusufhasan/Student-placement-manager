const fs = require("node:fs");
const path = require("node:path");
const initSqlJs = require("sql.js");

const file = process.env.VERCEL
  ? "/tmp/students.sqlite"
  : path.join(__dirname, "students.sqlite");

let databasePromise;
const publicStudentColumns = `id, name, email, course, graduation_year, placement_status,
  company_name, skills, cv_text, interview_date, follow_up_notes, cv_file_name`;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: (name) => require.resolve(`sql.js/dist/${name}`),
      });
      const db = fs.existsSync(file)
        ? new SQL.Database(fs.readFileSync(file))
        : new SQL.Database();

      // A simple table: each student has an automatically numbered id.
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          course TEXT NOT NULL,
          graduation_year INTEGER NOT NULL,
          placement_status TEXT NOT NULL,
          company_name TEXT,
          skills TEXT NOT NULL DEFAULT '',
          cv_text TEXT NOT NULL DEFAULT ''
        )
      `);
      // Additive migrations keep existing local databases usable.
      const columns = getRows(db, "PRAGMA table_info(students)").map((column) => column.name);
      if (!columns.includes("skills")) db.run("ALTER TABLE students ADD COLUMN skills TEXT NOT NULL DEFAULT ''");
      if (!columns.includes("cv_text")) db.run("ALTER TABLE students ADD COLUMN cv_text TEXT NOT NULL DEFAULT ''");
      if (!columns.includes("interview_date")) db.run("ALTER TABLE students ADD COLUMN interview_date TEXT");
      if (!columns.includes("follow_up_notes")) db.run("ALTER TABLE students ADD COLUMN follow_up_notes TEXT NOT NULL DEFAULT ''");
      if (!columns.includes("cv_file_name")) db.run("ALTER TABLE students ADD COLUMN cv_file_name TEXT");
      if (!columns.includes("cv_storage_key")) db.run("ALTER TABLE students ADD COLUMN cv_storage_key TEXT");
      if (!columns.includes("cv_mime")) db.run("ALTER TABLE students ADD COLUMN cv_mime TEXT");
      db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT NOT NULL,
        title TEXT NOT NULL,
        skills TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT ''
      )`);
      saveDatabase(db);
      return db;
    })();
  }

  return await databasePromise;
}

function saveDatabase(db) {
  fs.writeFileSync(file, Buffer.from(db.export()));
}

function getRows(db, sql, values = []) {
  const result = db.exec(sql, values)[0];
  if (!result) return [];

  return result.values.map((row) => {
    const student = {};
    result.columns.forEach((column, index) => {
      student[column] = row[index];
    });
    return student;
  });
}

// SELECT all students for the table.
async function getStudents() {
  const db = await getDatabase();
  return getRows(db, `SELECT ${publicStudentColumns} FROM students ORDER BY id DESC`);
}

async function getStudentCv(id) {
  const db = await getDatabase();
  return getRows(db, "SELECT cv_file_name, cv_storage_key, cv_mime FROM students WHERE id = ?", [id])[0] || null;
}

async function getAllStudentCvs() {
  const db = await getDatabase();
  return getRows(db, "SELECT cv_storage_key FROM students WHERE cv_storage_key IS NOT NULL");
}

async function saveStudentCv(id, cv) {
  const db = await getDatabase();
  db.run("UPDATE students SET cv_file_name = ?, cv_storage_key = ?, cv_mime = ? WHERE id = ?",
    [cv.fileName, cv.storageKey, cv.mime, id]);
  if (!db.getRowsModified()) return false;
  saveDatabase(db);
  return true;
}

// INSERT a student using ? placeholders for its values.
async function createStudent(student) {
  const db = await getDatabase();
  db.run(
    `INSERT INTO students
      (name, email, course, graduation_year, placement_status, company_name, skills, cv_text, interview_date, follow_up_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.name,
      student.email,
      student.course,
      student.graduation_year,
      student.placement_status,
      student.company_name,
      student.skills,
      student.cv_text,
      student.interview_date,
      student.follow_up_notes,
    ],
  );
  const id = getRows(db, "SELECT last_insert_rowid() AS id")[0].id;
  saveDatabase(db);
  return getRows(db, `SELECT ${publicStudentColumns} FROM students WHERE id = ?`, [id])[0];
}

// UPDATE one student; return null if the id does not exist.
async function updateStudent(id, student) {
  const db = await getDatabase();
  db.run(
    `UPDATE students
     SET name = ?, email = ?, course = ?, graduation_year = ?,
         placement_status = ?, company_name = ?, skills = ?, cv_text = ?, interview_date = ?, follow_up_notes = ?
     WHERE id = ?`,
    [
      student.name,
      student.email,
      student.course,
      student.graduation_year,
      student.placement_status,
      student.company_name,
      student.skills,
      student.cv_text,
      student.interview_date,
      student.follow_up_notes,
      id,
    ],
  );
  if (!db.getRowsModified()) return null;
  saveDatabase(db);
  return getRows(db, `SELECT ${publicStudentColumns} FROM students WHERE id = ?`, [id])[0];
}

// DELETE one student and report whether it existed.
async function deleteStudent(id) {
  const db = await getDatabase();
  db.run("DELETE FROM students WHERE id = ?", [id]);
  const deleted = db.getRowsModified() > 0;
  if (deleted) saveDatabase(db);
  return deleted;
}

// Remove all student records without deleting the table.
async function clearStudents() {
  const db = await getDatabase();
  db.run("DELETE FROM students");
  saveDatabase(db);
}

async function bulkUpdateStatus(ids, status) {
  const db = await getDatabase();
  const placeholders = ids.map(() => "?").join(", ");
  db.run(`UPDATE students SET placement_status = ? WHERE id IN (${placeholders})`, [status, ...ids]);
  const updated = db.getRowsModified();
  if (updated) saveDatabase(db);
  return { updated, students: getRows(db, `SELECT * FROM students WHERE id IN (${placeholders}) ORDER BY id DESC`, ids) };
}

async function getRoles() {
  const db = await getDatabase();
  return getRows(db, "SELECT * FROM roles ORDER BY company COLLATE NOCASE, title COLLATE NOCASE");
}

async function createRole(role) {
  const db = await getDatabase();
  db.run("INSERT INTO roles (company, title, skills, description) VALUES (?, ?, ?, ?)",
    [role.company, role.title, role.skills, role.description]);
  const id = getRows(db, "SELECT last_insert_rowid() AS id")[0].id;
  saveDatabase(db);
  return getRows(db, "SELECT * FROM roles WHERE id = ?", [id])[0];
}

async function deleteRole(id) {
  const db = await getDatabase();
  db.run("DELETE FROM roles WHERE id = ?", [id]);
  const deleted = db.getRowsModified() > 0;
  if (deleted) saveDatabase(db);
  return deleted;
}

module.exports = {
  initializeDatabase: getDatabase,
  getStudents,
  getStudentCv,
  getAllStudentCvs,
  saveStudentCv,
  getRoles,
  createRole,
  deleteRole,
  createStudent,
  updateStudent,
  deleteStudent,
  clearStudents,
  bulkUpdateStatus,
};
