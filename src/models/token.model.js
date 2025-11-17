// src/models/token.model.js
import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  expiryDate: { type: Date }
});

export default mongoose.model('Token', tokenSchema);
