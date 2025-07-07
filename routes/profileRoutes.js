const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use promises version of fs for async/await

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb('Error: Images only (jpeg, jpg, png)!');
  }
});

// Create a new profile
router.post('/create', upload.single('logo'), async (req, res) => {
  try {
    const {
      organizationId,
      name,
      phone_no,
      website,
      departments,
      locations,
      facebook_url,
      linkedin_url,
      insta_url,
      yt_url
    } = req.body;

    // Validate required fields
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization ID is required' });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: 'Organization name is required' });
    }
    if (!phone_no) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!departments || JSON.parse(departments).length === 0) {
      return res.status(400).json({ success: false, message: 'At least one department is required' });
    }
    if (!locations || JSON.parse(locations).length === 0) {
      return res.status(400).json({ success: false, message: 'At least one location is required' });
    }

    const profileData = {
      organizationId,
      name,
      phone_no,
      website: website || null,
      logo: req.file ? req.file.path : null,
      departments: JSON.parse(departments),
      locations: JSON.parse(locations),
      facebook_url: facebook_url || null,
      linkedin_url: linkedin_url || null,
      insta_url: insta_url || null,
      yt_url: yt_url || null
    };

    const profile = new Profile(profileData);
    await profile.save();

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: profile
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating profile',
      error: error.message
    });
  }
});

// Get profile by organizationId
router.get('/by-org/:organizationId', async (req, res) => {
  try {
    const profile = await Profile.findOne({ organizationId: req.params.organizationId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
});

// Update profile by organizationId
router.put('/update/:organizationId', upload.single('logo'), async (req, res) => {
  try {
    const {
      name,
      phone_no,
      website,
      departments,
      locations,
      facebook_url,
      linkedin_url,
      insta_url,
      yt_url
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, message: 'Organization name is required' });
    }
    if (!phone_no) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!departments || JSON.parse(departments).length === 0) {
      return res.status(400).json({ success: false, message: 'At least one department is required' });
    }
    if (!locations || JSON.parse(locations).length === 0) {
      return res.status(400).json({ success: false, message: 'At least one location is required' });
    }

    // Fetch the existing profile to get the old logo path
    const existingProfile = await Profile.findOne({ organizationId: req.params.organizationId });
    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const updateData = {
      name,
      phone_no,
      website: website || null,
      departments: JSON.parse(departments),
      locations: JSON.parse(locations),
      facebook_url: facebook_url || null,
      linkedin_url: linkedin_url || null,
      insta_url: insta_url || null,
      yt_url: yt_url || null
    };

    // If a new logo is uploaded, delete the old one and update the path
    if (req.file) {
      if (existingProfile.logo) {
        try {
          await fs.unlink(existingProfile.logo); // Delete the old logo file
          console.log(`Deleted old logo: ${existingProfile.logo}`);
        } catch (err) {
          console.error(`Error deleting old logo: ${err.message}`);
          // Optionally, you could return an error here, but we'll proceed with the update
        }
      }
      updateData.logo = req.file.path; // Set the new logo path
    } else {
      updateData.logo = existingProfile.logo; // Retain the old logo if no new one is uploaded
    }

    const profile = await Profile.findOneAndUpdate(
      { organizationId: req.params.organizationId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

module.exports = router;