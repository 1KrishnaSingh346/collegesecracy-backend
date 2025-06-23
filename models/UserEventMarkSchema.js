import mongoose from "mongoose";

const UserEventMarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  status: {
    type: String,
    enum: ['registered', 'attended', 'cancelled'],
    default: 'registered'
  },
  reminderSet: {
    type: Boolean,
    default: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Compound index to ensure one user can't mark the same event multiple times
UserEventMarkSchema.index({ userId: 1, eventId: 1 }, { unique: true });
const UserEventMark = mongoose.model('EventMark', UserEventMarkSchema);
export default UserEventMark;