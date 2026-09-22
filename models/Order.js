import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  bookingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking',
    required: false 
  },
  // NEW: Added to support the External Restaurant POS
  orderType: { 
    type: String,
    default: 'In-House Service'
  },
  customerName: { 
    type: String 
  },
  items: [{
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { 
    type: Number, 
    default: 0 
  },
  // FIXED: Removed the duplicate definition and the strict enum 
  // so it successfully accepts 'Paid via UPI', 'Paid via Card', etc.
  paymentStatus: { 
    type: String, 
    default: 'Bill to Room' 
  }
}, { timestamps: true });

// Pre-save hook (Updated for Mongoose 9+)
orderSchema.pre('save', function () {
  this.totalAmount = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
});

export const Order = mongoose.model('Order', orderSchema);