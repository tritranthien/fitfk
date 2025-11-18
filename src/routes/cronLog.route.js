// src/routes/cronLog.route.js
import express from 'express';
import { getUserLogs, clearUserLogs, cleanupOldLogs } from '../controllers/cronLog.controller.js';

const router = express.Router();

// Lấy logs của user
router.get('/:userId', getUserLogs);

// Xóa tất cả logs của user
router.delete('/:userId', clearUserLogs);

// Admin: Xóa logs cũ (manual cleanup)
router.delete('/cleanup/old', cleanupOldLogs);

export default router;