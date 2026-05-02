require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors()); // Allow all origins as per requirements
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Pharmacie Centrale API is running' });
});  

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
