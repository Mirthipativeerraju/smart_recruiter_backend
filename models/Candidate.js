// models/Candidate.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const candidateSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String },
  address: { type: String },
  city: { type: String },
  zipCode: { type: String },
  education: [{
    institute: String,
    level: String,
    majors: String,
    sessionFrom: String,
    sessionTo: String,
  }],
  experience: [{
    title: String,
    duration: String,
    company: String,
  }],
  email: { type: String, required: true },
  phone: { type: String },
  linkedin: { type: String },
  github: { type: String },
  profilePic: { type: String },
  resume: { type: String },
  appliedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['applied', 'withdraw', 'interview','interviewing', 'hired', 'declined'],
    default: 'applied',
  },
  // New fields for interview details
  interviewDate: { type: Date },
  interviewTime: { type: String }, // e.g., "10:00 AM"
  interviewLink: { type: String }, // e.g., Zoom/Google Meet link
});

module.exports = mongoose.model('Candidate', candidateSchema);