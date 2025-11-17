// routes/oauth.route.js
import express from 'express';
import { getAuthUrl, saveToken, getOAuthClient } from '../utils/oauth.util.js';
import { ensureDataSource } from '../services/fitService.js';

const router = express.Router();

// Trang hiển thị nút auth
router.get('/', (req, res) => {
  const authUrl = getAuthUrl();
  console.log('🔗 Auth URL generated:', authUrl);
  res.render('oauth', { authUrl });
});

// Callback từ Google
router.get('/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    console.log('📥 Callback received');
    
    if (error) {
      return res.status(400).send(`OAuth Error: ${error}`);
    }

    if (!code) {
      return res.status(400).send('Authorization code not found');
    }

    // Lưu token
    const userId = req.session?.userId || 'default-user';
    await saveToken(userId, code);
    
    // Tạo DataSource ngay sau khi OAuth thành công
    const auth = await getOAuthClient(userId);
    await ensureDataSource(auth, userId);
    
    console.log('✅ OAuth & DataSource setup completed');
    res.redirect('/success');
    
  } catch (error) {
    console.error('❌ Callback error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

export default router;