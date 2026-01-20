const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    equipmentId: { type: String, required: true }, // ID from the API
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
}, { timestamps: true });

// Compound index to prevent multiple reviews per user per equipment?
// "Permitir... modificar sus puntuaciones". So maybe unique per user+equipment.
reviewSchema.index({ user: 1, equipmentId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
