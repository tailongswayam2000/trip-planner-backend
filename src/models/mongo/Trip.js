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
        type: String,
        required: true
    },
    end_date: {
        type: String,
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
    },
    // Access control fields
    accessCode: {
        type: String,
        unique: true,
        sparse: true, // Allows null for migration, but unique when set
        index: true
    },
    // Recovery fields (for recovering forgotten access codes)
    recoveryQuestion: {
        type: String,
        default: null
    },
    recoveryAnswer: {
        type: String, // Stored as lowercase for case-insensitive matching
        default: null
    },
    // Optional security layer (asked when joining trip)
    securityQuestion: {
        type: String,
        default: null
    },
    securityAnswer: {
        type: String, // Stored as lowercase for case-insensitive matching
        default: null
    },
    // Flag to identify legacy trips
    isLegacy: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Pre-save middleware to lowercase answers for consistent comparison
TripSchema.pre('save', function (next) {
    if (this.recoveryAnswer) {
        this.recoveryAnswer = this.recoveryAnswer.toLowerCase().trim();
    }
    if (this.securityAnswer) {
        this.securityAnswer = this.securityAnswer.toLowerCase().trim();
    }
    if (this.accessCode) {
        this.accessCode = this.accessCode.toLowerCase().trim();
    }
    next();
});

module.exports = mongoose.model('Trip', TripSchema);