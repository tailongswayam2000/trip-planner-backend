const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        default: null
    },
    isHead: {
        type: Boolean,
        default: true // true if independent or family head
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
ParticipantSchema.index({ tripId: 1, familyId: 1 });

module.exports = mongoose.model('Participant', ParticipantSchema);
