const mongoose = require('mongoose');

const PaymentUserSchema = new mongoose.Schema({
    trip_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    name: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('PaymentUser', PaymentUserSchema);