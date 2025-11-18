// src/utils/oauth.util.js
import { google } from 'googleapis';
import Token from '../models/token.model.js';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/fitness.activity.write',
  'https://www.googleapis.com/auth/fitness.activity.read'
];

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI || 'http://localhost:3000/oauth/callback'
);

// Lắng nghe sự kiện refresh token
oauth2Client.on('tokens', async (tokens) => {
  if (tokens.refresh_token) {
    console.log('🔄 New refresh token received');
  }
  console.log('🔄 Access token refreshed');
  
  // Cập nhật token vào DB (cần userId - sẽ set qua context)
  if (oauth2Client._currentUserId) {
    await Token.findOneAndUpdate(
      { userId: oauth2Client._currentUserId },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date
      },
      { new: true }
    );
  }
});

// Lấy URL auth
export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

// Lấy token và lưu vào DB
export async function saveToken(userId, code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    await Token.findOneAndUpdate(
      { userId },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Token saved for user ${userId}`);
    return tokens;
  } catch (error) {
    console.error('❌ OAuth Error:', error.message);
    throw new Error(`Failed to get token: ${error.message}`);
  }
}

// Lấy OAuth client đã set token từ DB
export async function getOAuthClient(userId) {
  const token = await Token.findOne({ userId });
  if (!token) {
    throw new Error(`No token found for user ${userId}`);
  }

  // Tạo OAuth client mới cho mỗi user
  const client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiryDate
  });

  // Lưu userId để dùng khi refresh token
  client._currentUserId = userId;

  // Lắng nghe sự kiện refresh token cho client này
  client.on('tokens', async (tokens) => {
    console.log(`🔄 Token refreshed for user ${userId}`);
    await Token.findOneAndUpdate(
      { userId },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || token.refreshToken,
        expiryDate: tokens.expiry_date
      },
      { new: true }
    );
  });

  return client;
}