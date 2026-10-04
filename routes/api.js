import express from 'express';
import { Booking } from '../models/Booking.js';
import { Order } from '../models/Order.js';

const router = express.Router();

// --- BOOKING ROUTES ---
router.get('/bookings', async (req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 });
  res.json(bookings);
});
// POST /api/public/book
router.post('/public/book', async (req, res) => {
  try {
    const { guestName, phone, email, roomType, checkInDate, checkOutDate } = req.body;

    // 1. Determine the room rate based on the selection
    let roomRate = 7500;
    if (roomType === 'Deluxe') roomRate = 15000;
    if (roomType === 'Super Luxury') roomRate = 20500;

    // 2. Calculate the total charge (Days * Rate)
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diffTime = Math.abs(checkOut - checkIn);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Default to 1 if same day
    const totalRoomCharge = totalDays * roomRate;

    // 3. Save with all required schema fields to prevent MongoDB errors
    const newBooking = new Booking({
      guestName,
      phone,
      email: email || "", // Default to empty string if undefined
      roomType,
      roomNumber: 0,      // Placeholder! 0 means "Not Assigned Yet"
      roomRate,
      checkInDate,
      checkOutDate,
      totalRoomCharge,
      advancePaid: 0,
      status: 'Reserved'
    });

    await newBooking.save();
    res.status(201).json({ message: 'Booking request sent successfully!', booking: newBooking });
  } catch (error) {
    // This logs the EXACT reason it failed to your Render logs
    console.error("Public booking error:", error); 
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});
// Create new booking (Auto-detects if it's a Future Reservation)
router.post('/bookings', async (req, res) => {
  try {
    const { roomNumber, checkInDate, checkOutDate } = req.body;
    
    // 1. Check for overlapping dates in the same room
    const conflict = await Booking.findOne({
      roomNumber,
      status: { $in: ['Checked-In', 'Reserved'] },
      $or: [
        { checkInDate: { $lt: checkOutDate }, checkOutDate: { $gt: checkInDate } }
      ]
    });

    if (conflict) return res.status(400).json({ error: 'Room is already booked for these dates.' });

    // 2. Auto-set status: If check-in is in the future, mark as 'Reserved'
    const today = new Date();
    today.setHours(0,0,0,0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0,0,0,0);
    
    const status = checkIn > today ? 'Reserved' : 'Checked-In';

    const newBooking = new Booking({ ...req.body, status });
    await newBooking.save();
    res.status(201).json(newBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking (Handles extensions and prevents conflicts)
router.put('/bookings/:id', async (req, res) => {
  try {
    const { roomNumber, checkInDate, checkOutDate } = req.body;

    // Check if the requested extension overlaps with any OTHER upcoming booking
    const conflict = await Booking.findOne({
      _id: { $ne: req.params.id }, // Ignore the current booking itself
      roomNumber,
      status: { $in: ['Checked-In', 'Reserved'] },
      $or: [
        { checkInDate: { $lt: checkOutDate }, checkOutDate: { $gt: checkInDate } }
      ]
    });

    if (conflict) {
      return res.status(400).json({ error: 'Cannot extend! Room is already reserved by another guest for these dates.' });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/bookings/:id/checkout', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    const bill = await booking.calculateFinalBill();
    res.json({ booking, bill });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/bookings/:id/checkout', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Update the status to Checked-Out
    booking.status = 'Checked-Out';
    await booking.save();
    
    res.json({ message: 'Checkout successful', booking });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// --- ORDER ROUTES ---
router.post('/orders', async (req, res) => {
  try {
    const order = await new Order(req.body).save();
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/orders/booking/:id', async (req, res) => {
  const orders = await Order.find({ bookingId: req.params.id });
  res.json(orders);
});

// Fetch all external restaurant orders
router.get('/orders/external', async (req, res) => {
  try {
    // Find external orders and sort by newest first
    const orders = await Order.find({ orderType: 'External Restaurant' }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an external order
router.put('/orders/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;