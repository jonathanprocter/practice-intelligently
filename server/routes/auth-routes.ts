
import express from 'express';

const router = express.Router();

// Verify authentication endpoint
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader === 'Bearer primary-therapist-token') {
    res.json({
      valid: true,
      user: {
        id: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
        email: 'therapist@practice.com',
        name: 'Primary Therapist',
        role: 'therapist'
      }
    });
  } else {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Login endpoint (for single-user setup)
router.post('/login', (req, res) => {
  // In single-user setup, any login attempt succeeds
  res.json({
    therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
    user: {
      id: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
      email: 'therapist@practice.com',
      name: 'Primary Therapist',
      role: 'therapist'
    },
    token: 'primary-therapist-token'
  });
});

export default router;
