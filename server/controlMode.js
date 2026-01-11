// Control Mode Manager - Handles playback control mode logic
class ControlModeManager {
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.MODES = {
      HOST_ONLY: 'host-only',
      SHARED: 'shared'
    };
  }

  // Change control mode (only host can do this)
  changeMode(roomCode, socketId, newMode) {
    const room = this.roomManager.getRoom(roomCode);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Only host can change control mode
    if (socketId !== room.hostSocketId) {
      return { success: false, error: 'Only host can change control mode' };
    }

    // Validate mode
    if (newMode !== this.MODES.HOST_ONLY && newMode !== this.MODES.SHARED) {
      return { success: false, error: 'Invalid control mode' };
    }

    const result = this.roomManager.changeControlMode(roomCode, newMode);
    
    if (result.success) {
      return {
        success: true,
        controlMode: newMode,
        message: `Control mode changed to ${newMode}`
      };
    }

    return result;
  }

  // Get current control mode
  getMode(roomCode) {
    const room = this.roomManager.getRoom(roomCode);
    return room ? room.controlMode : null;
  }

  // Resolve control conflict in shared mode (timestamp-based)
  resolveConflict(action1, action2) {
    // In shared mode, most recent action wins
    if (!action1.timestamp || !action2.timestamp) {
      return action2; // If no timestamp, use most recent
    }
    
    return action1.timestamp > action2.timestamp ? action1 : action2;
  }
}

module.exports = ControlModeManager;
