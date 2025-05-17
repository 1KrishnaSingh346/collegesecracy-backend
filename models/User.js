import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email'],
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['mentor', 'mentee', 'admin'],
    required: true,
  },

  // Security Fields
  passwordChangedAt: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  },

  // Profile Fields
  profilePic: {
    type: String,
    default: '',
    maxlength: [500, 'Profile picture URL too long']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Invalid phone number format'
    },
    default: ''
  },
  location: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[A-Za-z\s,]+$/.test(v);
      },
      message: 'Invalid location format'
    },
    default: ''
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v <= Date.now();
      },
      message: 'Date of birth cannot be in the future'
    },
    default: null
  },

  lastActive: {
    type: Date,
    default: Date.now
  },

  // Verification Fields
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified'
  },
  verificationFeedback: {
    type: String,
    default: '',
    maxlength: [500, 'Verification feedback too long']
  },

  feedback: {
    type: String,
    default: '',
    maxlength: [500, 'Feedback cannot exceed 500 characters']
  },
  // feedbackRating: { 
  //   type: Number,
  //   min: 1,
  //   max: 5,
  //   default: 0,
  //   validate: {
  //     validator: function(v) {
  //       return v >= 1 && v <= 5;
  //     },
  //     message: 'Rating must be between 1 and 5'
  //   }
  // },

  // Subscription Fields
  premium: {
    type: Boolean,
    default: false
  },
  premiumSince: {
    type: Date
  },

  subscriptionPlan: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  subscriptionPlanPrice: {
    type: Number,
    default: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Price cannot be negative'
    }
  },

// Add this to the User schema
counselingPlans: {
  josaa: {
    active: { type: Boolean, default: false },
    purchasedOn: Date,
    validUntil: Date,
    paymentId: String
  },
  jacDelhi: {
    active: { type: Boolean, default: false },
    purchasedOn: Date,
    validUntil: Date,
    paymentId: String
  },
  uptac: {
    active: { type: Boolean, default: false },
    purchasedOn: Date,
    validUntil: Date,
    paymentId: String
  },
  whatsapp: {
    active: { type: Boolean, default: false },
    purchasedOn: Date,
    validUntil: Date,
    paymentId: String,
    whatsappGroupLink: String
  }
},

  // Mentor-Specific Fields
  idProof: {
    type: String,
    required: function() { return this.role === 'mentor'; },
    validate: {
      validator: function(v) {
        if (this.role !== 'mentor') return true;
        return /^https:\/\/res\.cloudinary\.com\/.+\/.+\.(jpg|png|pdf)$/.test(v);
      },
      message: 'Invalid Cloudinary URL'
    }
  },
  collegeName: {
    type: String,
    required: function() { return this.role === 'mentor'; },
    maxlength: [100, 'College name too long']
  },
  expertise: {
    type: [String],
    default: [],
    validate: [
      {
        validator: function(arr) {
          return arr.length <= 15;
        },
        message: 'Max 15 expertise areas'
      },
      {
        validator: function(arr) {
          return arr.every(item => item.length <= 50);
        },
        message: 'Each expertise must be 50 characters or less'
      }
    ],
    set: function(arr) {
      return arr.map(item => item.toLowerCase().trim());
    }
  },
  socialLinks: {
    linkedIn: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v);
        },
        message: 'Invalid LinkedIn URL'
      },
      default: ''
    },
    twitter: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v);
        },
        message: 'Invalid Twitter URL'
      },
      default: ''
    },
    github: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v);
        },
        message: 'Invalid GitHub URL'
      },
      default: ''
    }
  },

  // Mentee-Specific Fields
  collegeId: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        if (this.role !== 'mentee') return true;
        return !v || /^[A-Za-z0-9\-]+$/.test(v);
      },
      message: 'Invalid college ID format'
    }
  },
  interests: {
    type: [String],
    default: [],
    validate: [
      {
        validator: function(arr) {
          return arr.length <= 10;
        },
        message: 'Max 10 interests'
      },
      {
        validator: function(arr) {
          return arr.every(item => item.length <= 50);
        },
        message: 'Each interest must be 50 characters or less'
      }
    ],
    set: function(arr) {
      return arr.map(item => item.toLowerCase().trim());
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.passwordChangedAt;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.passwordChangedAt;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ premium: 1 });
userSchema.index({ verificationStatus: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});

userSchema.pre('save', function(next) {
  if (this.isNew && this.role === 'mentor') {
    this.verificationStatus = 'pending';
  }
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

userSchema.methods.isPremium = function() {
  return this.premium && this.premiumSince;
};

export const User = mongoose.model('User', userSchema);