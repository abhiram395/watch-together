// RoomContext - Global state management for room
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Socket connection events
    const handleConnect = () => {
      console.log('Connected to server with ID:', socket.id);
      setConnected(true);
    };

    const handleDisconnect = (reason) => {
      console.log('Disconnected from server:', reason);
      setConnected(false);
      
      // Auto-reconnect if disconnected unexpectedly
      if (reason === 'io server disconnect' || reason === 'transport close') {
        socket.connect();
      }
    };

    const handleConnectError = (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    };

    // Room events
    const handleRoomCreated = ({ roomCode: code, isHost: host, participant }) => {
      console.log('Room created:', code, 'Socket ID:', socket.id);
      setRoomCode(code);
      setIsHost(host);
      setCurrentUser({ ...participant, socketId: socket.id });
      setParticipants([{ ...participant, socketId: socket.id }]);
      setIsJoining(false);
    };

    const handleRoomJoined = ({ roomCode: code, isHost: host, participant, playbackState: initialPlaybackState, controlMode: initialControlMode }) => {
      console.log('Room joined:', code, 'Socket ID:', socket.id);
      setRoomCode(code);
      setIsHost(host);
      setCurrentUser({ ...participant, socketId: socket.id });
      setPlaybackState(initialPlaybackState);
      setControlMode(initialControlMode);
      setIsJoining(false);
    };

    const handleParticipants = ({ participants: updatedParticipants }) => {
      console.log('Participants updated:', updatedParticipants);
      setParticipants(updatedParticipants);
    };

    const handleUserJoined = ({ participant, message }) => {
      console.log(message);
      addSystemMessage(message);
    };

    const handleUserLeft = ({ nickname, message }) => {
      console.log(message);
      addSystemMessage(message);
    };

    const handleRoomError = ({ error }) => {
      console.error('Room error:', error);
      alert(error);
      setIsJoining(false);
    };

    // Playback sync
    const handlePlaybackSync = (syncData) => {
      setPlaybackState(prev => ({
        ...prev,
        playbackTime: syncData.playbackTime,
        isPlaying: syncData.isPlaying,
        playbackRate: syncData.playbackRate
      }));
    };

    const handlePlaybackPlay = ({ playbackTime }) => {
      setPlaybackState(prev => ({
        ...prev,
        playbackTime,
        isPlaying: true
      }));
    };

    const handlePlaybackPause = ({ playbackTime }) => {
      setPlaybackState(prev => ({
        ...prev,
        playbackTime,
        isPlaying: false
      }));
    };

    const handlePlaybackSeek = ({ playbackTime }) => {
      setPlaybackState(prev => ({
        ...prev,
        playbackTime
      }));
    };

    const handlePlaybackError = ({ error }) => {
      console.error('Playback error:', error);
    };

    // Control mode
    const handleModeChanged = ({ controlMode: newMode, message }) => {
      setControlMode(newMode);
      addSystemMessage(message);
    };

    const handleModeError = ({ error }) => {
      console.error('Mode error:', error);
    };

    // Chat
    const handleChatMessage = ({ from, message, timestamp, socketId: msgSocketId }) => {
      console.log('Chat message received:', { from, message, socketId: msgSocketId });
      setMessages(prev => [...prev, { from, message, timestamp, socketId: msgSocketId, type: 'user' }]);
    };

    const handleChatError = ({ error }) => {
      console.error('Chat error:', error);
      alert('Chat error: ' + error);
    };

    // Video processing status
    const handleVideoProcessing = ({ filename, message }) => {
      console.log('Video processing:', filename);
      addSystemMessage(`🎬 ${message}`);
    };

    const handleVideoReady = ({ filename, message }) => {
      console.log('Video ready:', filename);
      addSystemMessage(`✅ ${message}`);
    };

    // Register all event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('room:created', handleRoomCreated);
    socket.on('room:joined', handleRoomJoined);
    socket.on('room:participants', handleParticipants);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);
    socket.on('room:error', handleRoomError);
    socket.on('playback:sync', handlePlaybackSync);
    socket.on('playback:play', handlePlaybackPlay);
    socket.on('playback:pause', handlePlaybackPause);
    socket.on('playback:seek', handlePlaybackSeek);
    socket.on('playback:error', handlePlaybackError);
    socket.on('mode:changed', handleModeChanged);
    socket.on('mode:error', handleModeError);
    socket.on('chat:message', handleChatMessage);
    socket.on('chat:error', handleChatError);
    socket.on('video:processing', handleVideoProcessing);
    socket.on('video:ready', handleVideoReady);

    // Check if already connected
    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('room:created', handleRoomCreated);
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:participants', handleParticipants);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
      socket.off('room:error', handleRoomError);
      socket.off('playback:sync', handlePlaybackSync);
      socket.off('playback:play', handlePlaybackPlay);
      socket.off('playback:pause', handlePlaybackPause);
      socket.off('playback:seek', handlePlaybackSeek);
      socket.off('playback:error', handlePlaybackError);
      socket.off('mode:changed', handleModeChanged);
      socket.off('mode:error', handleModeError);
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:error', handleChatError);
      socket.off('video:processing', handleVideoProcessing);
      socket.off('video:ready', handleVideoReady);
    };
  }, []);

  const addSystemMessage = (message) => {
    setMessages(prev => [...prev, {
      message,
      timestamp: Date.now(),
      type: 'system'
    }]);
  };

  // Helper to ensure socket is connected before emitting
  const emitWhenConnected = useCallback((event, data) => {
    return new Promise((resolve, reject) => {
      if (socket.connected) {
        socket.emit(event, data);
        resolve();
      } else {
        socket.connect();
        
        const onConnect = () => {
          socket.off('connect', onConnect);
          socket.off('connect_error', onError);
          socket.emit(event, data);
          resolve();
        };
        
        const onError = (error) => {
          socket.off('connect', onConnect);
          socket.off('connect_error', onError);
          reject(error);
        };
        
        socket.once('connect', onConnect);
        socket.once('connect_error', onError);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          socket.off('connect', onConnect);
          socket.off('connect_error', onError);
          reject(new Error('Connection timeout'));
        }, 10000);
      }
    });
  }, []);

  const createRoom = useCallback(async (nickname) => {
    setIsJoining(true);
    try {
      await emitWhenConnected('room:create', { nickname });
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to connect to server. Please try again.');
      setIsJoining(false);
    }
  }, [emitWhenConnected]);

  const joinRoom = useCallback(async (code, nickname) => {
    setIsJoining(true);
    try {
      await emitWhenConnected('room:join', { roomCode: code, nickname });
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to connect to server. Please try again.');
      setIsJoining(false);
    }
  }, [emitWhenConnected]);

  const leaveRoom = useCallback(() => {
    if (socket.connected) {
      socket.emit('room:leave');
    }
    // Don't disconnect - just leave the room
    setRoomCode(null);
    setIsHost(false);
    setParticipants([]);
    setCurrentUser(null);
    setMessages([]);
    setControlMode('host-only');
    setPlaybackState({
      playbackTime: 0,
      isPlaying: false,
      playbackRate: 1.0
    });
  }, []);

  const sendMessage = useCallback((message) => {
    if (!message || !message.trim()) {
      console.log('Empty message, not sending');
      return;
    }
    
    if (!roomCode) {
      console.error('Cannot send message: No room code');
      return;
    }
    
    if (!socket.connected) {
      console.error('Cannot send message: Socket not connected');
      alert('Not connected to server. Please refresh the page.');
      return;
    }
    
    console.log('Sending message:', { roomCode, message: message.trim(), socketId: socket.id });
    socket.emit('chat:message', { roomCode, message: message.trim() });
  }, [roomCode]);

  const changeControlMode = useCallback((mode) => {
    if (isHost && roomCode && socket.connected) {
      socket.emit('mode:change', { roomCode, mode });
    }
  }, [isHost, roomCode]);

  const canControl = useCallback(() => {
    if (controlMode === 'host-only') {
      return isHost;
    }
    return true; // Shared mode
  }, [controlMode, isHost]);

  const value = {
    roomCode,
    isHost,
    participants,
    currentUser,
    controlMode,
    playbackState,
    messages,
    connected,
    isJoining,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    changeControlMode,
    canControl
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
