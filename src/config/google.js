import { google } from "googleapis";
import Token from "../models/token.model.js";
// import { createDataSource } from "../services/fitService.js";

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/fitness.activity.write',
  'https://www.googleapis.com/auth/fitness.activity.read'
];

export async function authorize(userId, codeOrCallback) {
  const oAuth2 = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  let tokenDoc = await Token.findOne({ userId });

  if (tokenDoc) {
    oAuth2.setCredentials({
      access_token: tokenDoc.accessToken,
      refresh_token: tokenDoc.refreshToken,
      expiry_date: tokenDoc.expiryDate
    });

    oAuth2.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        await Token.findOneAndUpdate({ userId }, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || tokenDoc.refreshToken,
          expiryDate: tokens.expiry_date || tokenDoc.expiryDate
        }, { new: true });
        console.log(`Token refreshed for user ${userId}`);
      }
    });

    // Tạo DataSource nếu chưa có
    if (!tokenDoc.dataSourceId) {
      await createDataSource(oAuth2, userId);
    }

    if (typeof codeOrCallback === "function") {
      return codeOrCallback(oAuth2);
    }

    return oAuth2;
  }

  if (!codeOrCallback) throw new Error("No token found and no code provided");

  const { tokens } = await oAuth2.getToken(codeOrCallback);
  oAuth2.setCredentials(tokens);

  tokenDoc = await Token.findOneAndUpdate(
    { userId },
    {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
    },
    { upsert: true, new: true }
  );

  console.log(`Token saved for user ${userId}`);

  // Tạo DataSource lần đầu
  await createDataSource(oAuth2, userId);

  if (typeof codeOrCallback === "function") {
    return codeOrCallback(oAuth2);
  }

  return oAuth2;
}
