const express = require('express');
const router = express.Router();
const Family = require('../models/mongo/Family');
const Participant = require('../models/mongo/Participant');

// Get all families for a trip
router.get('/trip/:tripId', async (req, res) => {
    try {
        const families = await Family.find({ tripId: req.params.tripId })
            .populate('headId');

        // Also get members for each family
        const familiesWithMembers = await Promise.all(
            families.map(async (family) => {
                const members = await Participant.find({ familyId: family._id });
                return {
                    ...family.toObject(),
                    members
                };
            })
        );

        res.json(familiesWithMembers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create family with head
router.post('/', async (req, res) => {
    try {
        const { tripId, name, headName } = req.body;

        // Create the head participant first
        const head = new Participant({
            tripId,
            name: headName,
            isHead: true
        });
        const savedHead = await head.save();

        // Create the family
        const family = new Family({
            tripId,
            name,
            headId: savedHead._id
        });
        const savedFamily = await family.save();

        // Update head with family reference
        savedHead.familyId = savedFamily._id;
        await savedHead.save();

        res.status(201).json({
            ...savedFamily.toObject(),
            head: savedHead,
            members: [savedHead]
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add member to family
router.post('/:familyId/members', async (req, res) => {
    try {
        const { name } = req.body;
        const family = await Family.findById(req.params.familyId);

        if (!family) {
            return res.status(404).json({ message: 'Family not found' });
        }

        const member = new Participant({
            tripId: family.tripId,
            name,
            familyId: family._id,
            isHead: false // Dependent
        });

        const saved = await member.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete family (and optionally members)
router.delete('/:id', async (req, res) => {
    try {
        const family = await Family.findById(req.params.id);
        if (!family) {
            return res.status(404).json({ message: 'Family not found' });
        }

        // Remove family reference from all members, making them independent
        await Participant.updateMany(
            { familyId: family._id },
            { familyId: null, isHead: true }
        );

        await Family.findByIdAndDelete(req.params.id);
        res.json({ message: 'Family deleted, members are now independent' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
