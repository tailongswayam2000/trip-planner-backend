const mongoose = require('mongoose');

const DayPlanSchema = new mongoose.Schema({
    trip_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    date: {
        type: String, // Using String for now
        required: true
    }
});

DayPlanSchema.virtual('places', {
  ref: 'DayPlanPlace',
  localField: '_id',
  foreignField: 'day_plan_id',
});

DayPlanSchema.set('toObject', { virtuals: true });
DayPlanSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('DayPlan', DayPlanSchema);