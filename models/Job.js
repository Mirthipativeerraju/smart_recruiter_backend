const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Job Schema
const jobSchema = new Schema({
  position: {
    type: String,
    required: true,
  },
  office: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  jobType: {
    type: String,
    required: true,
  },
  seats: {
    type: Number,
    required: true,
    min: 1,
  },
  salaryFrom: {
    type: Number,
    required: true,
  },
  salaryTo: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  organizationId: { // Add the organizationId field
    type: mongoose.Schema.Types.ObjectId, // Assuming organizationId is an ObjectId
    required: true,
    ref: 'Organization',
  },
  status: {
    type: String,
    enum: ['active', 'closed'], // Define allowed values
    default: 'active', // Default value is "active"
    
  },
}, { timestamps: true });

// Create and export the model
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;