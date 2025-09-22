const mongoose = require('mongoose');

const PlaceSchema = new mongoose.Schema({
    trip_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'historical'
    },
    estimated_duration: {
        type: Number,
        default: 60
    },
    address: {
        type: String
    },
    notes: {
        type: String
    }
});

module.exports = mongoose.model('Place', PlaceSchema);