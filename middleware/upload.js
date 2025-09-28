const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const petsDir = path.join(uploadDir, 'pets');
const productsDir = path.join(uploadDir, 'products');

[uploadDir, petsDir, productsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = uploadDir;
        
        // Determine upload directory based on file type
        if (file.fieldname === 'petImage') {
            uploadPath = petsDir;
        } else if (file.fieldname === 'productImage') {
            uploadPath = productsDir;
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = file.fieldname + '-' + uniqueSuffix + extension;
        cb(null, filename);
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
        files: 1 // Only one file at a time
    },
    fileFilter: fileFilter
});

// Middleware for single pet image upload
const uploadPetImage = upload.single('petImage');

// Middleware for single product image upload
const uploadProductImage = upload.single('productImage');

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Only one file allowed.'
            });
        }
    }
    
    if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
            success: false,
            message: 'Only image files (jpg, png, gif, webp) are allowed.'
        });
    }
    
    next(error);
};

// Utility function to delete file
const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err && err.code !== 'ENOENT') {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

// Utility function to get file URL
const getFileUrl = (filename, type = 'pets') => {
    if (!filename) return null;
    return `/uploads/${type}/${filename}`;
};

module.exports = {
    uploadPetImage,
    uploadProductImage,
    handleUploadError,
    deleteFile,
    getFileUrl
};
