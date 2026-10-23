const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const pool = require('./config/database');
const ensureDatabaseExists = require('./config/ensureDatabase');

const app = express();

// Ensure audio uploads directory exists
const audioUploadDir = path.join(__dirname, '../uploads/recordings');
if (!fs.existsSync(audioUploadDir)) {
    fs.mkdirSync(audioUploadDir, { recursive: true });
}
const seedRecordingsDir = path.join(__dirname, '../../database/seed_recordings');

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

// Robust audio streaming handler with multi-path resolution and HTTP 206 Partial Content
const streamAudioFile = (req, res, targetFilename) => {
    if (!targetFilename) {
        return res.status(400).json({ success: false, message: 'Filename is required' });
    }

    const rawFilename = path.basename(targetFilename);
    const candidatePaths = [
        path.join(audioUploadDir, rawFilename),
        path.join(seedRecordingsDir, rawFilename),
        path.join(__dirname, '../uploads', rawFilename),
        path.join(__dirname, '../../database/seed_recordings', rawFilename),
        path.join('/var/www/ninaivukalanjiyam/backend/uploads/recordings', rawFilename),
        path.join('/home/ubuntu/Ninaivukalanjiyam/backend/uploads/recordings', rawFilename),
        path.join('/home/ubuntu/Ninaivukalanjiyam/database/seed_recordings', rawFilename)
    ];

    const targetPath = candidatePaths.find(p => fs.existsSync(p));

    if (!targetPath) {
        console.warn(`[Audio Stream 404] File not found: ${rawFilename}. Checked:`, candidatePaths);
        return res.status(404).json({ success: false, message: 'Audio file not found' });
    }

    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(targetPath).toLowerCase();
    let mimeType = 'audio/webm';
    if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.mp3') mimeType = 'audio/mpeg';
    else if (ext === '.ogg') mimeType = 'audio/ogg';
    else if (ext === '.m4a') mimeType = 'audio/mp4';

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(targetPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*'
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*'
        };
        res.writeHead(200, head);
        fs.createReadStream(targetPath).pipe(res);
    }
};

// Query-param endpoint: bypasses any static file extension regex in Nginx (/api/audio-stream?file=...)
app.get('/api/audio-stream', (req, res) => {
    const filename = req.query.file;
    return streamAudioFile(req, res, filename);
});

// Standard REST endpoint: /api/audio/:filename
app.get('/api/audio/:filename', (req, res) => {
    return streamAudioFile(req, res, req.params.filename);
});

app.use('/api/audio', express.static(audioUploadDir));
if (fs.existsSync(seedRecordingsDir)) {
    app.use('/api/audio', express.static(seedRecordingsDir));
}

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
    app.use(express.static(frontendDist, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            }
        }
    }));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            return res.sendFile(path.join(frontendDist, 'index.html'));
        }
        next();
    });
}

const PORT = process.env.PORT || 5002;

async function startServer() {
    try {
        await ensureDatabaseExists();
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