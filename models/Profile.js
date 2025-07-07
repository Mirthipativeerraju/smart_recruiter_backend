const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  phone_no: { 
    type: String, 
    required: true 
  },
  website: { 
    type: String 
  },
  logo: { 
    type: String 
  },
  departments: [{ 
    type: String, 
    required: true 
  }],
  locations: [{ 
    type: String, 
    required: true 
  }],
  facebook_url: { 
    type: String 
  },
  linkedin_url: { 
    type: String 
  },
  insta_url: { 
    type: String 
  },
  yt_url: { 
    type: String 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Profile', profileSchema);