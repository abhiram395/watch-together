// ParticipantList - Shows list of participants
import React from 'react';
import { useRoom } from '../context/RoomContext';

const ParticipantList = ({ onClose }) => {
  const { participants, currentUser } = useRoom();

  return (
    <div className="participant-list">
      <div className="sidebar-header">
        <h3>Participants ({participants.length})</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      <div className="participant-items">
        {participants.map(participant => (
          <div
            key={participant.socketId}
            className={`participant-item ${
              participant.socketId === currentUser?.socketId ? 'current-user' : ''
            }`}
          >
            <div className="participant-avatar">
              {participant.isHost ? '👑' : '👤'}
            </div>
            <div className="participant-info">
              <div className="participant-name">
                {participant.nickname}
                {participant.socketId === currentUser?.socketId && ' (You)'}
              </div>
              <div className="participant-role">
                {participant.isHost ? 'Host' : 'Guest'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantList;
