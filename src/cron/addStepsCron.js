// src/cron/addSteps.cron.js
import cron from 'node-cron';
import { io } from '../app.js';
import Token from '../models/token.model.js';
import { UserSetting } from '../models/userSetting.model.js';
import { CronLog } from '../models/cronLog.model.js';
import { insertSteps } from '../services/fitService.js';
import { getOAuthClient } from '../utils/oauth.util.js';

// Lưu trữ các cron task đang chạy
const activeCronJobs = new Map();

function isWithinAllowedTime(startTime, endTime) {
  const now = new Date();
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const currentMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Xử lý trường hợp qua nửa đêm (VD: 22:00 - 02:00)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  
  // Trường hợp bình thường (VD: 06:00 - 23:00)
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function getCronExpression(cronTime, cronUnit) {
  switch (cronUnit) {
    case 'minutes':
      return `*/${cronTime} * * * *`;
    case 'hours':
      return `0 */${cronTime} * * *`;
    case 'days':
      return `0 0 */${cronTime} * *`;
    default:
      return '*/5 * * * *';
  }
}

// Hàm emit log: vừa lưu DB vừa emit socket
async function emitLog(userId, type, msg) {
  const vnTime = new Date().toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Emit socket real-time
  io.emit('cron-log', { userId, type, time: vnTime, msg });
  
  // Log console
  console.log(`[${vnTime}] [${userId}] ${msg}`);
  
  // Lưu vào DB (không await để không block)
  CronLog.create({
    userId,
    type,
    message: msg
  }).catch(err => {
    console.error('Lỗi lưu log vào DB:', err.message);
  });
}

// Hàm stop cron job cho 1 user
export function stopCronForUser(userId) {
  const existingJob = activeCronJobs.get(userId);
  if (existingJob) {
    existingJob.stop();
    activeCronJobs.delete(userId);
    emitLog(userId, 'info', '🛑 Đã dừng cron job cũ');
  }
}

// Hàm start/restart cron job cho 1 user
export async function startCronForUser(userId) {
  try {
    // Dừng job cũ nếu có
    stopCronForUser(userId);

    const user = await Token.findOne({ userId });
    if (!user) {
      emitLog(userId, 'error', '❌ Không tìm thấy token');
      return;
    }

    const setting = await UserSetting.findOne({ userId });
    if (!setting || !setting.cronEnabled) {
      emitLog(userId, 'warning', '⚠️ Cron chưa được bật');
      return;
    }

    const cronExp = getCronExpression(setting.cronTime, setting.cronUnit);

    const task = cron.schedule(cronExp, async () => {
      try {
        // Lấy setting mới nhất mỗi lần chạy
        const currentSetting = await UserSetting.findOne({ userId });
        if (!currentSetting || !currentSetting.cronEnabled) {
          emitLog(userId, 'warning', '⚠️ Cron đã bị tắt');
          return;
        }

        // Kiểm tra khung giờ cho phép
        const allowedStart = currentSetting.allowedStartTime || '00:00';
        const allowedEnd = currentSetting.allowedEndTime || '23:59';
        
        if (!isWithinAllowedTime(allowedStart, allowedEnd)) {
          const vnTime = new Date().toLocaleString('vi-VN', { 
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          emitLog(userId, 'warning', `⏰ Ngoài khung giờ ${allowedStart}-${allowedEnd} (hiện tại: ${vnTime}), bỏ qua...`);
          return;
        }

        const auth = await getOAuthClient(userId);
        let steps;
        
        if (currentSetting.randomStepsEnabled) {
          const min = currentSetting.stepMin || 100;
          const max = currentSetting.stepMax || 1000;
          steps = Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
          steps = currentSetting.stepIncrement || 500;
        }

        await insertSteps(auth, userId, steps);
        emitLog(userId, 'success', `✅ Đã thêm ${steps} bước`);
      } catch (err) {
        emitLog(userId, 'error', `❌ Lỗi: ${err.message}`);
      }
    }, {
      timezone: 'Asia/Ho_Chi_Minh'
    });

    activeCronJobs.set(userId, task);
    
    const allowedStart = setting.allowedStartTime || '00:00';
    const allowedEnd = setting.allowedEndTime || '23:59';
    emitLog(userId, 'info', `✅ Cron: ${cronExp} | Khung giờ: ${allowedStart}-${allowedEnd} (UTC+7)`);
  } catch (err) {
    emitLog(userId, 'error', `❌ Lỗi khởi tạo cron: ${err.message}`);
  }
}

// Hàm khởi động tất cả cron jobs
export async function startAddStepsCron() {
  try {
    const users = await Token.find();

    for (const user of users) {
      await startCronForUser(user.userId);
    }
    
    emitLog('SYSTEM', 'info', `✅ Đã khởi tạo ${users.length} cron jobs (Asia/Ho_Chi_Minh)`);
  } catch (err) {
    emitLog('SYSTEM', 'error', `❌ Cron khởi tạo lỗi: ${err.message}`);
  }
}

// Hàm dừng tất cả cron jobs
export function stopAllCrons() {
  activeCronJobs.forEach((job, userId) => {
    job.stop();
    emitLog(userId, 'info', '🛑 Đã dừng cron job');
  });
  activeCronJobs.clear();
  emitLog('SYSTEM', 'info', '🛑 Đã dừng tất cả cron jobs');
}