// Room page - Main watch-together interface
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import useWebRTC from '../hooks/useWebRTC';
import useSync from '../hooks/useSync';
import VideoPlayer from '../components/VideoPlayer';
import FileSelector from '../components/FileSelector';
import ControlBar from '../components/ControlBar';
import ParticipantList from '../components/ParticipantList';
import Chat from '../components/Chat';
import RoomControls from '../components/RoomControls';

const Room = () => {
  const { roomCode, isHost, participants, leaveRoom } = useRoom();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const { remoteStreams } = useWebRTC(roomCode, isHost, participants, localStream);
  useSync(videoRef);

  // Handle leaving room
  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      leaveRoom();
      navigate('/');
    }
  };

  // Redirect if no room
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
    }
  }, [roomCode, navigate]);

  if (!roomCode) {
    return <div>Loading...</div>;
  }

  // Determine which stream to use
  const streamToDisplay = isHost ? localStream : Object.values(remoteStreams)[0];

  return (
    <div className="room-container">
      <div className="room-header">
        <div className="room-info">
          <h2>Room: {roomCode}</h2>
          <span className="role-badge">{isHost ? '👑 Host' : '👤 Guest'}</span>
        </div>
        <div className="room-actions">
          <button
            className="icon-btn"
            onClick={() => setShowParticipants(!showParticipants)}
            title="Participants"
          >
            👥 {participants.length}
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowChat(!showChat)}
            title="Chat"
          >
            💬
          </button>
          <button className="leave-btn" onClick={handleLeave}>
            Leave
          </button>
        </div>
      </div>

      <div className="room-content">
        <div className="video-section">
          {isHost && !localStream && (
            <FileSelector onStreamReady={setLocalStream} />
          )}
          
          {streamToDisplay && (
            <>
              <VideoPlayer
                videoRef={videoRef}
                stream={streamToDisplay}
                isHost={isHost}
              />
              <ControlBar videoRef={videoRef} />
            </>
          )}

          {!isHost && !streamToDisplay && (
            <div className="waiting-message">
              <div className="spinner"></div>
              <p>Waiting for host to start streaming...</p>
            </div>
          )}

          {isHost && <RoomControls />}
        </div>

        {showParticipants && (
          <div className="sidebar participants-sidebar">
            <ParticipantList onClose={() => setShowParticipants(false)} />
          </div>
        )}

        {showChat && (
          <div className="sidebar chat-sidebar">
            <Chat onClose={() => setShowChat(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;
