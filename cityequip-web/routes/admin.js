const express = require('express');
const router = express.Router();
const axios = require('axios');

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Forbidden: Admins only');
    }
};

router.use(checkAdmin);

// Create Form
router.get('/create', (req, res) => {
    res.render('admin_form', { title: 'Create Equipment', equipment: {} });
});

// Create Action
router.post('/create', async (req, res) => {
    try {
        // Construct payload. API expects specific structure. 
        // Form simplified: name, type, lat, lng, address...
        const payload = {
            name: req.body.name,
            type: req.body.type,
            location: {
                type: 'Point',
                coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
            },
            address: req.body.address,
            phone: req.body.phone
            // ... other fields
        };

        await axios.post(API_URL, payload, { headers: { 'x-api-key': API_KEY } });
        res.redirect('/equipments');
    } catch (err) {
        res.render('admin_form', { title: 'Create Equipment', equipment: req.body, error: err.message });
    }
});

// Edit Form
router.get('/edit/:id', async (req, res) => {
    try {
        const { data } = await axios.get(`${API_URL}/${req.params.id}`);
        res.render('admin_form', { title: 'Edit Equipment', equipment: data });
    } catch (err) {
        res.redirect('/equipments');
    }
});

// Edit Action
router.post('/edit/:id', async (req, res) => {
    console.log(`[Admin] Attempting to edit equipment ${req.params.id}`);
    console.log('[Admin] Request Body:', req.body);

    try {
        const lat = parseFloat(req.body.lat);
        const lng = parseFloat(req.body.lng);

        console.log(`[Admin] Parsed Coords: Lat=${lat}, Lng=${lng}`);

        if (isNaN(lat) || isNaN(lng)) {
            console.error('[Admin] Invalid coordinates');
            throw new Error('Latitude and Longitude must be valid numbers');
        }

        const payload = {
            name: req.body.name,
            type: req.body.type,
            location: {
                type: 'Point',
                coordinates: [lng, lat]
            },
            address: req.body.address,
            phone: req.body.phone
        };

        console.log('[Admin] Sending Payload to API:', payload);
        const response = await axios.put(`${API_URL}/${req.params.id}`, payload, { headers: { 'x-api-key': API_KEY } });
        console.log('[Admin] API Response Status:', response.status);

        res.redirect(`/equipments/${req.params.id}`);
    } catch (err) {
        console.error('[Admin] Edit Error Full:', err);
        const errorMessage = err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message;
        console.error('[Admin] Extracted Error Message:', errorMessage);

        res.render('admin_form', {
            title: 'Edit Equipment',
            equipment: { ...req.body, _id: req.params.id, lat: req.body.lat, lng: req.body.lng },
            error: errorMessage
        });
    }
});

// Delete Action
router.post('/delete/:id', async (req, res) => {
    try {
        await axios.delete(`${API_URL}/${req.params.id}`, { headers: { 'x-api-key': API_KEY } });
        res.redirect('/equipments');
    } catch (err) {
        res.redirect(`/equipments/${req.params.id}?error=DeleteFailed`);
    }
});

module.exports = router;
