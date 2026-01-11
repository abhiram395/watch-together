// Home page - Create or join room
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';

const Home = () => {
  const [nickname, setNickname] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [mode, setMode] = useState('create'); // 'create' or 'join'
  const { createRoom, joinRoom, roomCode, isJoining, connected } = useRoom();
  const navigate = useNavigate();

  // Navigate to room when roomCode is set (room created/joined successfully)
  useEffect(() => {
    if (roomCode) {
      console.log('Room ready, navigating to /room');
      navigate('/room');
    }
  }, [roomCode, navigate]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (nickname.trim() && !isJoining) {
      await createRoom(nickname.trim());
      // Navigation happens via useEffect when roomCode is set
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (nickname.trim() && roomCodeInput.trim() && !isJoining) {
      await joinRoom(roomCodeInput.trim().toUpperCase(), nickname.trim());
      // Navigation happens via useEffect when roomCode is set
    }
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="logo-section">
          <h1 className="app-title">🎬 Watch Together</h1>
          <p className="app-subtitle">Stream movies with friends in real-time</p>
          {!connected && (
            <p className="connection-status connecting">Connecting to server...</p>
          )}
        </div>

        <div className="mode-selector">
          <button
            className={`mode-btn ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
            disabled={isJoining}
          >
            Create Room
          </button>
          <button
            className={`mode-btn ${mode === 'join' ? 'active' : ''}`}
            onClick={() => setMode('join')}
            disabled={isJoining}
          >
            Join Room
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={handleCreateRoom} className="room-form">
            <h2>Create a New Room</h2>
            <input
              type="text"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input-field"
              maxLength={20}
              required
              disabled={isJoining}
            />
            <button type="submit" className="submit-btn" disabled={isJoining || !nickname.trim()}>
              {isJoining ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinRoom} className="room-form">
            <h2>Join Existing Room</h2>
            <input
              type="text"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input-field"
              maxLength={20}
              required
              disabled={isJoining}
            />
            <input
              type="text"
              placeholder="Enter room code"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              className="input-field"
              maxLength={6}
              required
              disabled={isJoining}
            />
            <button type="submit" className="submit-btn" disabled={isJoining || !nickname.trim() || !roomCodeInput.trim()}>
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        )}

        <div className="disclaimer">
          <p>
            <strong>Legal Disclaimer:</strong> This platform is intended for private watch-together experiences. 
            Users are responsible for owning or having rights to the content being streamed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
