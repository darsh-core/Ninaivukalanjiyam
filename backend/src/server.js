require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const pool = require('./config/database');

const app = express();

// Ensure audio uploads directory exists
const audioUploadDir = path.join(__dirname, '../uploads/recordings');
if (!fs.existsSync(audioUploadDir)) {
    fs.mkdirSync(audioUploadDir, { recursive: true });
}

// Configure CORS and Helmet
app.use(helmet({
    crossOriginResourcePolicy: false, // Allow loading audio across origins
    contentSecurityPolicy: false       // Allow React SPA and external assets to render cleanly
}));

app.use(cors({
    origin: '*' // Allow access
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static audio files serving
app.use('/api/audio', express.static(audioUploadDir));

// Routes
const authRoutes = require('./routes/authRoutes');
const narratorRoutes = require('./routes/narratorRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const questionRoutes = require('./routes/questionRoutes');
const recordingRoutes = require('./routes/recordingRoutes');
const transcriptRoutes = require('./routes/transcriptRoutes');
const aiRoutes = require('./routes/aiRoutes');
const timelineRoutes = require('./routes/timelineRoutes');
const storyRoutes = require('./routes/storyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const exportRoutes = require('./routes/exportRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/narrators', narratorRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT current_database() AS database'
        );

        res.status(200).json({
            success: true,
            message: 'NinaivuKalanjiyam API is running',
            database: result.rows[0].database,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database health check failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }
});

// Serve frontend dist in production if available
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path.join(frontendDist, 'index.html'));
        }
        next();
    });
}

const PORT = process.env.PORT || 5002;

async function startServer() {
    try {
        await pool.query('SELECT 1');

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log('PostgreSQL connected successfully');
        });
    } catch (error) {
        console.error('Unable to connect to PostgreSQL:', error.message);
        await pool.end();
        process.exit(1);
    }
}

startServer();