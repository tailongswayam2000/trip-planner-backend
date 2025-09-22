const mongoose = require('mongoose');

const LedgerSchema = new mongoose.Schema({
    trip_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    payer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentUser',
        required: false
    },
    payee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentUser',
        required: false // Made optional
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    event_description: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Ledger', LedgerSchema);