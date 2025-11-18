// routes/steps.route.js
import express from 'express';
import { getOAuthClient } from '../utils/oauth.util.js';
import { insertSteps, simulateNaturalSteps } from '../services/fitService.js';
import { io } from '../app.js';
import { ensureAuthWithGoogle } from '../midlewares/requireAuth.js';

const router = express.Router();

function emitLog(userId, type, msg) {
  const time = new Date().toLocaleTimeString();
  io.emit('cron-log', { userId, type, time, msg });
  console.log(`[${time}] [${userId}] ${msg}`);
}

// Thêm steps ngay lập tức (thủ công)
router.post('/add', ensureAuthWithGoogle, async (req, res) => {
  try {
    const userId = req.session.userId;
    let { steps } = req.body;

    steps = Number(steps);
    if (!steps || steps <= 0) {
      return res.status(400).json({ success: false, message: 'Số bước không hợp lệ' });
    }

    const auth = await getOAuthClient(userId);
    const result = await insertSteps(auth, userId, steps);

    emitLog(userId, 'success', `✅ Thêm thủ công ${steps} bước`);

    res.json({ success: true, message: `Added ${steps} steps`, data: result });
  } catch (error) {
    emitLog(req.session.userId, 'error', `❌ Lỗi add step thủ công: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Giả lập cả ngày
router.post('/simulate-day', ensureAuthWithGoogle, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { totalSteps = 10000 } = req.body;

    const auth = await getOAuthClient(userId);
    await simulateNaturalSteps(auth, userId, totalSteps);

    emitLog(userId, 'success', `✅ Giả lập ${totalSteps} bước trong ngày`);

    res.json({ success: true, message: `Simulated ${totalSteps} steps for the day` });
  } catch (error) {
    emitLog(req.session.userId, 'error', `❌ Lỗi simulate day: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Kiểm tra status
router.get('/status', ensureAuthWithGoogle, async (req, res) => {
  try {
    const userId = req.session.userId;
    await getOAuthClient(userId);

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
