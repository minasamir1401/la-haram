require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Schema - stores image as base64 inside DB
const participantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact: { type: String, required: true },
    image: { type: String, required: true },   // base64 data URI
    createdAt: { type: Date, default: Date.now }
});

const Participant = mongoose.model('Participant', participantSchema);

// Multer - memory storage (no disk needed)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }  // 10 MB max
});

// ─── API Endpoints ────────────────────────────────────────────────────────────

// POST /api/register
app.post('/api/register', upload.single('image'), async (req, res) => {
    try {
        const { name, contact } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'صورة إثبات تطبيق الشروط مطلوبة' });
        }
        if (!name || !contact) {
            return res.status(400).json({ error: 'الاسم ورقم الموبايل/الإيميل مطلوبين' });
        }

        // Convert buffer → base64 data URI
        const mime = req.file.mimetype;                           // e.g. image/jpeg
        const b64 = req.file.buffer.toString('base64');
        const dataURI = `data:${mime};base64,${b64}`;

        const participant = new Participant({ name, contact, image: dataURI });
        await participant.save();

        res.status(200).json({ success: true, message: 'تم التسجيل بنجاح! 🎉' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'حدث خطأ أثناء حفظ البيانات' });
    }
});

// GET /api/participants
app.get('/api/participants', async (req, res) => {
    try {
        const participants = await Participant.find().sort({ createdAt: -1 });
        res.status(200).json({ participants });
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ أثناء جلب البيانات' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'حدث خطأ غير متوقع في السيرفر' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
