const express = require('express');
const mongoose = require('mongoose');
const Job = require('../models/Job'); // Import the Job model

const router = express.Router();

// Route to handle job creation (POST request)
router.post('/create-job', async (req, res) => {
  try {
    const { position, office, department, jobType, seats, salaryFrom, salaryTo, description, organizationId } = req.body;

    // Check if required fields are present
    if (!position || !office || !department || !jobType || !seats || !salaryFrom || !salaryTo || !description || !organizationId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create a new job with organizationId
    const newJob = new Job({
      position,
      office,
      department,
      jobType,
      seats,
      salaryFrom,
      salaryTo,
      description,
      organizationId, // Store organizationId in the job document
    });

    // Save the job in the database
    await newJob.save();

    // Send a success response
    res.status(201).json({ message: 'Job created successfully', job: newJob });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/', async (req, res) => {
  const { organizationId } = req.query;

  try {
    let jobs;
    if (organizationId) {
      // Organization side: Fetch jobs for a specific organization
      jobs = await Job.find({ organizationId })
        .sort({ createdAt: -1 });
      if (jobs.length === 0) {
        return res.status(404).json({ message: 'No jobs found for this organization' });
      }
    } else {
      // User side: Fetch all jobs
      jobs = await Job.find()
        .sort({ createdAt: -1 });
      if (jobs.length === 0) {
        return res.status(404).json({ message: 'No jobs found' });
      }
    }

    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// Route to get a job by ID (GET request)
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(200).json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong fetching job' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const {
      position,
      office,
      department,
      jobType,
      seats,
      salaryFrom,
      salaryTo,
      description,
      status
    } = req.body;

    // Check if job exists
    const existingJob = await Job.findById(jobId);
    if (!existingJob) {
      return res.status(404).json({ 
        success: false,
        message: 'Job not found' 
      });
    }

    // Prepare updated job data
    const updatedJobData = {
      position: position || existingJob.position,
      office: office || existingJob.office,
      department: department || existingJob.department,
      jobType: jobType || existingJob.jobType,
      seats: seats || existingJob.seats,
      salaryFrom: salaryFrom || existingJob.salaryFrom,
      salaryTo: salaryTo || existingJob.salaryTo,
      description: description || existingJob.description,
      status: status || existingJob.status,
      updatedAt: Date.now() // Optional: track when the job was last updated
    };

    // Update the job in the database
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      updatedJobData,
      { new: true, runValidators: true } // new: true returns the updated document
    );

    if (!updatedJob) {
      return res.status(400).json({ 
        success: false,
        message: 'Failed to update job' 
      });
    }

    // Send success response with updated job data
    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob
    });

  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating job',
      error: error.message 
    });
  }
});

module.exports = router;