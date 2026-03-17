import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, // Prevents returning password by default in queries
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    semester: {
      type: Number,
      required: function () {
        return this.role === 'student'; // Only required if user is a student
      },
      min: 1,
      max: 8,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Hash password and enforce Single Admin before saving to the database
userSchema.pre('save', async function (next) {
  // If editing an existing user, check if we're trying to make them an 'admin'
  if (this.isModified('role') && this.role === 'admin') {
    const adminExists = await mongoose.models.User.findOne({ role: 'admin' });

    // Check if an admin already exists AND it's not the same user being updated
    if (adminExists && adminExists._id.toString() !== this._id.toString()) {
      return next(new Error('Admin user already exists. Only one Admin is allowed in the Database.'));
    }
  }

  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
export default User;
