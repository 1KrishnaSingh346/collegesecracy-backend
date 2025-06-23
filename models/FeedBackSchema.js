import mongoose from "mongoose";
 const feedBackSchema = new mongoose.Schema({
   
     feedbacks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback'
    }],
   
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    message:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        enum:['pending','approved','rejected'],
        default:'pending',
    },
    starRating:{
        type:Number,
        min:1,
        max:5,
        required:true,
        default:0,
    }
 }, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual population
feedBackSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

 export const Feedback = mongoose.model('Feedback', feedBackSchema);
 