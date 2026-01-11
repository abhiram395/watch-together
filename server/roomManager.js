// Room Manager - Handles room creation, joining, and state management
class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.MAX_PARTICIPANTS = 20;
  }

  // Generate unique room code
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  // Create a new room
  createRoom(hostSocketId, hostNickname = 'Host') {
    const roomCode = this.generateRoomCode();
    const room = {
      roomCode,
      hostSocketId,
      participants: new Map([[hostSocketId, { socketId: hostSocketId, nickname: hostNickname, isHost: true }]]),
      controlMode: 'host-only', // 'host-only' or 'shared'
      playbackState: {
        playbackTime: 0,
        isPlaying: false,
        lastUpdateTimestamp: Date.now(),
        playbackRate: 1.0
      },
      createdAt: Date.now()
    };
    
    this.rooms.set(roomCode, room);
    return { success: true, roomCode, room };
  }

  // Join an existing room
  joinRoom(roomCode, socketId, nickname = 'Guest') {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    if (room.participants.size >= this.MAX_PARTICIPANTS) {
      return { success: false, error: 'Room is full' };
    }
    
    room.participants.set(socketId, {
      socketId,
      nickname,
      isHost: false
    });
    
    return { success: true, room };
  }

  // Leave a room
  leaveRoom(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    room.participants.delete(socketId);
    
    // If host leaves, assign new host or delete room
    if (socketId === room.hostSocketId) {
      if (room.participants.size > 0) {
        // Assign first participant as new host
        const newHost = Array.from(room.participants.values())[0];
        newHost.isHost = true;
        room.hostSocketId = newHost.socketId;
      } else {
        // Delete empty room
        this.rooms.delete(roomCode);
        return { success: true, roomDeleted: true };
      }
    }
    
    return { success: true, room };
  }

  // Get room by code
  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  // Get room by socket ID
  getRoomBySocketId(socketId) {
    for (const [roomCode, room] of this.rooms.entries()) {
      if (room.participants.has(socketId)) {
        return { roomCode, room };
      }
    }
    return null;
  }

  // Update playback state
  updatePlaybackState(roomCode, playbackState) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.playbackState = {
        ...room.playbackState,
        ...playbackState,
        lastUpdateTimestamp: Date.now()
      };
      return { success: true, playbackState: room.playbackState };
    }
    return { success: false, error: 'Room not found' };
  }

  // Change control mode
  changeControlMode(roomCode, mode) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.controlMode = mode;
      return { success: true, controlMode: mode };
    }
    return { success: false, error: 'Room not found' };
  }

  // Get participant list
  getParticipants(roomCode) {
    const room = this.rooms.get(roomCode);
    if (room) {
      return Array.from(room.participants.values());
    }
    return [];
  }

  // Check if user can control playback
  canControl(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    
    if (room.controlMode === 'host-only') {
      return socketId === room.hostSocketId;
    }
    
    // Shared mode - everyone can control
    return true;
  }
}

module.exports = RoomManager;
