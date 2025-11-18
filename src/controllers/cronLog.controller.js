// src/controllers/cronLog.controller.js
import { CronLog } from '../models/cronLog.model.js';

// Lấy logs của user (có phân trang)
export const getUserLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const logs = await CronLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await CronLog.countDocuments({ userId });

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Xóa tất cả logs của user
export const clearUserLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    await CronLog.deleteMany({ userId });
    res.json({ message: 'Đã xóa tất cả logs' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Xóa logs cũ hơn N ngày (dùng cho manual cleanup)
export const cleanupOldLogs = async (req, res) => {
  try {
    const { days = 2 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await CronLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    res.json({ 
      message: `Đã xóa ${result.deletedCount} logs cũ hơn ${days} ngày` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};