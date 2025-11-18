import { getOAuthClient } from "../utils/oauth.util.js";

export async function ensureAuthWithGoogle(req, res, next) {
  // 1️⃣ Kiểm tra session
  if (!req.session?.userId) {
    return res.redirect('/login'); // user chưa login → redirect
  }

  try {
    // 2️⃣ Kiểm tra token Google
    const oauth2Client = await getOAuthClient(req.session.userId);
    req.googleAuth = oauth2Client; // attach client để route dùng
    next();
  } catch (err) {
    console.error('Invalid or expired Google token', err);
    // token hết hạn hoặc refresh fail → redirect login
    return res.redirect('/login');
  }
}
