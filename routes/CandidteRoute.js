const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Candidate = require('../models/Candidate');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profilePic') {
      cb(null, 'uploads/candidate_images/');
    } else if (file.fieldname === 'resume') {
      cb(null, 'uploads/candidate_pdfs/');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'profilePic' && !file.mimetype.startsWith('image/')) {
    return cb(new Error('Profile picture must be an image'));
  }
  if (file.fieldname === 'resume' && file.mimetype !== 'application/pdf') {
    return cb(new Error('Resume must be a PDF'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
}).fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]);

// POST /apply - Candidate application submission
router.post('/apply', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    try {
      console.log('Request body:', req.body);
      console.log('Uploaded files:', req.files);

      const existing = await Candidate.findOne({ jobId: req.body.jobId, userId: req.body.userId });
      if (existing) {
        if (req.files.profilePic) fs.unlinkSync(req.files.profilePic[0].path);
        if (req.files.resume) fs.unlinkSync(req.files.resume[0].path);
        return res.status(400).json({ error: 'Already applied to this job' });
      }

      const candidateData = {
        ...req.body,
        jobId: req.body.jobId,
        userId: req.body.userId,
        education: JSON.parse(req.body.education),
        experience: JSON.parse(req.body.experience),
        profilePic: req.files && req.files.profilePic ? req.files.profilePic[0].path : undefined,
        resume: req.files && req.files.resume ? req.files.resume[0].path : undefined,
        status: 'applied' // Default status
      };

      const candidate = new Candidate(candidateData);
      await candidate.save();
      res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
      console.error('Candidate creation error:', error);
      if (req.files && req.files.profilePic) fs.unlinkSync(req.files.profilePic[0].path);
      if (req.files && req.files.resume) fs.unlinkSync(req.files.resume[0].path);
      res.status(500).json({ error: 'Failed to submit application', details: error.message });
    }
  });
});

// GET /user/:userId - Fetch candidates by user
router.get('/user/:userId', async (req, res) => {
  try {
    const candidates = await Candidate.find({ userId: req.params.userId }).populate('jobId');
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch applied jobs' });
  }
});

// GET /job/:jobId - Fetch candidates by job
router.get('/job/:jobId', async (req, res) => {
  try {
    const candidates = await Candidate.find({ jobId: req.params.jobId })
      .populate('userId')
      .populate('jobId');
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET / - Fetch all candidates
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find().populate('jobId');
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates', details: error.message });
  }
});

// PUT /withdraw/:candidateId - Withdraw application
router.put('/withdraw/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (candidate.userId.toString() !== req.body.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (candidate.status === 'withdraw') {
      return res.status(400).json({ error: 'Application already withdrawn' });
    }

    candidate.status = 'withdraw';
    await candidate.save();
    res.status(200).json({ message: 'Application withdrawn successfully', candidate });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});
router.put('/:candidateId/status', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    candidate.status = req.body.status;
    await candidate.save();
    res.status(200).json({ message: 'Status updated successfully', candidate });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status', details: error.message });
  }
});
// PUT /:candidateId - Update candidate status and interview details (New Endpoint)
router.put('/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Update status and optional interview details
    candidate.status = req.body.status || candidate.status;
    if (req.body.interviewDate) candidate.interviewDate = req.body.interviewDate;
    if (req.body.interviewTime) candidate.interviewTime = req.body.interviewTime;
    if (req.body.interviewLink) candidate.interviewLink = req.body.interviewLink;

    await candidate.save();
    res.status(200).json({ message: 'Candidate updated successfully', candidate });
  } catch (error) {
    console.error('Candidate update error:', error);
    res.status(500).json({ error: 'Failed to update candidate', details: error.message });
  }
});

// DELETE /:candidateId - Delete candidate
router.delete('/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    if (candidate.profilePic) fs.unlinkSync(candidate.profilePic);
    if (candidate.resume) fs.unlinkSync(candidate.resume);
    await Candidate.deleteOne({ _id: req.params.candidateId });
    res.status(200).json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete candidate', details: error.message });
  }
});

// Update the existing /job/:jobId route to populate more fields if needed
router.get('/job/:jobId', async (req, res) => {
  try {
    const candidates = await Candidate.find({ jobId: req.params.jobId }).populate('userId');
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET /:candidateId - Fetch single candidate
router.get('/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId)
      .populate('jobId')
      .populate('userId');
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(200).json(candidate);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch candidate', details: error.message });
  }
});

module.exports = router;