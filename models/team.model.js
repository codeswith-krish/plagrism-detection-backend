import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: [true, 'Please add a team name'],
      trim: true,
      maxlength: [50, 'Team name cannot be more than 50 characters'],
    },
    leader: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    project: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project',
      required: true,
    },
  },
  {
    timestamps: true, // Automates createdAt and updatedAt
  }
);

export default mongoose.model('Team', teamSchema);
