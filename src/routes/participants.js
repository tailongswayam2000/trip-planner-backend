const express = require('express');
const router = express.Router();
const Participant = require('../models/mongo/Participant');
const Family = require('../models/mongo/Family');

// Get all participants for a trip
router.get('/trip/:tripId', async (req, res) => {
    try {
        const participants = await Participant.find({ tripId: req.params.tripId })
            .populate('familyId')
            .sort({ isHead: -1, name: 1 });
        res.json(participants);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create participant
router.post('/', async (req, res) => {
    try {
        const { tripId, name, familyId, isHead } = req.body;

        const participant = new Participant({
            tripId,
            name,
            familyId: familyId || null,
            isHead: isHead !== undefined ? isHead : true
        });

        const saved = await participant.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update participant
router.put('/:id', async (req, res) => {
    try {
        const { name, familyId, isHead } = req.body;
        const updated = await Participant.findByIdAndUpdate(
            req.params.id,
            { name, familyId, isHead },
            { new: true }
        ).populate('familyId');

        if (!updated) {
            return res.status(404).json({ message: 'Participant not found' });
        }
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete participant
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Participant.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Participant not found' });
        }
        res.json({ message: 'Participant deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get settling entities (heads only) for a trip
router.get('/trip/:tripId/settling', async (req, res) => {
    try {
        const settlingEntities = await Participant.find({
            tripId: req.params.tripId,
            isHead: true
        }).sort({ name: 1 });
        res.json(settlingEntities);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
