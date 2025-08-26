const pdfParse = require("pdf-parse");
const { Document } = require("docx");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");

/**
 * Sanitize file name (remove spaces/special chars)
 */
function sanitizeName(filename) {
  return filename.replace(/[^a-z0-9.\-_]/gi, "_").toLowerCase();
}

/**
 * Extract text from uploaded resume (PDF or DOCX)
 */
async function extractTextFromFile(file) {
  if (!file) return "";

  const ext = path.extname(file.originalname).toLowerCase();

  try {
    if (ext === ".pdf") {
      const data = await pdfParse(file.buffer);
      return data.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    } else if (ext === ".txt") {
      return file.buffer.toString("utf8");
    } else {
      return ""; // unsupported format
    }
  } catch (err) {
    console.error("Error extracting resume text:", err.message);
    return "";
  }
}

module.exports = {
  sanitizeName,
  extractTextFromFile,
};
