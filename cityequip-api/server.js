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
app.use('/equipments', equipmentRoutes);

// Start our app!
app.set('port', process.env.PORT || 7777);
const server = app.listen(app.get('port'), () => {
    console.log(`Express running at PORT ${server.address().port} **`);
});
