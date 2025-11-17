// index.js
import 'dotenv/config';

// ✅ Debug: In ra tất cả biến môi trường
console.log('========== ENVIRONMENT VARIABLES ==========');
console.log('CLIENT_ID:', process.env.CLIENT_ID);
console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET);
console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('PORT:', process.env.PORT);
console.log('==========================================');

import app from "./src/app.js";
import { startAddStepsCron } from "./src/cron/addStepsCron.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  startAddStepsCron();
});