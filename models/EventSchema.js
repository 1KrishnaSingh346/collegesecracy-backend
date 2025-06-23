import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['workshop', 'webinar', 'seminar', 'meetup'],
    required: true
  },
  maxAttendees: {
    type: Number,
    min: 1
  },
  registrationLink: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  imageUrl: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for duration
EventSchema.virtual('duration').get(function() {
  return (this.endDate - this.date) / (1000 * 60 * 60); // Duration in hours
});

// Add index for faster queries
EventSchema.index({ date: 1, status: 1 });
const Event = mongoose.model('Event', EventSchema);
export default Event;
