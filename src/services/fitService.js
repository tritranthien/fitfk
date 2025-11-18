// src/services/fitService.js
import { google } from 'googleapis';
import Token from '../models/token.model.js';

const DATA_STREAM_NAME = 'stepup_simulator';
const APP_NAME = 'StepUp Simulator';

/**
 * Tạo hoặc lấy DataSource từ Google Fit
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @param {string} dbUserId - MongoDB user ID (for database storage)
 */
export async function ensureDataSource(auth, dbUserId) {
  const fitness = google.fitness({ version: 'v1', auth });
  
  // Always use "me" for Google Fit API
  const fitUserId = "me";

  try {
    // Thử tạo DataSource mới
    const res = await fitness.users.dataSources.create({
      userId: fitUserId,
      requestBody: {
        dataStreamName: DATA_STREAM_NAME,
        type: 'raw',
        application: { name: APP_NAME },
        dataType: { name: 'com.google.step_count.delta' },
      },
    });

    const dataSourceId = res.data.dataStreamId;
    console.log(`✅ Created new DataSource: ${dataSourceId}`);

    // Lưu vào DB using MongoDB userId
    await Token.findOneAndUpdate({ userId: dbUserId }, { dataSourceId }, { new: true });
    return dataSourceId;

  } catch (err) {
    if (err.code === 409) {
      // DataSource đã tồn tại, lấy từ Google Fit
      console.log(`ℹ️ DataSource already exists, fetching...`);
      
      const existingSources = await fitness.users.dataSources.list({ userId: fitUserId });
      const existing = existingSources.data.dataSource?.find(
        ds => ds.dataType.name === 'com.google.step_count.delta' 
           && ds.dataStreamName === DATA_STREAM_NAME
      );

      if (!existing) {
        throw new Error(`Cannot find existing DataSource`);
      }

      const dataSourceId = existing.dataStreamId;
      console.log(`✅ Found existing DataSource: ${dataSourceId}`);

      // Lưu vào DB using MongoDB userId
      await Token.findOneAndUpdate({ userId: dbUserId }, { dataSourceId }, { new: true });
      return dataSourceId;
    }
    throw err;
  }
}

/**
 * Lấy dataSourceId từ DB hoặc tạo mới nếu chưa có
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @param {string} dbUserId - MongoDB user ID
 */
export async function getDataSourceId(auth, dbUserId) {
  const tokenDoc = await Token.findOne({ userId: dbUserId });
  
  if (tokenDoc?.dataSourceId) {
    return tokenDoc.dataSourceId;
  }

  // Chưa có trong DB, tạo mới
  return await ensureDataSource(auth, dbUserId);
}

/**
 * Thêm bước vào Google Fit theo thời gian thực
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @param {string} dbUserId - MongoDB user ID
 * @param {number} steps - Number of steps to add
 */
export async function insertSteps(auth, dbUserId, steps = 1000) {
  const fitness = google.fitness({ version: 'v1', auth });
  const dataSourceId = await getDataSourceId(auth, dbUserId);
  
  // Always use "me" for Google Fit API
  const fitUserId = "me";

  const now = Date.now();
  
  // Thêm steps vào 30 giây - 2 phút trước (an toàn với Google Fit)
  const endTime = now - (30 * 1000); // 30 giây trước
  const startTime = endTime - (60 * 1000); // 1 phút hoạt động

  const startTimeNs = BigInt(startTime) * 1000000n;
  const endTimeNs = BigInt(endTime) * 1000000n;
  const datasetId = `${startTimeNs}-${endTimeNs}`;

  const body = {
    dataSourceId,
    minStartTimeNs: startTimeNs.toString(),
    maxEndTimeNs: endTimeNs.toString(),
    point: [
      {
        dataTypeName: 'com.google.step_count.delta',
        startTimeNanos: startTimeNs.toString(),
        endTimeNanos: endTimeNs.toString(),
        value: [{ intVal: steps }],
      },
    ],
  };

  try {
    const response = await fitness.users.dataSources.datasets.patch({
      userId: fitUserId,
      dataSourceId,
      datasetId,
      requestBody: body,
    });

    console.log(`✅ Added ${steps} steps at ${new Date(endTime).toLocaleString()}`);
    return response.data;
  } catch (err) {
    console.error(`❌ Failed to add steps:`, err.message);
    throw err;
  }
}

/**
 * Giả lập đi bộ tự nhiên trong ngày
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @param {string} dbUserId - MongoDB user ID
 * @param {number} totalSteps - Total steps to distribute throughout the day
 */
export async function simulateNaturalSteps(auth, dbUserId, totalSteps = 10000) {
  const hoursToDistribute = [
    { hour: 7, ratio: 0.05 },  // 5% - Sáng sớm
    { hour: 8, ratio: 0.10 },  // 10% - Đi làm
    { hour: 12, ratio: 0.15 }, // 15% - Trưa
    { hour: 14, ratio: 0.10 }, // 10% - Chiều
    { hour: 17, ratio: 0.20 }, // 20% - Tan làm
    { hour: 19, ratio: 0.25 }, // 25% - Tối
    { hour: 21, ratio: 0.15 }, // 15% - Tối muộn
  ];

  const fitness = google.fitness({ version: 'v1', auth });
  const dataSourceId = await getDataSourceId(auth, dbUserId);
  
  // Always use "me" for Google Fit API
  const fitUserId = "me";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const slot of hoursToDistribute) {
    const steps = Math.floor(totalSteps * slot.ratio);
    const slotTime = new Date(today);
    slotTime.setHours(slot.hour);

    const startTime = slotTime.getTime();
    const endTime = startTime + (30 * 60 * 1000); // 30 phút

    const startTimeNs = BigInt(startTime) * 1000000n;
    const endTimeNs = BigInt(endTime) * 1000000n;
    const datasetId = `${startTimeNs}-${endTimeNs}`;

    const body = {
      dataSourceId,
      minStartTimeNs: startTimeNs.toString(),
      maxEndTimeNs: endTimeNs.toString(),
      point: [
        {
          dataTypeName: 'com.google.step_count.delta',
          startTimeNanos: startTimeNs.toString(),
          endTimeNanos: endTimeNs.toString(),
          value: [{ intVal: steps }],
        },
      ],
    };

    try {
      await fitness.users.dataSources.datasets.patch({
        userId: fitUserId,
        dataSourceId,
        datasetId,
        requestBody: body,
      });
      console.log(`✅ Added ${steps} steps at ${slot.hour}:00`);
      
      // Delay nhỏ để tránh rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`❌ Failed at hour ${slot.hour}:`, err.message);
    }
  }

  console.log(`✅ Completed natural simulation: ${totalSteps} total steps`);
}