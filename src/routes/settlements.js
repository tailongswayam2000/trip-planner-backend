const express = require('express');
const router = express.Router();
const Expense = require('../models/mongo/Expense');
const Participant = require('../models/mongo/Participant');
const Family = require('../models/mongo/Family');

/**
 * Calculate settlements for a trip
 * Implements the min-cash-flow algorithm with family dependency support
 */
router.get('/trip/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;

        // Get all participants and families
        const participants = await Participant.find({ tripId });
        const families = await Family.find({ tripId });

        // Get all expenses with splitAmong populated
        const expenses = await Expense.find({
            trip_id: tripId,
            paidByParticipant: { $exists: true, $ne: null },
            splitAmong: { $exists: true, $not: { $size: 0 } }
        });

        if (participants.length === 0) {
            return res.json({
                settlements: [],
                balances: {},
                message: 'No participants found'
            });
        }

        if (expenses.length === 0) {
            return res.json({
                settlements: [],
                balances: {},
                message: 'No expenses with split tracking found'
            });
        }

        // Step 1 & 2: Calculate individual balances
        const balances = {};
        participants.forEach(p => {
            balances[p._id.toString()] = {
                id: p._id.toString(),
                name: p.name,
                totalPaid: 0,
                totalOwed: 0,
                netBalance: 0,
                isHead: p.isHead,
                familyId: p.familyId?.toString() || null
            };
        });

        expenses.forEach(expense => {
            const payerId = expense.paidByParticipant.toString();
            const amount = expense.amount;
            const splitCount = expense.splitAmong.length;
            const sharePerPerson = amount / splitCount;

            // Credit the payer
            if (balances[payerId]) {
                balances[payerId].totalPaid += amount;
            }

            // Debit each person in split
            expense.splitAmong.forEach(participantId => {
                const id = participantId.toString();
                if (balances[id]) {
                    balances[id].totalOwed += sharePerPerson;
                }
            });
        });

        // Calculate net balances
        Object.values(balances).forEach(b => {
            b.netBalance = b.totalPaid - b.totalOwed;
        });

        // Step 3: Aggregate to settling entities (family heads)
        const familyHeadMap = {};
        families.forEach(f => {
            familyHeadMap[f._id.toString()] = f.headId.toString();
        });

        const settlingBalances = {};

        participants.filter(p => p.isHead).forEach(head => {
            settlingBalances[head._id.toString()] = {
                id: head._id.toString(),
                name: head.name,
                netBalance: 0,
                members: []
            };
        });

        Object.values(balances).forEach(b => {
            let settlingEntityId;

            if (b.isHead) {
                settlingEntityId = b.id;
            } else if (b.familyId) {
                // Find the head of this family
                settlingEntityId = familyHeadMap[b.familyId];
            }

            if (settlingEntityId && settlingBalances[settlingEntityId]) {
                settlingBalances[settlingEntityId].netBalance += b.netBalance;
                settlingBalances[settlingEntityId].members.push({
                    name: b.name,
                    netBalance: b.netBalance
                });
            }
        });

        // Step 4: Min-cash-flow settlement algorithm
        const creditors = [];
        const debtors = [];

        Object.values(settlingBalances).forEach(entity => {
            if (entity.netBalance > 0.01) {
                creditors.push({ ...entity });
            } else if (entity.netBalance < -0.01) {
                debtors.push({ ...entity });
            }
        });

        // Sort: creditors descending, debtors by absolute value descending
        creditors.sort((a, b) => b.netBalance - a.netBalance);
        debtors.sort((a, b) => a.netBalance - b.netBalance); // More negative first

        const settlements = [];

        while (creditors.length > 0 && debtors.length > 0) {
            const creditor = creditors[0];
            const debtor = debtors[0];

            const amount = Math.min(creditor.netBalance, Math.abs(debtor.netBalance));

            if (amount > 0.01) {
                settlements.push({
                    from: { id: debtor.id, name: debtor.name },
                    to: { id: creditor.id, name: creditor.name },
                    amount: Math.round(amount * 100) / 100
                });
            }

            creditor.netBalance -= amount;
            debtor.netBalance += amount;

            if (Math.abs(creditor.netBalance) < 0.01) {
                creditors.shift();
            }
            if (Math.abs(debtor.netBalance) < 0.01) {
                debtors.shift();
            }
        }

        res.json({
            individualBalances: balances,
            settlingBalances,
            settlements,
            totalExpenses: expenses.length,
            totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0)
        });

    } catch (err) {
        console.error('Settlement calculation error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
