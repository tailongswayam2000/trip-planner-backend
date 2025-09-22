const mongoose = require('mongoose');

const DayPlanPlaceSchema = new mongoose.Schema({
    day_plan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DayPlan',
        required: true
    },
    place_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place',
        required: true
    },
    start_time: {
        type: String // Using String for now
    },
    end_time: {
        type: String // Using String for now
    },
    order_index: {
        type: Number
    },
    travel_time_to_next: {
        type: String
    }
});

module.exports = mongoose.model('DayPlanPlace', DayPlanPlaceSchema);