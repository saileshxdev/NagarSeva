const cloudinary = require('../config/cloudinary'); // BUG FIX: Re-use the shared, pre-configured instance
                                                     // instead of creating a second unconfigured instance.
                                                     // The original code called cloudinary.config() here
                                                     // but .env may not be loaded yet at this point in the
                                                     // module graph — the shared config/cloudinary.js calls
                                                     // require('dotenv').config() itself, making it safe.

/**
 * GET /api/upload/signature
 * Generates a secure, time-limited signature for direct-to-Cloudinary
 * frontend uploads. The client uses this to upload directly without
 * routing large files through the Node server.
 */
const getUploadSignature = async (req, res) => {
  try {
    // 1. Generate a Unix timestamp (in seconds)
    // Cloudinary uses this to ensure the signature expires after 1 hour
    const timestamp = Math.round(new Date().getTime() / 1000);

    // 2. Define the target folder in Cloudinary
    // This adds security: the frontend can ONLY upload to this specific folder
    const folder = process.env.CLOUDINARY_FOLDER_NAME || 'nagarseva_issues';

    // 3. Generate the signature using the hidden API Secret
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: folder,
      },
      process.env.CLOUDINARY_API_SECRET
    );


    // console.log(signature)
    // 4. Send the required details back to the frontend

    console.log("Signature sent successfully")
    res.status(200).json({
      signature,
      timestamp,
      folder,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) {
    console.error('[getUploadSignature]', err);
    res.status(500).json({ 
      error: 'SERVER_ERROR', 
      message: 'Failed to generate upload signature.' 
    });
  }
};

module.exports = { getUploadSignature };