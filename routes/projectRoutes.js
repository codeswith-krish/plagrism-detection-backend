import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadProject } from '../controllers/projectController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Multer Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensuring `uploads` folder works correctly 
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Appending a random prefix to prevent identical filename crashing
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Explicit File Type filter validating extensions ONLY for ppt/pptx formats
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /pdf|ppt|pptx/;
  // Ensure we are checking extension name dynamically
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

  // Valid MIME types mapped correctly to the MSOffice registry signatures
  const mimetype = allowedFileTypes.test(file.mimetype) ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/vnd.ms-powerpoint' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    // Generate an error to immediately stop execution if user bypasses browser validation
    cb(new Error('Images and other files are not allowed. Only .pdf, .ppt, and .pptx files are supported for plagiarism checking!'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (basic config recommendation)
});

// ALL project uploads mandate standard Student Authentication Middleware Protection
router.use(protect);

// Upload endpoint calling Multer prior to advancing towards Similarity matching
router.post('/upload', function (req, res, next) {
  upload.single('pptFile')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // An unknown error occurred when uploading.
      return res.status(400).json({ message: err.message });
    }
    // Everything went fine.
    next();
  });
}, uploadProject);

export default router;
