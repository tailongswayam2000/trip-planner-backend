const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true // e.g., "Sharma Family", "John's Group"
    },
    headId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Family', FamilySchema);
