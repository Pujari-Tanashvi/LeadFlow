import multer from "multer";

const allowedContentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const receiveDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2 },
  fileFilter: (_request, file, callback) => {
    if (!allowedContentTypes.has(file.mimetype)) {
      callback(
        new Error("Only PDF, JPEG, PNG, and WebP documents are accepted."),
      );
      return;
    }
    callback(null, true);
  },
}).single("file");
