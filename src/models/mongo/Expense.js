const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    trip_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        index: true
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
    category: {
        type: String,
        enum: ['food', 'transport', 'stay', 'tickets', 'shopping', 'other'],
        default: 'other'
    },
    payment_time: {
        type: Date,
        default: Date.now
    },
    // Legacy field - keep for backward compatibility
    paid_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentUser'
    },
    // New participant-based payer
    paidByParticipant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant'
    },
    // Who this expense is split among
    splitAmong: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant'
    }],
    // If true, expense is only for the payer (personal expense)
    isPersonal: {
        type: Boolean,
        default: false
    },
    place_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place'
    },
    mode_of_payment: {
        type: String,
        default: 'UPI'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', ExpenseSchema);