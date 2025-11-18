// src/models/cronLog.model.js
import mongoose from 'mongoose';

const cronLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    // Tự động xóa sau 2 ngày (172800 giây)
    expires: 172800
  }
});

// Index compound để query nhanh hơn
cronLogSchema.index({ userId: 1, createdAt: -1 });

export const CronLog = mongoose.model('CronLog', cronLogSchema);