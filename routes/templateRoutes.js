const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const Candidate = require('../models/Candidate');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email transporter ready');
  }
});

router.get('/', async (req, res) => {
  const { organizationId } = req.query;
  if (!organizationId || !mongoose.isValidObjectId(organizationId)) {
    return res.status(400).json({ error: 'Invalid or missing organizationId' });
  }
  try {
    const templates = await Template.find({ organizationId }).populate('createdBy', 'fullname email');
    res.status(200).json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const templates = await Template.find().populate('createdBy', 'fullname email').populate('organizationId', 'company_name');
    res.status(200).json(templates);
  } catch (error) {
    console.error('Error fetching all templates:', error);
    res.status(500).json({ error: 'Failed to fetch all templates', details: error.message });
  }
});

router.post('/', async (req, res) => {
  const { name, database, content, adminId, organizationId } = req.body;

  if (!name || !database || !content || !adminId || !organizationId) {
    return res.status(400).json({ error: 'Missing required fields: name, database, content, adminId, and organizationId are required' });
  }
  if (!mongoose.isValidObjectId(adminId) || !mongoose.isValidObjectId(organizationId)) {
    return res.status(400).json({ error: 'Invalid adminId or organizationId' });
  }

  try {
    const template = new Template({
      name,
      database,
      content,
      createdBy: adminId,
      organizationId,
      lastModified: Date.now(),
    });
    await template.save();
    res.status(201).json({ message: 'Template created successfully', template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template', details: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, database, content } = req.body;
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { name, database, content, lastModified: Date.now() },
      { new: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.status(200).json({ message: 'Template updated', template });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template', details: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.status(200).json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template', details: error.message });
  }
});

router.post('/send', async (req, res) => {
  const { candidateId, templateId, interviewDate, interviewTime, interviewLink } = req.body;

  if (!candidateId || !templateId) {
    return res.status(400).json({ error: 'Missing candidateId or templateId' });
  }

  // Validate interview details if provided
  const hasInterviewDetails = interviewDate || interviewTime || interviewLink;
  if (hasInterviewDetails) {
    if (!interviewDate || !interviewTime || !interviewLink) {
      return res.status(400).json({ error: 'All interview details (date, time, link) must be provided together' });
    }
    if (!Date.parse(interviewDate)) {
      return res.status(400).json({ error: 'Invalid interviewDate format' });
    }
    if (!/^\d{2}:\d{2}$/.test(interviewTime)) {
      return res.status(400).json({ error: 'Invalid interviewTime format (e.g., "14:30")' });
    }
    if (!/^https?:\/\/.+$/.test(interviewLink)) {
      return res.status(400).json({ error: 'Invalid interviewLink format (must be a valid URL)' });
    }
  }

  try {
    // Populate jobId and get the template and admin data
    const candidate = await Candidate.findById(candidateId).populate('jobId');
    const template = await Template.findById(templateId).populate('createdBy', 'fullname email').populate('organizationId', 'company_name');

    if (!candidate || !template) {
      return res.status(404).json({ error: 'Candidate or template not found' });
    }

    if (!candidate.email) {
      return res.status(400).json({ error: 'Candidate email is missing' });
    }

    if (hasInterviewDetails && candidate.status !== 'interview') {
      return res.status(400).json({ error: 'Interview details can only be sent to candidates with "interview" status' });
    }

    // Log the raw template content for debugging
    console.log('Raw template content:', template.content);

    // Map all placeholders to their original fields
    let emailContent = template.content
      // Candidate fields
      .replace(/\{candidate_firstName\}/g, candidate.firstName || 'N/A')
      .replace(/\{candidate_lastName\}/g, candidate.lastName || 'N/A')
      .replace(/\{candidate_email\}/g, candidate.email || 'N/A')
      .replace(/\{candidate_phone\}/g, candidate.phone || 'N/A')
      .replace(/\{candidate_dob\}/g, candidate.dob ? candidate.dob.toLocaleDateString() : 'N/A')
      .replace(/\{candidate_gender\}/g, candidate.gender || 'N/A')
      .replace(/\{candidate_address\}/g, candidate.address || 'N/A')
      .replace(/\{candidate_city\}/g, candidate.city || 'N/A')
      .replace(/\{candidate_zipCode\}/g, candidate.zipCode || 'N/A')
      .replace(/\{candidate_appliedAt\}/g, candidate.appliedAt ? candidate.appliedAt.toLocaleDateString() : 'N/A')
      // Job fields
      .replace(/\{job_position\}/g, candidate.jobId?.position || 'N/A')
      .replace(/\{job_office\}/g, candidate.jobId?.office || 'N/A')
      .replace(/\{job_department\}/g, candidate.jobId?.department || 'N/A')
      .replace(/\{job_jobType\}/g, candidate.jobId?.jobType || 'N/A')
      .replace(/\{job_salaryFrom\}/g, candidate.jobId?.salaryFrom?.toString() || 'N/A')
      .replace(/\{job_salaryTo\}/g, candidate.jobId?.salaryTo?.toString() || 'N/A')
      .replace(/\{job_status\}/g, candidate.jobId?.status || 'N/A')
      // Interview fields
      .replace(/\{interview_date\}/g, interviewDate ? new Date(interviewDate).toLocaleDateString() : candidate.interviewDate?.toLocaleDateString() || 'N/A')
      .replace(/\{interview_time\}/g, interviewTime || candidate.interviewTime || 'N/A')
      .replace(/\{interview_link\}/g, interviewLink || candidate.interviewLink || 'N/A')
      // Admin/Organization fields
      .replace(/\{admin_fullname\}/g, template.createdBy?.fullname || 'N/A')
      .replace(/\{admin_email\}/g, template.createdBy?.email || 'N/A')
      .replace(/\{admin_company_name\}/g, template.organizationId?.company_name || 'N/A');

      emailContent = `
      <div style="font-family: Arial, sans-serif; white-space: pre-wrap;">
        <style>p { margin: 10px 0; }</style>
        ${emailContent}
      </div>
    `;
    
    // Log the processed content for debugging
    console.log('Processed email content:', emailContent);

    const mailOptions = {
      from: `"HR Team" <${process.env.EMAIL}>`,
      to: candidate.email,
      subject: `${template.name}`,
      html: emailContent,
    };

    await transporter.sendMail(mailOptions);

    if (hasInterviewDetails) {
      candidate.interviewDate = new Date(interviewDate);
      candidate.interviewTime = interviewTime;
      candidate.interviewLink = interviewLink;
      await candidate.save();
    }

    res.status(200).json({ message: `Email sent to ${candidate.firstName} ${candidate.lastName}` });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

module.exports = router;