const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: 'variables.env' });

const loadData = require('./utils/loader');
const equipmentRoutes = require('./routes/equipments');

// Connect to our Database and handle any bad connections
mongoose.connect(process.env.DATABASE).then(async () => {
    console.log(`connection to database established`);
    // Load data on startup
    await loadData();
}).catch(err => {
    console.log(`db error ${err.message}`);
    process.exit(-1);
});

const app = express();

app.use(cors());
app.use(express.json());

// Routes
// Routes
app.use('/equipments', equipmentRoutes);

// EMERGENCY RESET ROUTE
// EMERGENCY RESET ROUTE
const Equipment = require('./models/Equipment'); // Import Model
app.get('/debug-reset', async (req, res) => {
    try {
        console.log('Force Reset: Deleting all equipments...');
        const result = await Equipment.deleteMany({});
        console.log(`Force Reset: Deleted ${result.deletedCount} documents.`);
        console.log('Force Reset: Triggering loader...');
        await loadData();
        res.send(`Reset Complete. Deleted: ${result.deletedCount}. Check logs for load status.`);
    } catch (e) {
        console.error('Reset Failed:', e);
        res.status(500).send(e.message);
    }
});

// Start our app!
app.set('port', process.env.PORT || 7777);
const server = app.listen(app.get('port'), () => {
    console.log(`Express running at PORT ${server.address().port} **`);
});
