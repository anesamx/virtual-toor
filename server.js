const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const dataFilePath = path.join(__dirname, 'data.json');

// Read data
app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(dataFilePath)) {
      // Default initial data
      const defaultData = {
        images: [],
        scenarios: []
      };
      fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2));
      return res.json(defaultData);
    }
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Write data
app.post('/api/data', (req, res) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write data' });
  }
});

// Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Socket.io Real-Time Communications
const viewers = {}; // socketId -> { id, socketId, rotation, activeScenarioId }
const admins = new Set(); // socketId

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join', (data) => {
    if (data.role === 'admin') {
      admins.add(socket.id);
      console.log(`Admin joined: ${socket.id}`);
      // Send current state of viewers to newly joined admin
      socket.emit('viewer-list', Object.values(viewers));
    } else if (data.role === 'viewer') {
      viewers[socket.id] = {
        id: `Viewer-${socket.id.substring(0, 4)}`,
        socketId: socket.id,
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        activeScenarioId: data.activeScenarioId || null
      };
      console.log(`Viewer joined: ${socket.id} as ${viewers[socket.id].id}`);
      // Broadcast updated list to all admins
      io.to(Array.from(admins)).emit('viewer-list', Object.values(viewers));
    }
  });

  socket.on('admin-select-scenario', (scenarioId) => {
    console.log(`Admin selected scenario: ${scenarioId}`);
    // Update active scenario for all viewers
    for (let sid in viewers) {
      viewers[sid].activeScenarioId = scenarioId;
    }
    // Broadcast to all viewers
    socket.broadcast.emit('server-change-scenario', scenarioId);
    // Broadcast updated viewer list to admins to reflect scenario change
    io.to(Array.from(admins)).emit('viewer-list', Object.values(viewers));
  });

  socket.on('viewer-gaze-update', (data) => {
    if (viewers[socket.id]) {
      viewers[socket.id].rotation = data.rotation;
      // Forward this specific viewer's gaze update to all admins
      io.to(Array.from(admins)).emit('server-viewer-gaze', {
        socketId: socket.id,
        rotation: data.rotation
      });
    }
  });

  socket.on('viewer-scene-change', (data) => {
    if (viewers[socket.id]) {
      viewers[socket.id].activeScenarioId = data.activeScenarioId;
      // Broadcast updated list to all admins
      io.to(Array.from(admins)).emit('viewer-list', Object.values(viewers));
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (admins.has(socket.id)) {
      admins.delete(socket.id);
    } else if (viewers[socket.id]) {
      delete viewers[socket.id];
      // Broadcast updated list to all admins
      io.to(Array.from(admins)).emit('viewer-list', Object.values(viewers));
    }
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
