// index.js
import 'dotenv/config';

import app from "./src/app.js";
import { startAddStepsCron } from "./src/cron/addStepsCron.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  startAddStepsCron();
});