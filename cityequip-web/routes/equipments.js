const express = require('express');
const router = express.Router();
const axios = require('axios');
const Review = require('../models/Review');

const API_URL = process.env.API_URL;

// List
router.get('/', async (req, res) => {
    try {
        const { type, page } = req.query;

        let url = API_URL;
        const params = [];
        if (type) params.push(`type=${encodeURIComponent(type)}`);
        if (page) params.push(`page=${encodeURIComponent(page)}`);
        if (params.length) url += `?${params.join('&')}`;

        const { data } = await axios.get(url);

        // API now returns object { equipments, totalPages, currentPage }
        // Fallback for backward compatibility if API not updated yet:
        const equipments = data.equipments || data;
        const totalPages = data.totalPages || 1;
        const currentPage = data.currentPage || 1;

        res.render('index', {
            equipments,
            filterType: type,
            totalPages,
            currentPage
        });
    } catch (err) {
        res.render('index', { equipments: [], error: 'API Error: ' + err.message });
    }
});

// Rankings
router.get('/rankings', async (req, res) => {
    try {
        // Global Top 3
        const globalTop = await Review.aggregate([
            { $group: { _id: '$equipmentId', avgRating: { $avg: '$rating' } } },
            { $sort: { avgRating: -1 } },
            { $limit: 3 }
        ]);

        // Personal Top 3
        let personalTop = [];
        if (req.session.user) {
            personalTop = await Review.find({ user: req.session.user._id })
                .sort({ rating: -1 })
                .limit(3);
        }

        // Hydrate names (could use a helper function)
        const hydrate = async (list) => {
            return Promise.all(list.map(async (item) => {
                // BUG FIX: Check equipmentId first (for Mongoose Docs in Personal Top), 
                // then _id (for Aggregation Results in Global Top).
                const id = item.equipmentId || item._id;
                try {
                    const { data } = await axios.get(`${API_URL}/${id}`);
                    return { ...item, name: data.name, id: id, avgRating: item.avgRating || item.rating };
                } catch (e) {
                    return { ...item, name: 'Unknown', id: id };
                }
            }));
        };

        const globalHydrated = await hydrate(globalTop);
        const personalHydrated = await hydrate(personalTop);

        res.render('rankings', { globalTop: globalHydrated, personalTop: personalHydrated });
    } catch (err) {
        res.render('error', { error: err.message });
    }
});

// Map View (All items)
router.get('/map', async (req, res) => {
    try {
        const { type } = req.query;
        // Map needs ALL points, so we request a high limit.
        // Also handle the search/filter if present.
        let url = `${API_URL}?limit=2000`;
        if (type) url += `&type=${encodeURIComponent(type)}`;

        const { data } = await axios.get(url);

        // Handle new API structure { equipments: [...], ... } vs old [...]
        const equipments = data.equipments || data;

        res.render('map', { equipments, filterType: type });
    } catch (err) {
        res.render('map', { equipments: [], error: err.message });
    }
});

// Detail
router.get('/:id', async (req, res) => {
    try {
        const apiRes = await axios.get(`${API_URL}/${req.params.id}`);
        const equipment = apiRes.data;

        // Get Reviews
        const reviews = await Review.find({ equipmentId: req.params.id }).populate('user', 'username');

        // Calculate Avg Rating
        const avgRating = reviews.length ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1) : 0;

        res.render('detail', { equipment, reviews, avgRating });
    } catch (err) {
        res.render('error', { error: 'Could not load equipment: ' + err.message });
    }
});

// Add Review
router.post('/:id/reviews', async (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');

    try {
        const { rating, comment } = req.body;
        // Upsert review?
        await Review.findOneAndUpdate(
            { user: req.session.user._id, equipmentId: req.params.id },
            { rating, comment },
            { upsert: true, new: true }
        );
        res.redirect(`/equipments/${req.params.id}`);
    } catch (err) {
        res.redirect(`/equipments/${req.params.id}?error=${encodeURIComponent(err.message)}`);
    }
});

module.exports = router;
