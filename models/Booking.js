import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
 guestName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  roomType: { type: String, enum: ['Super Luxury', 'Deluxe', 'Normal'], required: true },
  roomNumber: { type: Number, required: true },
  roomRate: { type: Number, required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  totalRoomCharge: { type: Number, default: 0 },
  advancePaid: { type: Number, default: 0 },
  status: { type: String, enum: ['Reserved', 'Checked-In', 'Checked-Out', 'Cancelled'], default: 'Checked-In' }
}, { timestamps: true });

// Pre-save hook (Updated for Mongoose 9+)
bookingSchema.pre('save', function () {
  if (this.checkInDate && this.checkOutDate) {
    const timeDifference = this.checkOutDate.getTime() - this.checkInDate.getTime();
    const nights = Math.ceil(timeDifference / (1000 * 3600 * 24));
    
    // Ensure at least 1 night is charged
    const totalNights = nights > 0 ? nights : 1; 
    this.totalRoomCharge = totalNights * this.roomRate;
  }
});

bookingSchema.methods.calculateFinalBill = async function () {
  const orders = await mongoose.model('Order').find({ bookingId: this._id, paymentStatus: 'Bill to Room' });
  const totalOrderCharges = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  return {
    totalRoomCharge: this.totalRoomCharge,
    totalOrderCharges,
    advancePaid: this.advancePaid,
    remainingBalance: (this.totalRoomCharge + totalOrderCharges) - this.advancePaid
  };
};

export const Booking = mongoose.model('Booking', bookingSchema);