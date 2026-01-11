// Socket.IO event handlers
const setupSocketHandlers = (io, roomManager, syncEngine, controlModeManager) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Room creation
    socket.on('room:create', ({ nickname }) => {
      const result = roomManager.createRoom(socket.id, nickname);
      
      if (result.success) {
        socket.join(result.roomCode);
        socket.emit('room:created', {
          roomCode: result.roomCode,
          isHost: true,
          participant: { socketId: socket.id, nickname, isHost: true }
        });
        
        // Start sync engine for this room
        syncEngine.startSync(result.roomCode, io);
        
        console.log(`Room ${result.roomCode} created by ${socket.id}`);
      } else {
        socket.emit('room:error', { error: result.error });
      }
    });

    // Room joining
    socket.on('room:join', ({ roomCode, nickname }) => {
      const result = roomManager.joinRoom(roomCode, socket.id, nickname);
      
      if (result.success) {
        socket.join(roomCode);
        
        const room = result.room;
        const participant = room.participants.get(socket.id);
        
        // Send room info to the joining user
        socket.emit('room:joined', {
          roomCode,
          isHost: false,
          participant,
          playbackState: room.playbackState,
          controlMode: room.controlMode
        });
        
        // Broadcast updated participant list to all in room
        const participants = Array.from(room.participants.values());
        io.to(roomCode).emit('room:participants', { participants });
        
        // Notify others about new participant
        socket.to(roomCode).emit('room:user-joined', {
          participant,
          message: `${nickname} joined the room`
        });
        
        console.log(`${socket.id} (${nickname}) joined room ${roomCode}`);
      } else {
        socket.emit('room:error', { error: result.error });
      }
    });

    // Room leaving
    socket.on('room:leave', () => {
      handleLeaveRoom(socket);
    });

    // WebRTC Signaling - Offer
    socket.on('signal:offer', ({ targetSocketId, offer, roomCode }) => {
      socket.to(targetSocketId).emit('signal:offer', {
        fromSocketId: socket.id,
        offer,
        roomCode
      });
    });

    // WebRTC Signaling - Answer
    socket.on('signal:answer', ({ targetSocketId, answer, roomCode }) => {
      socket.to(targetSocketId).emit('signal:answer', {
        fromSocketId: socket.id,
        answer,
        roomCode
      });
    });

    // WebRTC Signaling - ICE Candidate
    socket.on('signal:ice', ({ targetSocketId, candidate, roomCode }) => {
      socket.to(targetSocketId).emit('signal:ice', {
        fromSocketId: socket.id,
        candidate,
        roomCode
      });
    });

    // Playback control - Play
    socket.on('playback:play', ({ roomCode, playbackTime }) => {
      const result = syncEngine.handlePlaybackControl(roomCode, socket.id, 'play', { playbackTime });
      
      if (result.success) {
        io.to(roomCode).emit('playback:play', {
          playbackTime: result.playbackState.playbackTime,
          timestamp: Date.now()
        });
      } else {
        socket.emit('playback:error', { error: result.error });
      }
    });

    // Playback control - Pause
    socket.on('playback:pause', ({ roomCode, playbackTime }) => {
      const result = syncEngine.handlePlaybackControl(roomCode, socket.id, 'pause', { playbackTime });
      
      if (result.success) {
        io.to(roomCode).emit('playback:pause', {
          playbackTime: result.playbackState.playbackTime,
          timestamp: Date.now()
        });
      } else {
        socket.emit('playback:error', { error: result.error });
      }
    });

    // Playback control - Seek
    socket.on('playback:seek', ({ roomCode, playbackTime }) => {
      const result = syncEngine.handlePlaybackControl(roomCode, socket.id, 'seek', { playbackTime });
      
      if (result.success) {
        io.to(roomCode).emit('playback:seek', {
          playbackTime: result.playbackState.playbackTime,
          timestamp: Date.now()
        });
      } else {
        socket.emit('playback:error', { error: result.error });
      }
    });

    // Control mode change
    socket.on('mode:change', ({ roomCode, mode }) => {
      const result = controlModeManager.changeMode(roomCode, socket.id, mode);
      
      if (result.success) {
        io.to(roomCode).emit('mode:changed', {
          controlMode: result.controlMode,
          message: result.message
        });
      } else {
        socket.emit('mode:error', { error: result.error });
      }
    });

    // Chat message
    socket.on('chat:message', ({ roomCode, message }) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      
      if (roomData && roomData.roomCode === roomCode) {
        const room = roomData.room;
        const participant = room.participants.get(socket.id);
        
        io.to(roomCode).emit('chat:message', {
          from: participant.nickname,
          message,
          timestamp: Date.now(),
          socketId: socket.id
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      handleLeaveRoom(socket);
      console.log(`Client disconnected: ${socket.id}`);
    });

    // Helper function to handle leaving room
    function handleLeaveRoom(socket) {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      
      if (roomData) {
        const { roomCode, room } = roomData;
        const participant = room.participants.get(socket.id);
        const nickname = participant ? participant.nickname : 'User';
        
        const result = roomManager.leaveRoom(roomCode, socket.id);
        
        if (result.success) {
          socket.leave(roomCode);
          
          if (result.roomDeleted) {
            // Room was deleted, stop sync
            syncEngine.stopSync(roomCode);
            console.log(`Room ${roomCode} deleted`);
          } else {
            // Update participants list
            const participants = Array.from(result.room.participants.values());
            io.to(roomCode).emit('room:participants', { participants });
            
            // Notify others
            socket.to(roomCode).emit('room:user-left', {
              socketId: socket.id,
              nickname,
              message: `${nickname} left the room`
            });
          }
        }
      }
    }
  });
};

module.exports = setupSocketHandlers;
