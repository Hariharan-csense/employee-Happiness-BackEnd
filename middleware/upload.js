// src/middleware/upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base upload directory
const BASE_UPLOAD_DIR = 'public/uploads/';

// Ensure base directory exists
if (!fs.existsSync(BASE_UPLOAD_DIR)) {
  fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
}

// Dynamic storage factory function
const createStorage = (subfolder) => {
  const uploadPath = path.join(BASE_UPLOAD_DIR, subfolder);

  // Create subfolder if not exists
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `file-${req.user?.id || 'unknown'}-${uniqueSuffix}${path.extname(file.originalname)}`;
      cb(null, filename);
    }
  });
};

// Image filter
const imageFileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed! (jpeg, jpg, png, gif, webp, svg)'));
};

const profilePictureUpload = multer({
  storage: createStorage('profiles'), 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});


// Export as named exports for flexibility
module.exports = {
  profilePictureUpload,
  createStorage, // if you want to reuse for other folders (e.g., documents, surveys)
};