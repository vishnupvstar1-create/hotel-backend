import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomType: { 
    type: String, 
    required: true,
    enum: ['Normal', 'Deluxe', 'Super Luxury']
  },
  roomNumber: { 
    type: Number, 
    required: true,
    unique: true
  },
  roomRate: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String, 
    required: false 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Available', 'Maintenance'],
    default: 'Available'
  }
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);