// src/cron/addSteps.cron.js
import cron from 'node-cron';
import Token from '../models/token.model.js';
import { getOAuthClient } from '../utils/oauth.util.js';
import { insertSteps } from '../services/fitService.js';

export function startAddStepsCron() {
  // Chạy mỗi 5 phút (tự nhiên hơn)
  cron.schedule('*/1 * * * *', async () => {
    const currentHour = new Date().getHours();
    
    // Chỉ chạy trong giờ hợp lý (6h - 23h)
    // if (currentHour < 6 || currentHour > 23) {
    //   console.log('⏰ Outside active hours, skipping...');
    //   return;
    // }

    console.log('⏰ Cron running: add steps...');

    try {
      const users = await Token.find();

      for (const user of users) {
        try {
          const auth = await getOAuthClient(user.userId);
          
          // Random steps 200-500 mỗi 5 phút (tự nhiên hơn)
          const steps = Math.floor(Math.random() * 300) + 200;
          
          await insertSteps(auth, user.userId, steps);
          console.log(`✅ Added ${steps} steps for user ${user.userId}`);
          
          // Delay giữa các users
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(`❌ Error for user ${user.userId}:`, err.message);
        }
      }

    } catch (err) {
      console.error('❌ Cron job error:', err.message);
    }
  });

  console.log('✅ Cron job started: Add steps every 5 minutes');
}