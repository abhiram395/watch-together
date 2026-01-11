// Main server file
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const RoomManager = require('./roomManager');
const SyncEngine = require('./syncEngine');
const ControlModeManager = require('./controlMode');
const setupSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors());
app.use(express.json());

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize managers
const roomManager = new RoomManager();
const syncEngine = new SyncEngine(roomManager);
const controlModeManager = new ControlModeManager(roomManager);

// Setup Socket.IO handlers
setupSocketHandlers(io, roomManager, syncEngine, controlModeManager);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Get room info endpoint
app.get('/api/room/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const room = roomManager.getRoom(roomCode);
  
  if (room) {
    res.json({
      exists: true,
      participantCount: room.participants.size,
      maxParticipants: roomManager.MAX_PARTICIPANTS,
      isFull: room.participants.size >= roomManager.MAX_PARTICIPANTS
    });
  } else {
    res.json({ exists: false });
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Watch-Together server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🎬 Ready to stream!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  syncEngine.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  syncEngine.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
