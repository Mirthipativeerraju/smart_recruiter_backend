// models/Template.js
const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  database: {
    type: [String], // Change to an array of strings
    enum: ['Candidates', 'Job', 'Admin'], // Allowed values
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // Assuming a User model for admin
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // Assuming an Organization model
    required: true,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Template', TemplateSchema);