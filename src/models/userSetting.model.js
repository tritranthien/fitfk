// models/userSetting.model.js
import mongoose from 'mongoose';

const userSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cronEnabled: { type: Boolean, default: false },
  cronTime: { type: Number, default: 1 },
  cronUnit: { type: String, enum: ['minutes','hours','days'], default: 'hours' },
  stepIncrement: { type: Number, default: 1000 },
  allowedStartTime: { type: String, default: '06:00' },
  allowedEndTime: { type: String, default: '22:00' },
  randomStepsEnabled: { type: Boolean, default: false },
  stepMin: { type: Number, default: 200 },
  stepMax: { type: Number, default: 500 }
});



export const UserSetting = mongoose.model('UserSetting', userSettingSchema);
