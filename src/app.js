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
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET || 'mysecret', // khóa bí mật
  resave: false,   // không lưu session nếu không thay đổi
  saveUninitialized: false, // không lưu session mới nếu chưa gán dữ liệu
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 ngày
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

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

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

export default app;