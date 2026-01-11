# Watch Together Development Guide

This document provides detailed information for developers working on the Watch Together project.

## Project Structure

```
watch-together/
├── server/                 # Backend Node.js server
│   ├── index.js           # Main server entry point
│   ├── roomManager.js     # Room state management
│   ├── syncEngine.js      # Playback synchronization
│   ├── controlMode.js     # Control mode management
│   ├── socket.js          # Socket.IO event handlers
│   └── package.json       # Server dependencies
│
├── client/                 # Frontend React application
│   ├── public/
│   │   └── index.html     # HTML entry point
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── VideoPlayer.jsx
│   │   │   ├── ControlBar.jsx
│   │   │   ├── ParticipantList.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── RoomControls.jsx
│   │   │   └── FileSelector.jsx
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useWebRTC.js
│   │   │   ├── useSync.js
│   │   │   └── useSocket.js
│   │   ├── context/       # React context
│   │   │   └── RoomContext.jsx
│   │   ├── pages/         # Page components
│   │   │   ├── Home.jsx
│   │   │   └── Room.jsx
│   │   ├── styles/        # CSS styles
│   │   │   └── main.css
│   │   ├── socket.js      # Socket.IO client setup
│   │   ├── App.jsx        # Main App component
│   │   └── index.js       # React entry point
│   └── package.json       # Client dependencies
│
└── README.md              # Project documentation
```

## Architecture Overview

### Backend Architecture

The server is built with Node.js and Express, using Socket.IO for real-time communication:

1. **Room Manager**: Manages room creation, joining, leaving, and state
2. **Sync Engine**: Handles playback synchronization with drift correction
3. **Control Mode Manager**: Manages host-only vs shared control modes
4. **Socket Handler**: Processes all Socket.IO events

### Frontend Architecture

The client is a React single-page application with:

1. **Context API**: Global state management (RoomContext)
2. **Custom Hooks**: Reusable logic for WebRTC, sync, and Socket.IO
3. **Components**: Modular UI components for video, controls, chat, etc.
4. **Pages**: Home (create/join) and Room (watch-together interface)

### WebRTC Flow

```
Host Workflow:
1. Host selects video file
2. Browser captures stream from video element
3. Host creates offers for each participant
4. WebRTC peer connections established
5. Video streams directly to guests

Guest Workflow:
1. Guest joins room
2. Receives offer from host
3. Sends answer back
4. WebRTC connection established
5. Receives video stream from host
```

### Synchronization Strategy

1. **Server maintains authoritative playback state**
   - Current time
   - Playing/paused status
   - Playback rate

2. **Continuous sync broadcast** (every 100ms)
   - Server sends current state to all clients
   - Clients compare with local state

3. **Drift correction**
   - Small drift (<300ms): Adjust playback rate (0.95x - 1.05x)
   - Large drift (>300ms): Hard seek to correct time

4. **Conflict resolution** (shared mode)
   - Timestamp-based: Most recent action wins
   - Server immediately broadcasts to all clients

## Socket.IO Events

### Room Management

- `room:create` - Create new room
  - Emit: `{ nickname: string }`
  - Receive: `room:created { roomCode, isHost, participant }`

- `room:join` - Join existing room
  - Emit: `{ roomCode: string, nickname: string }`
  - Receive: `room:joined { roomCode, isHost, participant, playbackState, controlMode }`

- `room:leave` - Leave room
  - Emit: `{}`

- `room:participants` - Participant list update
  - Receive: `{ participants: Array }`

- `room:user-joined` - New user joined
  - Receive: `{ participant, message }`

- `room:user-left` - User left
  - Receive: `{ socketId, nickname, message }`

### WebRTC Signaling

- `signal:offer` - Send WebRTC offer
  - Emit: `{ targetSocketId, offer, roomCode }`
  - Receive: `{ fromSocketId, offer, roomCode }`

- `signal:answer` - Send WebRTC answer
  - Emit: `{ targetSocketId, answer, roomCode }`
  - Receive: `{ fromSocketId, answer, roomCode }`

- `signal:ice` - Send ICE candidate
  - Emit: `{ targetSocketId, candidate, roomCode }`
  - Receive: `{ fromSocketId, candidate, roomCode }`

### Playback Control

- `playback:play` - Play video
  - Emit: `{ roomCode, playbackTime }`
  - Receive: `{ playbackTime, timestamp }`

- `playback:pause` - Pause video
  - Emit: `{ roomCode, playbackTime }`
  - Receive: `{ playbackTime, timestamp }`

- `playback:seek` - Seek to time
  - Emit: `{ roomCode, playbackTime }`
  - Receive: `{ playbackTime, timestamp }`

- `playback:sync` - Sync state broadcast
  - Receive: `{ playbackTime, isPlaying, playbackRate, timestamp }`

### Control Mode

- `mode:change` - Change control mode
  - Emit: `{ roomCode, mode: 'host-only' | 'shared' }`
  - Receive: `mode:changed { controlMode, message }`

### Chat

- `chat:message` - Send/receive chat message
  - Emit: `{ roomCode, message }`
  - Receive: `{ from, message, timestamp, socketId }`

## Development Workflow

### Setting Up Development Environment

1. Install dependencies:
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

2. Start development servers:
```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm start
```

3. Access the application:
   - Client: http://localhost:3000
   - Server: http://localhost:3001

### Making Changes

1. **Backend Changes**
   - Server restarts automatically (nodemon)
   - Test with Socket.IO events
   - Check server logs

2. **Frontend Changes**
   - Hot reload enabled
   - Check browser console
   - Use React DevTools

### Testing

Currently, the project includes:

1. **Manual Testing**: Test in browser with multiple tabs/windows
2. **Build Testing**: `npm run build` in client directory
3. **Server Testing**: Health check endpoint at `/health`

To add automated tests:

```bash
# Server tests (add jest)
cd server
npm install --save-dev jest
npm test

# Client tests (included with CRA)
cd client
npm test
```

## Common Development Tasks

### Adding a New Socket.IO Event

1. Define the event handler in `server/socket.js`
2. Update room/sync logic in respective managers
3. Add client-side listener in `RoomContext.jsx` or component
4. Test with multiple clients

### Adding a New Component

1. Create component file in `client/src/components/`
2. Import and use in appropriate page
3. Add styles in `main.css`
4. Test responsiveness

### Modifying Synchronization Logic

1. Update `server/syncEngine.js` for server-side logic
2. Update `client/src/hooks/useSync.js` for client-side logic
3. Test with network throttling
4. Verify drift correction works

### Styling Changes

1. Edit `client/src/styles/main.css`
2. Use CSS variables for theming
3. Test on mobile devices/emulators
4. Ensure mobile-first approach

## Performance Optimization

### Client-Side

1. **React Optimization**
   - Use `React.memo` for expensive components
   - Implement `useCallback` for event handlers
   - Use `useMemo` for computed values

2. **WebRTC Optimization**
   - Limit video quality for better performance
   - Monitor connection stats
   - Handle reconnection gracefully

3. **Rendering Optimization**
   - Minimize re-renders
   - Lazy load components
   - Optimize CSS animations

### Server-Side

1. **Memory Management**
   - Clean up disconnected rooms
   - Limit room history
   - Monitor memory usage

2. **Socket.IO Optimization**
   - Use rooms for targeted broadcasts
   - Minimize event payload size
   - Compress data when needed

3. **Scaling**
   - Use Redis adapter for multiple servers
   - Load balance with nginx
   - Monitor concurrent connections

## Debugging Tips

### WebRTC Issues

1. Check browser console for errors
2. Verify STUN server connectivity
3. Test with different network conditions
4. Use chrome://webrtc-internals for debugging

### Synchronization Issues

1. Check server logs for sync events
2. Monitor playback state changes
3. Test drift correction with throttling
4. Verify timestamp accuracy

### Socket.IO Issues

1. Enable Socket.IO debug mode:
   ```javascript
   localStorage.debug = 'socket.io-client:socket';
   ```
2. Check connection state
3. Monitor event flow
4. Verify event handlers

## Deployment

### Production Build

1. **Build Client**:
```bash
cd client
npm run build
```

2. **Serve Static Files**:
Update `server/index.js` to serve client build:
```javascript
app.use(express.static(path.join(__dirname, '../client/build')));
```

3. **Environment Variables**:
Create `.env` file in server directory:
```
PORT=3001
NODE_ENV=production
```

### Deployment Options

1. **Heroku**
2. **DigitalOcean**
3. **AWS**
4. **Vercel (client)** + **Railway (server)**

## Security Considerations

1. **Input Validation**: Validate all user inputs
2. **Rate Limiting**: Prevent spam/abuse
3. **CORS**: Configure properly for production
4. **Content Security**: Legal disclaimer for content responsibility
5. **Connection Limits**: Enforce max participants per room

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Follow code style guidelines

## Resources

- [Socket.IO Documentation](https://socket.io/docs/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)

## License

MIT License - See LICENSE file for details
