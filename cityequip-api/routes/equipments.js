const express = require('express');
const router = express.Router();
const Equipment = require('../models/Equipment');
const verifyApiKey = require('../middleware/auth');

// GET /equipments - List all or filter by type
router.get('/', async (req, res) => {
    try {
        const { type, page = 1, limit = 12 } = req.query;
        const filter = {};
        if (type) {
            filter.type = type;
        }

        const count = await Equipment.countDocuments(filter);
        const totalPages = Math.ceil(count / limit);
        const currentPage = Math.max(1, parseInt(page));
        const skip = (currentPage - 1) * limit;

        const equipments = await Equipment.find(filter)
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            equipments,
            totalPages,
            currentPage,
            totalItems: count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /equipments/:id - Detail
router.get('/:id', async (req, res) => {
    try {
        const equipment = await Equipment.findById(req.params.id);
        if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
        res.json(equipment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /equipments - Protected
router.post('/', verifyApiKey, async (req, res) => {
    try {
        // Basic validation could be added here
        const newEquipment = new Equipment(req.body);
        const saved = await newEquipment.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /equipments/:id - Protected
router.put('/:id', verifyApiKey, async (req, res) => {
    try {
        const updated = await Equipment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Equipment not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /equipments/:id - Protected
router.delete('/:id', verifyApiKey, async (req, res) => {
    try {
        const deleted = await Equipment.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Equipment not found' });
        res.json({ message: 'Equipment deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
