const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    trip_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    payment_time: {
        type: Date,
        default: Date.now
    },
    paid_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentUser'
    },
    place_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place'
    },
    mode_of_payment: {
        type: String,
        default: 'UPI'
    }
});

module.exports = mongoose.model('Expense', ExpenseSchema);