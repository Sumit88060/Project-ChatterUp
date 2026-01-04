import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { connectData } from './db.config.js';
import { Message } from './chatapp.schema.js';

const PORT = process.env.PORT || 3000;
const app = express();

let userAvatars = {};
let users = {};

app.use(cors());
app.use(express.static('public'));

// ensure uploads folder exists
if (!fs.existsSync('./public/uploads')) {
  fs.mkdirSync('./public/uploads', { recursive: true });
}

const storage = multer.diskStorage({
  destination: './public/uploads',
  filename: (req, file, cb) => {
    const name = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

app.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  return res.json({ imageUrl });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', socket => {
  Message.find().sort({ createdAt: 1 }).limit(50)
    .then(messages => socket.emit('load-messages', messages));

  socket.on('join', username => {
    const profile = userAvatars[username] || '/uploads/default.webp';
    users[socket.id] = { username, profile };

    io.emit('user-list', Object.values(users).map(u => u.username));
    socket.broadcast.emit('message', {
      username: 'coding ninjas',
      message: `${username} joined the chat`,
      time: new Date().toLocaleTimeString(),
      profile
    });
  });

  socket.on('send-message', async data => {
    const msg = new Message({
      username: data.user,
      message: data.text,
      time: new Date().toLocaleTimeString(),
      profile: data.profile || '/uploads/default.webp'
    });
    await msg.save();
    io.emit('message', msg);
  });

  socket.on('typing', username => {
    socket.broadcast.emit('typing', username);
  });

  socket.on('disconnect', () => {
    const left = users[socket.id]?.username;
    delete users[socket.id];
    io.emit('user-list', Object.values(users).map(u => u.username));
    if (left) {
      io.emit('message', {
        username: 'coding ninjas',
        message: `${left} left the chat`,
        time: new Date().toLocaleTimeString(),
        profile: '/uploads/default.webp'
      });
    }
  });
});

connectData();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
