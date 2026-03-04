const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const audioStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        resource_type: 'video',
        folder: 'vibeorbit/songs',
        allowed_formats: ['mp3', 'wav', 'ogg', 'm4a'],
    },
});

const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        resource_type: 'image',
        folder: 'vibeorbit/covers',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    },
});

const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        resource_type: 'image',
        folder: 'vibeorbit/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    },
});

exports.uploadAudio = multer({ storage: audioStorage });
exports.uploadImage = multer({ storage: imageStorage });
exports.uploadAvatar = multer({ storage: avatarStorage });
exports.cloudinary = cloudinary;