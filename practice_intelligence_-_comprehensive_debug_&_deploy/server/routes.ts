import { Router } from 'express';
import documentRoutesFix from './document-routes-fix.js';
import { dbWrapper } from './db-wrapper.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount the fixed document routes
router.use('/documents', documentRoutesFix);

// Example route to get clients for a therapist
router.get('/therapists/:therapistId/clients', async (req, res) => {
    const { therapistId } = req.params;
    try {
        const clients = await dbWrapper.query(
            'SELECT * FROM clients WHERE id IN (SELECT client_id FROM therapist_client_relations WHERE therapist_id = ?)',
            [therapistId]
        );
        res.json(clients);
    } catch (err) {
        console.error(`Error fetching clients for therapist ${therapistId}:`, err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;