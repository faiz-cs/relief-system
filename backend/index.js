require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const housesRoutes = require('./routes/houses');
const eventsRoutes = require('./routes/events');
const tokensRoutes = require('./routes/tokens');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const portalRoutes = require('./routes/portal');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/houses', housesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);

app.use('/api/portal', portalRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
