// Chat - Real-time chat component
import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../context/RoomContext';

const Chat = ({ onClose }) => {
  const { messages, sendMessage, currentUser, connected } = useRoom();
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && connected && !isSending) {
      setIsSending(true);
      sendMessage(messageInput.trim());
      setMessageInput('');
      // Reset sending state after a short delay
      setTimeout(() => setIsSending(false), 500);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chat">
      <div className="sidebar-header">
        <h3>Chat</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ 
            fontSize: '0.8rem', 
            color: connected ? '#4caf50' : '#f44336',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#4caf50' : '#f44336',
              display: 'inline-block'
            }}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="chat-messages">
        {!connected && (
          <div className="chat-message system-message">
            <div className="system-text">⚠️ Connecting to chat server...</div>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.type === 'system' ? 'system-message' : ''} ${
              msg.socketId === currentUser?.socketId ? 'own-message' : ''
            }`}
          >
            {msg.type === 'system' ? (
              <div className="system-text">{msg.message}</div>
            ) : (
              <>
                <div className="message-header">
                  <span className="message-from">{msg.from}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-text">{msg.message}</div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder={connected ? "Type a message..." : "Connecting..."}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="chat-input"
          maxLength={500}
          disabled={!connected || isSending}
        />
        <button 
          type="submit" 
          className="send-btn" 
          disabled={!messageInput.trim() || !connected || isSending}
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default Chat;
