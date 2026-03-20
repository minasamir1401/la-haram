require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, '../fuzzy-goggles-main/fuzzy-goggles-main')));

// ─── Databases Connections ─────────────────────────────────────────────────────

// 1. MongoDB Connection
let mongoConnected = false;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        mongoConnected = true;
    })
    .catch(err => console.error('MongoDB connection error:', err));

// 2. PostgreSQL Connection (New Neon DB - Use for everything now)
const pgPool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_TKH2vGo9YUqg@ep-tiny-dust-antvq8qu-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { 
        rejectUnauthorized: false
    }
});

let pgConnected = false;
pgPool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL (New Neon DB)');
        pgConnected = true;
        // Create table if not exists
        return client.query(`
            CREATE TABLE IF NOT EXISTS participants (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                contact TEXT NOT NULL,
                image TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `).finally(() => client.release());
    })
    .catch(err => console.error('PostgreSQL connection error:', err));

// ─── Models / Schemas ─────────────────────────────────────────────────────────

// Mongoose Schema (MongoDB)
const participantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact: { type: String, required: true },
    image: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Participant = mongoose.model('Participant', participantSchema);

// Memory tracker for Round-Robin
let dbToggle = 0; // 0 for MongoDB, 1 for PostgreSQL

// Multer storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ─── API Endpoints ────────────────────────────────────────────────────────────

// POST /api/register - Round-Robin load balancing
app.post('/api/register', upload.single('image'), async (req, res) => {
    try {
        const { name, contact } = req.body;

        if (!req.file) return res.status(400).json({ error: 'صورة إثبات تطبيق الشروط مطلوبة' });
        if (!name || !contact) return res.status(400).json({ error: 'الاسم ورقم الموبايل مطلوبين' });

        // Image Compression - super fast using sharp
        const compressedBuffer = await sharp(req.file.buffer)
            .resize({ width: 800, withoutEnlargement: true }) // Resize if larger than 800px
            .jpeg({ quality: 70, progressive: true })       // Compress to JPEG with 70% quality
            .toBuffer();

        const dataURI = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

        let savedTo = "";

        // Save ONLY to PostgreSQL (Neon New) for maximum reliability
        if (pgConnected) {
            await pgPool.query(
                'INSERT INTO participants (name, contact, image) VALUES ($1, $2, $3)',
                [name, contact, dataURI]
            );
            savedTo = "PostgreSQL (Neon New)";
        } else {
            throw new Error("Neon Database is currently unavailable.");
        }

        console.log(`[Registration] Data saved to ${savedTo}`);
        res.status(200).json({ success: true, message: 'تم التسجيل بنجاح! 🎉' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'حدث خطأ أثناء حفظ البيانات' });
    }
});

// GET /api/participants - Merge data from both DBs
app.get('/api/participants', async (req, res) => {
    try {
        let allParticipants = [];

        // 1. Fetch from MongoDB
        if (mongoConnected) {
            const mongoData = await Participant.find().lean();
            mongoData.forEach(p => {
                allParticipants.push({
                    id: p._id,
                    name: p.name,
                    contact: p.contact,
                    image: p.image,
                    createdAt: p.createdAt,
                    source: 'MongoDB'
                });
            });
        }

        // 2. Fetch from PostgreSQL (Only New Data)
        if (pgConnected) {
            try {
                const pgResult = await pgPool.query('SELECT * FROM participants ORDER BY created_at DESC');
                pgResult.rows.forEach(p => {
                    allParticipants.push({
                        id: p.id,
                        name: p.name,
                        contact: p.contact,
                        image: p.image,
                        createdAt: p.created_at,
                        source: 'PostgreSQL (New)'
                    });
                });
            } catch (error) {
                console.error('Error fetching from PostgreSQL:', error);
            }
        }

        // Sort by date (descending)
        allParticipants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({ participants: allParticipants });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب البيانات' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        mongo: mongoConnected, 
        postgres: pgConnected,
        time: new Date().toISOString() 
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
