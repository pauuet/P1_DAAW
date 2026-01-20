const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');

// Register
router.get('/register', (req, res) => res.render('register'));

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Simple logic: first user is admin, else user
        const count = await User.countDocuments();
        const role = count === 0 ? 'admin' : 'user';

        await User.create({ username, password, role });
        res.redirect('/auth/login');
    } catch (err) {
        res.render('register', { error: 'Error registering user: ' + err.message });
    }
});

// Login
router.get('/login', (req, res) => res.render('login'));

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        req.session.user = user;
        res.redirect('/equipments');
    } catch (err) {
        res.render('login', { error: err.message });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// Profile
router.get('/profile', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    // Get User reviews
    // We need to fetch details for each equipment reviewed. This is tricky.
    // We'll fetch reviews, then for each, fetch equipment detail from API? 
    // Optimization: Just show IDs or name if we store name in Review? 
    // Better: Fetch all reviews, then client-side or server-side fetch names.
    // Given low traffic assumption, server-side fetch 1-by-1 or Promise.all is fine.

    try {
        const axios = require('axios');
        const reviews = await Review.find({ user: req.session.user._id }).sort('-updatedAt');

        // Enrich with equipment names
        const reviewsWithNames = await Promise.all(reviews.map(async (r) => {
            try {
                const { data } = await axios.get(`${process.env.API_URL}/${r.equipmentId}`);
                return { ...r.toObject(), equipmentName: data.name };
            } catch (e) {
                return { ...r.toObject(), equipmentName: 'Unknown Equipment' };
            }
        }));

        res.render('profile', { reviews: reviewsWithNames });
    } catch (err) {
        res.render('profile', { error: err.message, reviews: [] });
    }
});

module.exports = router;
