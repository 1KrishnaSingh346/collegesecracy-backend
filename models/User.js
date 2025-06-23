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

  firstLogin : {
    type : Boolean,
    default : true
  },

  // Security Fields
  passwordChangedAt: Date,
  passwordResetToken: String,
passwordResetExpires: Date,


  active: {
    type: Boolean,
    default: true,
    select: false
  },
  deactivatedAt: {
  type: Date,
  default: null,
  select: false // Optional: hide it from API unless needed
},
deactivationReason: {
  type: String,
  default: ''
},

  ReactivatedAt: {
  type: Date,
  default: null,
  select: false 
},


loginAttempts: {
  type: Number,
  default: 0
},
lockUntil: Date,

isVerified: {
  type: Boolean,
  default: false,
},
verificationToken: String,
verificationTokenExpiry: Date,

resendCount: {
  type: Number,
  default: 0
},
lastResendAt: {
  type: Date,
  default: null
},

  // Profile Fields
profilePic: {
  type: {
    url: { type: String },
    public_id: { type: String }
  },
  default: null
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
  trim: true,
  default: ''
},

dateOfBirth: {
  type: Date,
  default: null
},


  // Premium Tools Section
  premiumTools: [
    {
      toolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
      planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
      toolName : {type : String, required : true},
      paymentId : {type: String, required : true },
      purchasedOn: { type: Date, default: Date.now },
      active : {type : Boolean, default:false}
    }
  ],

  // Counseling Plans Section
counselingPlans: [
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    planName : { type : String, required : true},
    paymentId : {type: String, required : true },
    purchasedOn: { type: Date, default: Date.now },
    active: { type: Boolean, default: false }
  }
],


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
  },



  // Timestamps
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
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
    virtuals: true,
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
userSchema.index({ 'paymentHistory.status': 1 });
userSchema.index({ 'premiumTools.toolId': 1 });


// Pre-save hooks
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

userSchema.statics.findActive = function(filter) {
  return this.find({ ...filter, active: { $ne: false } });
};

userSchema.statics.findActiveOne = function(filter = {}) {
  return this.findOne({ ...filter, active: { $ne: false } });
};



// Methods
userSchema.methods = {
  correctPassword: async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  },

  changedPasswordAfter: function(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  }
}


userSchema.methods.hasPremiumTool = function(toolId) {
  return this.premiumTools?.some(tool => tool.toolId?.toString() === toolId.toString());
};

userSchema.methods.addPremiumTool = async function(toolId, planId, toolName, paymentId, active = true) {
  if (!this.hasPremiumTool(toolId)) {
    this.premiumTools.push({
      toolId,
      planId,
      toolName,
      paymentId,
      purchasedOn: new Date(),
      active
    });
    await this.save();
  }
};

userSchema.methods.hasActiveCounselingPlan = function(planId) {
  const plan = this.counselingPlans?.find(p => p.planId.toString() === planId.toString());
  return plan?.active && (!plan.validUntil || new Date(plan.validUntil) > new Date());
};

userSchema.methods.addCounselingPlan = async function(planData) {
  const newPlan = {
    ...planData,
    purchasedOn: new Date(),
    active: true
  };
  this.counselingPlans.push(newPlan);
  await this.save();
};
// Virtual populate for feedbacks
userSchema.virtual('feedbacks', {
  ref: 'Feedback',
  localField: '_id',
  foreignField: 'userId',
  justOne: false
});

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});




export const User = mongoose.model('User', userSchema);