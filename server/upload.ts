import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for supported document types
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    '.pdf', '.docx', '.doc', '.txt', '.md', 
    '.png', '.jpg', '.jpeg', '.gif', '.bmp',
    '.xlsx', '.xls', '.csv'
  ];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${fileExtension}. Supported types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer with limits and file filter
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// Single file upload middleware
export const uploadSingle = upload.single('document');

// Multiple files upload middleware
export const uploadMultiple = upload.array('documents', 5);