// routes/oauth.route.js
import { google } from 'googleapis';
import { User } from '../models/user.model.js';
import Token from '../models/token.model.js';
import express from 'express';
import { ensureDataSource } from '../services/fitService.js';
import { getOAuthClient } from '../utils/oauth.util.js';

const router = express.Router();

// callback
router.get('/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.status(400).send(`OAuth Error: ${error}`);
    if (!code) return res.status(400).send('Authorization code not found');

    // 1️⃣ Lấy access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 2️⃣ Lấy profile user
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userInfoRes.json();
    console.log(profile, tokens, "tridey");
    
    // 3️⃣ Tạo hoặc update User
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
      });
    }

    // 4️⃣ Lưu token vào Token model, gắn userId
    await Token.findOneAndUpdate(
      { userId: user._id.toString() },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      },
      { upsert: true, new: true }
    );

    // 5️⃣ Lưu session
    req.session.userId = user._id;

    // 6️⃣ Khởi tạo Google Fit datasource
    // ✅ FIX: Use "me" instead of MongoDB _id
    const auth = await getOAuthClient(user._id.toString());
    await ensureDataSource(auth, "me");

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Lỗi logout:', err);
      return res.status(500).send('Không thể đăng xuất');
    }
    res.clearCookie('connect.sid'); // Xoá cookie session
    res.redirect('/login'); // Hoặc '/' nếu muốn về dashboard
  });
});

export default router;