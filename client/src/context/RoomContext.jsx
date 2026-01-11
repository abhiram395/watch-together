// RoomContext - Global state management for room
import React, { createContext, useContext, useState, useEffect } from 'react';
import socket from '../socket';

const RoomContext = createContext();

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within RoomProvider');
  }
  return context;
};

export const RoomProvider = ({ children }) => {
  const [roomCode, setRoomCode] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [controlMode, setControlMode] = useState('host-only');
  const [playbackState, setPlaybackState] = useState({
    playbackTime: 0,
    isPlaying: false,
    playbackRate: 1.0
  });
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Socket connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    // Room events
    socket.on('room:created', ({ roomCode, isHost, participant }) => {
      setRoomCode(roomCode);
      setIsHost(isHost);
      setCurrentUser(participant);
      setParticipants([participant]);
    });

    socket.on('room:joined', ({ roomCode, isHost, participant, playbackState: initialPlaybackState, controlMode: initialControlMode }) => {
      setRoomCode(roomCode);
      setIsHost(isHost);
      setCurrentUser(participant);
      setPlaybackState(initialPlaybackState);
      setControlMode(initialControlMode);
    });

    socket.on('room:participants', ({ participants: updatedParticipants }) => {
      setParticipants(updatedParticipants);
    });

    socket.on('room:user-joined', ({ participant, message }) => {
      console.log(message);
      addSystemMessage(message);
    });

    socket.on('room:user-left', ({ nickname, message }) => {
      console.log(message);
      addSystemMessage(message);
    });

    socket.on('room:error', ({ error }) => {
      console.error('Room error:', error);
      alert(error);
    });

    // Playback sync
    socket.on('playback:sync', (syncData) => {
      setPlaybackState(prev => ({
        ...prev,
        playbackTime: syncData.playbackTime,
        isPlaying: syncData.isPlaying,
        playbackRate: syncData.playbackRate
      }));
    });

    socket.on('playback:play', ({ playbackTime }) => {
      setPlaybackState(prev => ({
        ...prev,
        playbackTime,
        isPlaying: true
      }));
    });

    socket.on('playback:pause', ({ playbackTime }) => {
      setPlaybackState(prev => ({
        ...prev,
        playbackTime,
        isPlaying: false
      }));
    });

    socket.on('playback:seek', ({ playbackTime }) => {
      setPlaybackState(prev => ({
        ...prev,
        playbackTime
      }));
    });

    socket.on('playback:error', ({ error }) => {
      console.error('Playback error:', error);
    });

    // Control mode
    socket.on('mode:changed', ({ controlMode: newMode, message }) => {
      setControlMode(newMode);
      addSystemMessage(message);
    });

    socket.on('mode:error', ({ error }) => {
      console.error('Mode error:', error);
    });

    // Chat
    socket.on('chat:message', ({ from, message, timestamp, socketId }) => {
      setMessages(prev => [...prev, { from, message, timestamp, socketId, type: 'user' }]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:participants');
      socket.off('room:user-joined');
      socket.off('room:user-left');
      socket.off('room:error');
      socket.off('playback:sync');
      socket.off('playback:play');
      socket.off('playback:pause');
      socket.off('playback:seek');
      socket.off('playback:error');
      socket.off('mode:changed');
      socket.off('mode:error');
      socket.off('chat:message');
    };
  }, []);

  const addSystemMessage = (message) => {
    setMessages(prev => [...prev, {
      message,
      timestamp: Date.now(),
      type: 'system'
    }]);
  };

  const createRoom = (nickname) => {
    socket.connect();
    socket.emit('room:create', { nickname });
  };

  const joinRoom = (code, nickname) => {
    socket.connect();
    socket.emit('room:join', { roomCode: code, nickname });
  };

  const leaveRoom = () => {
    socket.emit('room:leave');
    socket.disconnect();
    setRoomCode(null);
    setIsHost(false);
    setParticipants([]);
    setCurrentUser(null);
    setMessages([]);
  };

  const sendMessage = (message) => {
    if (roomCode && message.trim()) {
      socket.emit('chat:message', { roomCode, message });
    }
  };

  const changeControlMode = (mode) => {
    if (isHost && roomCode) {
      socket.emit('mode:change', { roomCode, mode });
    }
  };

  const canControl = () => {
    if (controlMode === 'host-only') {
      return isHost;
    }
    return true; // Shared mode
  };

  const value = {
    roomCode,
    isHost,
    participants,
    currentUser,
    controlMode,
    playbackState,
    messages,
    connected,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    changeControlMode,
    canControl
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
