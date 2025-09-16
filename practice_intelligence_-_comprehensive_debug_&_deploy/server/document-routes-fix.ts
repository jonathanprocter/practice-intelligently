import { Router } from 'express';
import multer from 'multer';
import { dbWrapper } from './db-wrapper.js';
import { getAiClient } from './ai-service-wrapper.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// GET a specific document by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await dbWrapper.query('SELECT * FROM documents WHERE id = ?', [id]);
        if (result.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(result[0]);
    } catch (err) {
        console.error('Error fetching document:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST - Upload a new document
router.post('/', upload.single('file'), async (req, res) => {
    const { client_id, therapist_id, title } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const result: any = await dbWrapper.query(
            'INSERT INTO documents (client_id, therapist_id, title, file_path, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
            [client_id, therapist_id, title, file.path, file.originalname, file.mimetype, file.size]
        );
        
        // SQLite doesn't have RETURNING, so we need to get last insert id
        let newId;
        if (process.env.NODE_ENV !== 'production') {
            const lastIdResult: any = await dbWrapper.query('SELECT last_insert_rowid() as id');
            newId = lastIdResult[0].id;
        } else {
            newId = result[0].id; // For postgres
        }

        res.status(201).json({ message: 'Document uploaded successfully', document_id: newId });
    } catch (err) {
        console.error('Error uploading document:', err);
        res.status(500).json({ error: 'Failed to upload document.' });
    }
});

// POST - Generate AI insights for a document
router.post('/:id/ai-insights', async (req, res) => {
    const { id } = req.params;
    const { text_content } = req.body; // Assuming text content is extracted on the client for now

    if (!text_content) {
        return res.status(400).json({ error: 'Text content is required to generate insights.' });
    }

    try {
        const aiClient = getAiClient();
        const response = await aiClient.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are a helpful assistant for therapists. Analyze the following clinical note.' },
                { role: 'user', content: text_content },
            ],
        });

        const insights = response.choices[0].message.content;

        // Save insights to the database
        await dbWrapper.query('UPDATE documents SET ai_insights = ? WHERE id = ?', [insights, id]);

        res.json({ insights });
    } catch (err) {
        console.error('Error generating AI insights:', err);
        res.status(500).json({ error: 'Failed to generate AI insights.' });
    }
});

export default router;