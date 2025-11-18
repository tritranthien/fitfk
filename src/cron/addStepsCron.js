// src/cron/addSteps.cron.js
import cron from 'node-cron';
import { io } from '../app.js'; // import socket.io
import Token from '../models/token.model.js';
import { UserSetting } from '../models/userSetting.model.js';
import { insertSteps } from '../services/fitService.js';
import { getOAuthClient } from '../utils/oauth.util.js';

function isWithinAllowedTime(startTime, endTime) {
  const now = new Date();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startDate = new Date();
  startDate.setHours(startH, startM, 0, 0);

  const endDate = new Date();
  endDate.setHours(endH, endM, 0, 0);

  return now >= startDate && now <= endDate;
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

function emitLog(userId, type, msg) {
  const time = new Date().toLocaleTimeString();
  io.emit('cron-log', { userId, type, time, msg });
  console.log(`[${time}] [${userId}] ${msg}`);
}

export async function startAddStepsCron() {
  try {
    const users = await Token.find();

    for (const user of users) {
      const setting = await UserSetting.findOne({ userId: user.userId });
      if (!setting || !setting.cronEnabled) continue;

      const cronExp = getCronExpression(setting.cronTime, setting.cronUnit);

      cron.schedule(cronExp, async () => {
        if (!isWithinAllowedTime(setting.allowedStartTime, setting.allowedEndTime)) {
          emitLog(user.userId, 'warning', '⏰ Ngoài giờ chạy, bỏ qua...');
          return;
        }

        try {
          const auth = await getOAuthClient(user.userId);
          let steps;
          if (setting.randomStepsEnabled) {
            steps = Math.floor(Math.random() * (setting.stepMax - setting.stepMin + 1)) + setting.stepMin;
          } else {
            steps = setting.stepIncrement;
          }

          await insertSteps(auth, user.userId, steps);
          emitLog(user.userId, 'success', `✅ Đã thêm ${steps} bước`);
        } catch (err) {
          emitLog(user.userId, 'error', `❌ Lỗi: ${err.message}`);
        }
      });

      emitLog(user.userId, 'info', `✅ Cron đã lên lịch: ${cronExp}`);
    }
  } catch (err) {
    emitLog('SYSTEM', 'error', `❌ Cron khởi tạo lỗi: ${err.message}`);
  }
}
