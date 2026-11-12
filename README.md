# Student Placement Management System

A React, Express, and SQLite placement workspace for managing student records, placement stages, CV profiles, and company role requirements. The SQL statements are written by hand in [`backend/db.js`](./backend/db.js); no ORM or query builder is used.

## Features

- Student profiles with course, graduation year, placement stage, skills, and pasted CV text.
- Upload and download student CV files in PDF, DOC, or DOCX format (up to 10 MB). Replacing a CV removes the previous uploaded file.
- Placement pipeline stages: Not Placed, Applied, Interview, Selected, and Placed.
- Search and status filters, placement overview metrics, and CSV export.
- Interview scheduling, an upcoming-interviews list, and per-student follow-up notes.
- Bulk placement-stage updates and CSV import (duplicate email addresses are skipped by the API).
- Company role profiles with required skills stored in SQLite.
- Ranked role matching with matched skills, skills to verify, and a concise summary extracted from the supplied CV text. Matching is an exact case-insensitive skill comparison; it is a shortlist aid, not an automated hiring decision.
- A selection email action for students marked Selected. It opens a prefilled `mailto:` draft in the user's mail app; a person reviews and sends it. No email provider or automatic email delivery is configured.

Existing SQLite files are upgraded additively when the API starts. Student records now include `skills` and `cv_text`, and role requirements are stored in a `roles` table. CV text is stored in the same local SQLite database as student records.

Uploaded CV files are stored under `backend/uploads/cvs` locally (ignored by Git). Set `CV_UPLOAD_DIR` to choose another durable folder. On Vercel, files use `/tmp/placement-cvs` and are ephemeral, like the SQLite database; use durable object storage before relying on uploads in production.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the Vite frontend and Express API:

   ```bash
   npm run dev
   ```

3. Open the local URL printed by Vite (usually <http://localhost:5173>).

The API listens on <http://localhost:3001>. Vite forwards `/api` requests to it. When the API starts, `sql.js` creates `backend/students.sqlite` and sets up the `students` table if it does not already exist. Look for the file inside the `backend` folder (the spelling is `students.sqlite`). The local SQLite file is ignored by Git.

To run only the API, use `npm run dev:server`. To build the frontend, use `npm run build`.

Run `npm run seed:demo` to add sixteen clearly labeled fictional student profiles and three company role examples. The command is safe to rerun and skips demo emails and roles that are already present. The sample CV summaries and full CV text are included in `outputs/placement-demo-20261103/student-cv-placement-demo.xlsx` on the `CV Summaries`, `CV Details`, and `Role Matches` sheets.

## Database and API

The database setup and readable `CREATE`, `SELECT`, `INSERT`, `UPDATE`, and `DELETE` statements are in `backend/db.js`. All values supplied by users are bound as SQL parameters.

The Express API in `backend/app.js` provides:

- `GET /api/students` — list student records
- `POST /api/students` — create a record
- `PUT /api/students/:id` — update a record
- `DELETE /api/students/:id` — delete a record
- `DELETE /api/students` — clear all records and keep the table

Student records have a name, email, course, graduation year, placement status, optional company name, skills, and CV text. Role records have a company, title, required skills, and optional description.

## Deploy to Vercel

Import this project into Vercel and use the default project settings. The root `vercel.json` builds the Vite site into `dist`; the catch-all serverless function in `api/[...path].js` sends `/api/*` requests to the Express routes.

**SQLite storage on Vercel is temporary.** The function writes its `sql.js` database to `/tmp`, which is writable but ephemeral. Serverless instances can be restarted or scaled independently, so records may disappear and separate requests may not see the same database. Do not use this SQLite setup for persistent production data. A hosted deployment that needs reliable persistence should use a managed database service with durable storage; this learning project intentionally does not add that extra setup.
