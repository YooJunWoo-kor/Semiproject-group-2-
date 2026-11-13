const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const imageTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

const createImageUpload = (folderName) => {
    const uploadPath = path.join(__dirname, "../uploads", folderName);

    fs.mkdirSync(uploadPath, { recursive: true });

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, randomUUID() + imageTypes[file.mimetype]);
        }
    });

    return multer({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!imageTypes[file.mimetype]) {
                return cb(new Error("JPG, PNG, WEBP 파일만 가능합니다."));
            }
            cb(null, true);
        }
    });
};

module.exports = createImageUpload;