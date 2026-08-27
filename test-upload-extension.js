
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
    extensions: /jpeg|jpg|png|webp|gif|svg/,
    maxSize: 10 * 1024 * 1024,
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
    maxSize: 500 * 1024 * 1024,
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
    maxSize: 50 * 1024 * 1024,
    label: "Audio",
  },
  pdf: {
    mimes: ["application/pdf"],
    extensions: /pdf/,
    maxSize: 20 * 1024 * 1024,
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
    maxSize: 20 * 1024 * 1024,
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
    maxSize: 100 * 1024 * 1024,
    label: "Archives",
  },
};

const getAllowedExtensionsFixed = (...types) => {
  if (types.length === 0) {
    return Object.values(FILE_TYPES).flatMap((t) => [t.extensions.source]);
  }
  return types.flatMap((t) => (FILE_TYPES[t]?.extensions.source ? [FILE_TYPES[t].extensions.source] : []));
};

console.log("Fixed getAllowedExtensions:", getAllowedExtensionsFixed());
console.log("\nTesting zip extension with fixed code:");
const extPatternFixed = new RegExp(getAllowedExtensionsFixed().join("|"));
console.log("zip matches?", extPatternFixed.test("zip"));
console.log("png matches?", extPatternFixed.test("png"));
console.log("mp4 matches?", extPatternFixed.test("mp4"));
