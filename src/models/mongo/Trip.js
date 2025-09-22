const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    start_date: {
        type: String, // Using String for now, can be changed to Date if needed
        required: true
    },
    end_date: {
        type: String, // Using String for now, can be changed to Date if needed
        required: true
    },
    budget: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        default: 'upcoming'
    }
});

module.exports = mongoose.model('Trip', TripSchema);