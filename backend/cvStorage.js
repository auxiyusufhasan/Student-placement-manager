const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const uploadDirectory = process.env.CV_UPLOAD_DIR || (process.env.VERCEL
  ? "/tmp/placement-cvs"
  : path.join(__dirname, "uploads", "cvs"));

const allowedTypes = {
  ".pdf": { mime: "application/pdf", signature: (buffer) => buffer.subarray(0, 5).toString() === "%PDF-" },
  ".doc": { mime: "application/msword", signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from("D0CF11E0A1B11AE1", "hex")) },
  ".docx": { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", signature: (buffer) => buffer.subarray(0, 4).toString("hex") === "504b0304" },
};

function safeOriginalName(name) {
  const base = path.basename(String(name || "").replaceAll("\\", "/"));
  return base.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180);
}

async function saveCv(originalName, buffer) {
  const fileName = safeOriginalName(originalName);
  const extension = path.extname(fileName).toLowerCase();
  const type = allowedTypes[extension];
  if (!type) throw Object.assign(new Error("Upload a PDF, DOC, or DOCX file."), { status: 400 });
  if (!buffer?.length || buffer.length > 10 * 1024 * 1024) {
    throw Object.assign(new Error("CV files must be between 1 byte and 10 MB."), { status: 400 });
  }
  if (!type.signature(buffer)) throw Object.assign(new Error("The file contents do not match its extension."), { status: 400 });
  const storageKey = `${crypto.randomUUID()}${extension}`;
  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadDirectory, storageKey), buffer, { flag: "wx" });
  return { fileName, storageKey, mime: type.mime };
}

function filePath(storageKey) {
  if (!/^[a-f0-9-]{36}\.(pdf|doc|docx)$/i.test(storageKey || "")) return null;
  return path.join(uploadDirectory, storageKey);
}

async function removeCv(storageKey) {
  const target = filePath(storageKey);
  if (target) await fs.rm(target, { force: true });
}

module.exports = { saveCv, filePath, removeCv };
