// RoomControls - Host controls for room settings
import React from 'react';
import { useRoom } from '../context/RoomContext';

const RoomControls = () => {
  const { controlMode, changeControlMode, roomCode } = useRoom();

  const handleModeChange = (e) => {
    changeControlMode(e.target.value);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      alert('Room code copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Room link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className="room-controls">
      <div className="control-section">
        <label htmlFor="control-mode">Control Mode:</label>
        <select
          id="control-mode"
          value={controlMode}
          onChange={handleModeChange}
          className="control-mode-select"
        >
          <option value="host-only">Host Only</option>
          <option value="shared">Shared Control</option>
        </select>
        <span className="mode-description">
          {controlMode === 'host-only'
            ? '🔒 Only you can control playback'
            : '🔓 Everyone can control playback'}
        </span>
      </div>

      <div className="control-section">
        <button className="copy-btn" onClick={copyRoomCode}>
          📋 Copy Room Code
        </button>
        <button className="copy-btn" onClick={copyRoomLink}>
          🔗 Copy Room Link
        </button>
      </div>
    </div>
  );
};

export default RoomControls;
