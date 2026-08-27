const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const azure = require("../services/azureBlobService");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/profiles");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Process and save profile image — Azure Blob when configured, else local /uploads/profiles.
 */
const processProfileImage = async (buffer, oldImage = null) => {
  const filename = `profile_${uuidv4()}.webp`;
  const processed = await sharp(buffer)
    .resize(300, 300, { fit: "cover", position: "center" })
    .webp({ quality: 85 })
    .toBuffer();

  let publicURL;
  if (azure.isAzureEnabled()) {
    publicURL = await azure.uploadBuffer(processed, `profiles/${filename}`, {
      containerKind: "images",
      contentType: "image/webp",
    });
  } else {
    const filepath = path.join(UPLOAD_DIR, filename);
    await sharp(processed).toFile(filepath);
    publicURL = `/uploads/profiles/${filename}`;
  }

  if (oldImage) {
    await deleteOldImage(oldImage);
  }

  return publicURL;
};

const deleteOldImage = async (imagePath) => {
  try {
    if (String(imagePath).includes("blob.core.windows.net")) return;
    const filename = path.basename(imagePath);
    const fullPath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error("Failed to delete old image:", err.message);
  }
};

module.exports = { processProfileImage };
