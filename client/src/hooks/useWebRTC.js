// useWebRTC - WebRTC peer connection hook
import { useEffect, useRef, useState, useCallback } from 'react';
import socket from '../socket';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export const useWebRTC = (roomCode, isHost, participants, localStream) => {
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnections = useRef({});
  const pendingCandidates = useRef({});

  // Create peer connection
  const createPeerConnection = useCallback((targetSocketId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal:ice', {
          targetSocketId,
          candidate: event.candidate,
          roomCode
        });
      }
    };

    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log(`Received track from ${targetSocketId}`);
      setRemoteStreams(prev => ({
        ...prev,
        [targetSocketId]: event.streams[0]
      }));
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetSocketId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupPeerConnection(targetSocketId);
      }
    };

    return pc;
  }, [roomCode]);

  // Cleanup peer connection
  const cleanupPeerConnection = useCallback((socketId) => {
    if (peerConnections.current[socketId]) {
      peerConnections.current[socketId].close();
      delete peerConnections.current[socketId];
    }
    setRemoteStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[socketId];
      return newStreams;
    });
    delete pendingCandidates.current[socketId];
  }, []);

  // Host: Create offer for new participant
  const createOffer = useCallback(async (targetSocketId) => {
    if (!localStream) {
      console.error('No local stream available');
      return;
    }

    const pc = createPeerConnection(targetSocketId);
    peerConnections.current[targetSocketId] = pc;

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('signal:offer', {
        targetSocketId,
        offer,
        roomCode
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [localStream, roomCode, createPeerConnection]);

  // Guest: Handle incoming offer
  const handleOffer = useCallback(async ({ fromSocketId, offer }) => {
    const pc = createPeerConnection(fromSocketId);
    peerConnections.current[fromSocketId] = pc;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any pending ICE candidates
      if (pendingCandidates.current[fromSocketId]) {
        for (const candidate of pendingCandidates.current[fromSocketId]) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        delete pendingCandidates.current[fromSocketId];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('signal:answer', {
        targetSocketId: fromSocketId,
        answer,
        roomCode
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [roomCode, createPeerConnection]);

  // Host: Handle incoming answer
  const handleAnswer = useCallback(async ({ fromSocketId, answer }) => {
    const pc = peerConnections.current[fromSocketId];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Process any pending ICE candidates
        if (pendingCandidates.current[fromSocketId]) {
          for (const candidate of pendingCandidates.current[fromSocketId]) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          delete pendingCandidates.current[fromSocketId];
        }
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async ({ fromSocketId, candidate }) => {
    const pc = peerConnections.current[fromSocketId];
    
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      // Store candidate for later
      if (!pendingCandidates.current[fromSocketId]) {
        pendingCandidates.current[fromSocketId] = [];
      }
      pendingCandidates.current[fromSocketId].push(candidate);
    }
  }, []);

  // Setup WebRTC signaling listeners
  useEffect(() => {
    socket.on('signal:offer', handleOffer);
    socket.on('signal:answer', handleAnswer);
    socket.on('signal:ice', handleIceCandidate);

    return () => {
      socket.off('signal:offer', handleOffer);
      socket.off('signal:answer', handleAnswer);
      socket.off('signal:ice', handleIceCandidate);
    };
  }, [handleOffer, handleAnswer, handleIceCandidate]);

  // Host: Create offers for all participants when local stream is ready
  useEffect(() => {
    if (isHost && localStream && participants.length > 1) {
      participants.forEach(participant => {
        if (!participant.isHost && !peerConnections.current[participant.socketId]) {
          createOffer(participant.socketId);
        }
      });
    }
  }, [isHost, localStream, participants, createOffer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.keys(peerConnections.current).forEach(socketId => {
        cleanupPeerConnection(socketId);
      });
    };
  }, [cleanupPeerConnection]);

  // Handle participant leaving
  useEffect(() => {
    const handleUserLeft = ({ socketId }) => {
      cleanupPeerConnection(socketId);
    };

    socket.on('room:user-left', handleUserLeft);

    return () => {
      socket.off('room:user-left', handleUserLeft);
    };
  }, [cleanupPeerConnection]);

  return {
    remoteStreams,
    peerConnections: peerConnections.current
  };
};

export default useWebRTC;
