// utils/multer.js or middleware/uploadMiddleware.js
import multer from 'multer';
import path from 'path';

// Disk storage just to temporarily hold the image for upload
const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    cb(null, `user-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({ storage, fileFilter });

export default upload;
