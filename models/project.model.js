import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a project title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a project description'],
      validate: {
        validator: function (value) {
          // Word count should be max 50 words
          return value.trim().split(/\s+/).length <= 50;
        },
        message: 'Description cannot exceed 50 words',
      },
    },
    pptFilePath: {
      type: String,
      required: [true, 'Please upload a PPT file'],
    },
    extractedText: {
      type: String,
    },
    submittedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    semester: {
      type: Number,
      required: [true, 'Please add the semester for the project'],
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
    },
    similarityPercentage: {
      type: Number,
      default: 0,
    },
    matchedProject: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project',
    },
    plagiarismStatus: {
      type: String,
      enum: ["SAFE", "SUSPICIOUS", "HIGH", "EXTREME"],
    },
    copiedSentences: [{
      type: String,
    }],
    analysisCompleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'flagged', 'review', 'approved'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Also provides createdAt and updatedAt
  }
);

export default mongoose.model('Project', projectSchema);
