// routes/steps.route.js hoặc stepsRoute.js
import express from 'express';
import { getOAuthClient } from '../utils/oauth.util.js';
import { insertSteps, simulateNaturalSteps } from '../services/fitService.js';

const router = express.Router();

// Thêm steps ngay lập tức
router.post('/add', async (req, res) => {
  try {
    const { userId = 'default-user', steps = 1000 } = req.body;
    
    const auth = await getOAuthClient(userId);
    const result = await insertSteps(auth, userId, steps);
    
    res.json({ success: true, message: `Added ${steps} steps`, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Giả lập cả ngày
router.post('/simulate-day', async (req, res) => {
  try {
    const { userId = 'default-user', totalSteps = 10000 } = req.body;
    
    const auth = await getOAuthClient(userId);
    await simulateNaturalSteps(auth, userId, totalSteps);
    
    res.json({ success: true, message: `Simulated ${totalSteps} steps for the day` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Kiểm tra status - Tách thành 2 routes
router.get('/status', async (req, res) => {
  try {
    const userId = 'default-user';
    const auth = await getOAuthClient(userId);
    
    res.json({ 
      success: true, 
      userId,
      message: 'Connected to Google Fit',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/status/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const auth = await getOAuthClient(userId);
    
    res.json({ 
      success: true, 
      userId,
      message: 'Connected to Google Fit',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;