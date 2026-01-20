const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    schedule: String,
    type: { type: String, required: true, index: true },
    isMunicipal: Boolean,
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        }
    },
    address: String,
    phone: String,
    district: String,
    agencyCode: String,
    agencyName: String
}, { timestamps: true });

equipmentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Equipment', equipmentSchema);
