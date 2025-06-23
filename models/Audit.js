import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  ip: {
    type: String,
    default: ''
  },
  deviceInfo: {           // ✅ New field added here
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export const Audit = mongoose.model('Audit', auditSchema);
