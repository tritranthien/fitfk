import express from 'express';
import { ensureAuthWithGoogle } from "../midlewares/requireAuth.js";
import { UserSetting } from "../models/userSetting.model.js";
import { startCronForUser, stopCronForUser } from '../cron/addStepsCron.js';
const router = express.Router();
router.post('/', ensureAuthWithGoogle, async (req, res) => {
  const {
    cronEnabled,
    cronTime, cronUnit,   // thêm
    stepIncrement, randomStepsEnabled, stepMin, stepMax,
    randomIntervalEnabled, intervalMin, intervalMax,
    allowedStartTime, allowedEndTime
  } = req.body;

  const setting = await UserSetting.findOneAndUpdate(
    { userId: req.session.userId },
    {
      cronEnabled: !!cronEnabled,
      cronTime: Number(cronTime),           // parse Number
      cronUnit: String(cronUnit).toLowerCase(), // convert lowercase
      stepIncrement: Number(stepIncrement),
      randomStepsEnabled: !!randomStepsEnabled,
      stepMin: Number(stepMin),
      stepMax: Number(stepMax),
      randomIntervalEnabled: !!randomIntervalEnabled,
      intervalMin: Number(intervalMin),
      intervalMax: Number(intervalMax),
      allowedStartTime,
      allowedEndTime
    },
    { upsert: true, new: true }
  );
  if (setting.cronEnabled) {
    await startCronForUser(req.session.userId);
  } else {
    stopCronForUser(req.session.userId);
  }
  res.redirect('/');
});


export default router;

