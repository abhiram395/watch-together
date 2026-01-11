// Chat - Real-time chat component
import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../context/RoomContext';

const Chat = ({ onClose }) => {
  const { messages, sendMessage, currentUser } = useRoom();
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput.trim());
      setMessageInput('');
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
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
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
          placeholder="Type a message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="chat-input"
          maxLength={500}
        />
        <button type="submit" className="send-btn" disabled={!messageInput.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
