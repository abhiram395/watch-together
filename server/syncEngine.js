// Sync Engine - Handles playback synchronization logic
class SyncEngine {
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.syncInterval = 100; // Broadcast sync every 100ms
    this.intervals = new Map();
  }

  // Start sync broadcasting for a room
  startSync(roomCode, io) {
    if (this.intervals.has(roomCode)) {
      return; // Already running
    }

    const interval = setInterval(() => {
      const room = this.roomManager.getRoom(roomCode);
      if (!room) {
        this.stopSync(roomCode);
        return;
      }

      // Calculate current playback time based on last update
      const currentPlaybackState = this.calculateCurrentPlaybackState(room.playbackState);
      
      // Broadcast sync packet to all participants
      io.to(roomCode).emit('playback:sync', {
        playbackTime: currentPlaybackState.playbackTime,
        isPlaying: currentPlaybackState.isPlaying,
        playbackRate: currentPlaybackState.playbackRate,
        timestamp: Date.now()
      });
    }, this.syncInterval);

    this.intervals.set(roomCode, interval);
  }

  // Stop sync broadcasting for a room
  stopSync(roomCode) {
    const interval = this.intervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(roomCode);
    }
  }

  // Calculate current playback time considering elapsed time
  calculateCurrentPlaybackState(playbackState) {
    if (!playbackState.isPlaying) {
      return playbackState;
    }

    const elapsed = (Date.now() - playbackState.lastUpdateTimestamp) / 1000; // Convert to seconds
    const currentTime = playbackState.playbackTime + (elapsed * playbackState.playbackRate);

    return {
      ...playbackState,
      playbackTime: currentTime
    };
  }

  // Calculate drift between client and server
  calculateDrift(clientTime, serverTime) {
    return Math.abs(clientTime - serverTime);
  }

  // Determine correction strategy based on drift
  getCorrectionStrategy(drift, clientTime, serverTime) {
    if (drift < 0.3) {
      // Small drift - use gradual playback rate adjustment
      const isClientAhead = clientTime > serverTime;
      return {
        type: 'gradual',
        adjustment: drift > 0.1 ? (isClientAhead ? 0.95 : 1.05) : 1.0
      };
    } else {
      // Large drift - hard seek
      return {
        type: 'seek'
      };
    }
  }

  // Handle playback control with conflict resolution
  handlePlaybackControl(roomCode, socketId, action, data) {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Check if user can control
    if (!this.roomManager.canControl(roomCode, socketId)) {
      return { success: false, error: 'No control permission' };
    }

    let newPlaybackState = { ...room.playbackState };

    switch (action) {
      case 'play':
        newPlaybackState.isPlaying = true;
        newPlaybackState.playbackTime = data.playbackTime || room.playbackState.playbackTime;
        break;
      
      case 'pause':
        newPlaybackState.isPlaying = false;
        newPlaybackState.playbackTime = data.playbackTime || room.playbackState.playbackTime;
        break;
      
      case 'seek':
        newPlaybackState.playbackTime = data.playbackTime;
        break;
      
      default:
        return { success: false, error: 'Invalid action' };
    }

    // Update room playback state
    this.roomManager.updatePlaybackState(roomCode, newPlaybackState);

    return {
      success: true,
      playbackState: newPlaybackState
    };
  }

  // Clean up when shutting down
  cleanup() {
    for (const [roomCode, interval] of this.intervals.entries()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}

module.exports = SyncEngine;
