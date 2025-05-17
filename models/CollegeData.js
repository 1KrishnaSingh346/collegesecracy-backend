import mongoose from 'mongoose';

const collegeDataSchema = new mongoose.Schema({
  counsellingType: {
    type: String,
    required: true,
    enum: ['JOSAA', 'CSAB', 'UPTAC', 'OTHERS'],
    uppercase: true
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: new Date().getFullYear() + 1
  },
  round: {
    type: String,
    required: true,
    enum: ['1', '2', '3', '4', '5', '6', 'AR'],
    validate: {
      validator: function(v) {
        // AR stands for Additional Round
        return /^[1-6]$|^AR$/.test(v);
      },
      message: props => `${props.value} is not a valid round! Use 1-6 or AR`
    }
  },
  data: [{
    Institute: String,
    'Academic Program Name': String,
    Quota: String,
    'Seat Type': String,
    Gender: String,
    'Opening Rank': Number,
    'Closing Rank': Number,
    Round: {
      type: String,
      enum: ['1', '2', '3', '4', '5', '6', 'AR'],
      default: '1'
    },
    State: String,
    Remark: String,
    // For UPTAC specific fields
    Program: String,
    'Seat Gender': String,
    Category: String,
    // Additional common fields
    'Institute Type': String,
    'Candidate Category': String,
    'PD Status': String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the unique index to include round
collegeDataSchema.index(
  { counsellingType: 1, year: 1, round: 1 }, 
  { unique: true }
);

// Update the timestamp before saving
collegeDataSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const CollegeData = mongoose.model('CollegeData', collegeDataSchema);

export default CollegeData;