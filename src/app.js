// src/app.js
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import expressLayouts from "express-ejs-layouts";
import StepRoutes from "./routes/stepsRoute.js";
import OAuthRoutes from "./routes/oauth.routes.js";
import SettingRoutes from "./routes/setting.route.js";
import { getAuthUrl } from "./utils/oauth.util.js";
import session from 'express-session';
import { ensureAuthWithGoogle } from "./midlewares/requireAuth.js";
import { User } from "./models/user.model.js";
import { UserSetting } from "./models/userSetting.model.js";
import { Server } from 'socket.io';
import { stopAllCrons } from "./cron/addStepsCron.js";
import cronLogRoutes from './routes/cronLog.route.js';
import MongoStore from 'connect-mongo';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET || 'mysecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600 // lazy session update (24 giờ)
  }),
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, // 1 ngày
    secure: process.env.NODE_ENV === 'production', // chỉ dùng HTTPS khi production
    httpOnly: true
  }
}));

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static & Views
app.use(express.static(path.join(__dirname, "../public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main"); // layout mặc định cho tất cả trừ login

// Routes
app.get('/', ensureAuthWithGoogle, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    let setting = await UserSetting.findOne({ userId: user._id });

    if (!setting) {
      setting = await UserSetting.create({ userId: user._id });
    }
    res.render('dashboard', { user, setting, title: "Dashboard" });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


// Login route với layout riêng
app.get("/login", (req, res) => {
  const authUrl = getAuthUrl();
  res.render("login", { layout: "layouts/auth", title: "đăng nhập", authUrl });
});

app.use("/steps", ensureAuthWithGoogle,StepRoutes);
app.use("/oauth",OAuthRoutes);
app.use("/settings", ensureAuthWithGoogle,SettingRoutes);
app.use('/api/cronlogs',cronLogRoutes);

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const httpServer = app.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT}`);
});

// Khởi tạo Socket.io
export const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('⚡ New client connected:', socket.id);
});
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping cron jobs...');
  stopAllCrons();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping cron jobs...');
  stopAllCrons();
  process.exit(0);
});
export default app;