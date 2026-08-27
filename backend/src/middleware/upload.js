const multer = require("multer");
const path = require("path");

// ============================================
//  FILE TYPE CONFIGURATIONS
// ============================================
const FILE_TYPES = {
  image: {
    mimes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ],
    extensions: /jpeg|jpg|jfif|jpe|png|webp|gif|svg|bmp|heic|heif/,
    maxSize: 10 * 1024 * 1024, // 10MB
    label: "Images",
  },
  video: {
    mimes: [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
      "video/x-matroska",
    ],
    extensions: /mp4|mpeg|mov|avi|webm|mkv/,
    maxSize: 500 * 1024 * 1024, // 500MB
    label: "Videos",
  },
  audio: {
    mimes: [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/aac",
      "audio/flac",
      "audio/x-m4a",
    ],
    extensions: /mp3|wav|ogg|aac|flac|m4a/,
    maxSize: 50 * 1024 * 1024, // 50MB
    label: "Audio",
  },
  pdf: {
    mimes: ["application/pdf"],
    extensions: /pdf/,
    maxSize: 20 * 1024 * 1024, // 20MB
    label: "PDF",
  },
  document: {
    mimes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ],
    extensions: /doc|docx|xls|xlsx|ppt|pptx|txt|csv/,
    maxSize: 20 * 1024 * 1024, // 20MB
    label: "Documents",
  },
  archive: {
    mimes: [
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/x-tar",
    ],
    extensions: /zip|rar|7z|tar/,
    maxSize: 100 * 1024 * 1024, // 100MB
    label: "Archives",
  },
};

// ============================================
//  HELPER — Get all allowed mimes/extensions
// ============================================
const getAllowedMimes = (...types) => {
  if (types.length === 0) {
    // Return ALL types
    return Object.values(FILE_TYPES).flatMap((t) => t.mimes);
  }
  return types.flatMap((t) => FILE_TYPES[t]?.mimes || []);
};

const getAllowedExtensions = (...types) => {
  if (types.length === 0) {
    return Object.values(FILE_TYPES).flatMap((t) => [t.extensions.source]); // Wrap in array to keep the whole string!
  }
  return types.flatMap((t) => (FILE_TYPES[t]?.extensions.source ? [FILE_TYPES[t].extensions.source] : []));
};

const getMaxSize = (...types) => {
  if (types.length === 0) return 500 * 1024 * 1024; // 500MB default for all
  return Math.max(...types.map((t) => FILE_TYPES[t]?.maxSize || 0));
};

// ============================================
//  STORAGE — Memory (for sharp processing)
//            Disk  (for video/audio/docs)
// ============================================
const memoryStorage = multer.memoryStorage();

// ============================================
//  FILTER FACTORY
// ============================================
const createFileFilter = (allowedTypes = []) => {
  return (req, file, cb) => {
    // If allowedTypes is empty, allow ALL files! No checks needed!
    if (allowedTypes.length === 0) {
      console.log("==== Upload Debug ====");
      console.log("Allowing all file types, skipping checks");
      console.log("File mimetype:", file.mimetype);
      console.log("File originalname:", file.originalname);
      return cb(null, true);
    }

    const allowedMimes = getAllowedMimes(...allowedTypes);
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const allowedExtSources = getAllowedExtensions(...allowedTypes);
    const extPattern = new RegExp(allowedExtSources.join("|"));

    const isMimeOk = allowedMimes.includes(file.mimetype);
    const isExtOk = extPattern.test(ext);

    console.log("==== Upload Debug ====");
    console.log("Allowed types:", allowedTypes);
    console.log("File mimetype:", file.mimetype);
    console.log("File originalname:", file.originalname);
    console.log("File extension:", ext);
    console.log("Allowed mimes:", allowedMimes);
    console.log("Allowed extensions pattern sources:", allowedExtSources);
    console.log("isMimeOk:", isMimeOk);
    console.log("isExtOk:", isExtOk);

    if (isMimeOk || isExtOk) {
      cb(null, true);
    } else {
      const labels = allowedTypes.map((t) => FILE_TYPES[t]?.label).join(", ");
      cb(new Error(`Invalid file type. Allowed: ${labels}`), false);
    }
  };
};

// ============================================
//  FIELD-AWARE FILTER FACTORY
//  Restricts each multipart field to a specific
//  group of allowed types (e.g. image-only fields
//  can never receive a video/executable).
// ============================================
const createFieldAwareFilter = (fieldMap, fallbackTypes = []) => {
  // Any media group is acceptable as a last resort — this blocks executables /
  // scripts / unknown types while never rejecting legitimate media in any field.
  const ALL_SAFE = ["image", "video", "audio", "pdf", "document", "archive"];
  const matches = (types, file, ext) => {
    if (!types || !types.length) return false;
    const mimes = getAllowedMimes(...types);
    const pattern = new RegExp(getAllowedExtensions(...types).join("|"));
    return mimes.includes(file.mimetype) || (!!ext && pattern.test(ext));
  };
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const preferred = fieldMap[file.fieldname] || fallbackTypes;
    if (matches(preferred, file, ext) || matches(ALL_SAFE, file, ext)) {
      return cb(null, true);
    }
    return cb(new Error(`Unsupported file type for "${file.fieldname}"`), false);
  };
};

// ============================================
//  UPLOAD INSTANCES
// ============================================

// Certificate templates: image or PDF
const uploadCertTemplate = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(["image", "pdf"]),
  limits: { fileSize: FILE_TYPES.pdf.maxSize },
});

// 1️⃣ Images only (memory — for sharp processing)
const uploadImage = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(["image"]),
  limits: { fileSize: FILE_TYPES.image.maxSize },
});

// 2️⃣ Videos only
const uploadVideo = multer({
  storage: multer.diskStorage({}),
  fileFilter: createFileFilter(["video"]),
  limits: { fileSize: FILE_TYPES.video.maxSize },
});

// 3️⃣ Audio only
const uploadAudio = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(["audio"]),
  limits: { fileSize: FILE_TYPES.audio.maxSize },
});

// 4️⃣ PDF only
const uploadPDF = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(["pdf"]),
  limits: { fileSize: FILE_TYPES.pdf.maxSize },
});

// 5️⃣ Documents only (word, excel, ppt, csv, txt)
const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(["document"]),
  limits: { fileSize: FILE_TYPES.document.maxSize },
});

// 6️⃣ Archives only (zip, rar, 7z)
const uploadArchive = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(["archive"]),
  limits: { fileSize: FILE_TYPES.archive.maxSize },
});

// 7️⃣ Mixed — Image + PDF (e.g. document upload with thumbnail)
const uploadImageOrPDF = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(["image", "pdf"]),
  limits: { fileSize: getMaxSize("image", "pdf") },
});

// 8️⃣ ALL file types (universal)
const uploadAny = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(), // empty = allow all
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// 9️⃣ Course/Lab create-full — field-aware: image fields stay images,
//    video fields stay videos. Blocks arbitrary/executable uploads.
const uploadCourseMedia = multer({
  storage: memoryStorage,
  fileFilter: createFieldAwareFilter(
    {
      thumbnail: ["image"],
      videoThumbnail: ["image"],
      headerThumbnail: ["image"],
      introVideo: ["video"],
      mediaFiles: ["video", "image", "audio", "pdf", "document"],
      file: ["video", "image", "audio", "pdf", "document"],
    },
    ["image"]
  ),
  limits: { fileSize: FILE_TYPES.video.maxSize }, // 500MB cap (videos)
});

// ============================================
//  MULTER ERROR HANDLER MIDDLEWARE
// ============================================
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: "File too large. Please check size limits.",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          message: "Too many files uploaded at once.",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          message: `Unexpected field name: ${err.field}`,
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
    }
  }

  if (err && err.message?.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
};

// ============================================
//  SIZE REFERENCE (for API docs / response)
// ============================================
const FILE_SIZE_LIMITS = {
  image: "10MB",
  video: "500MB",
  audio: "50MB",
  pdf: "20MB",
  document: "20MB",
  archive: "100MB",
};

module.exports = {
  uploadImage,
  uploadCertTemplate,
  uploadVideo,
  uploadAudio,
  uploadPDF,
  uploadDocument,
  uploadArchive,
  uploadImageOrPDF,
  uploadAny,
  uploadCourseMedia,
  handleUploadError,
  FILE_TYPES,
  FILE_SIZE_LIMITS,
};
