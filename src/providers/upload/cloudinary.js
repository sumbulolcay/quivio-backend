const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');

function ensureConfigured() {
  if (
    !config.cloudinary ||
    !config.cloudinary.enabled ||
    !config.cloudinary.cloudName ||
    !config.cloudinary.apiKey ||
    !config.cloudinary.apiSecret
  ) {
    const err = new Error('Cloudinary is not configured');
    err.code = 'cloudinary_not_configured';
    err.status = 500;
    throw err;
  }
}

function initClient() {
  ensureConfigured();
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  return cloudinary;
}

async function uploadBusinessLogo(base64Image, businessId) {
  const client = initClient();
  const folder = config.cloudinary.folder || 'business-logos';
  const uploadResult = await client.uploader.upload(base64Image, {
    folder,
    public_id: uuidv4(),
    overwrite: true,
    resource_type: 'image',
  });
  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
  };
}

module.exports = {
  uploadBusinessLogo,
};

