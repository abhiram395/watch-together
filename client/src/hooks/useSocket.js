// useSocket - Socket.IO hook
import { useEffect, useState } from 'react';
import socket from '../socket';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const emit = (event, data) => {
    socket.emit(event, data);
  };

  const on = (event, handler) => {
    socket.on(event, handler);
  };

  const off = (event, handler) => {
    socket.off(event, handler);
  };

  return {
    socket,
    isConnected,
    emit,
    on,
    off
  };
};

export default useSocket;
