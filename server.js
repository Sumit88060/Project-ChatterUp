import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { connectData } from "./db.config.js";
import { Message } from "./chatapp.schema.js";

/* =========================
   BASIC SETUP
========================= */
const app = express();
const PORT = process.env.PORT || 3000;

// required for ES modules (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static files
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   HOMEPAGE ROUTE (FIXES Cannot GET /)
========================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   UPLOADS SETUP
========================= */
const uploadsPath = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const name = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  }
});

const upload = multer({ storage });

app.post("/upload-avatar", upload.single("avatar"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

/* =========================
   SOCKET.IO SETUP
========================= */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let users = {};

io.on("connection", socket => {
  // load last 50 messages
  Message.find()
    .sort({ createdAt: 1 })
    .limit(50)
    .then(messages => socket.emit("load-messages", messages));

  socket.on("join", username => {
    users[socket.id] = username;

    io.emit("user-list", Object.values(users));

    socket.broadcast.emit("message", {
      username: "ChatterUp",
      message: `${username} joined the chat`,
      time: new Date().toLocaleTimeString(),
      profile: "/uploads/default.webp"
    });
  });

  socket.on("send-message", async data => {
    const msg = new Message({
      username: data.user,
      message: data.text,
      time: new Date().toLocaleTimeString(),
      profile: data.profile || "/uploads/default.webp"
    });

    await msg.save();
    io.emit("message", msg);
  });

  socket.on("typing", username => {
    socket.broadcast.emit("typing", username);
  });

  socket.on("disconnect", () => {
    const leftUser = users[socket.id];
    delete users[socket.id];

    io.emit("user-list", Object.values(users));

    if (leftUser) {
      io.emit("message", {
        username: "ChatterUp",
        message: `${leftUser} left the chat`,
        time: new Date().toLocaleTimeString(),
        profile: "/uploads/default.webp"
      });
    }
  });
});

/* =========================
   START SERVER SAFELY
========================= */
const startServer = async () => {
  try {
    await connectData();
    console.log("MongoDB connected");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
