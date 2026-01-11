# Watch Together - Real-Time WebRTC Streaming Platform

A Netflix-like watch-together web application that allows users to stream locally downloaded movies from the host's system to friends in real time using WebRTC, with ultra-smooth, tightly synchronized playback.

## Features

- 🎬 **Real-time P2P Video Streaming** via WebRTC
- ✨ **Universal Video Format Support** - ALL formats supported (MP4, MKV, AVI, MOV, WebM, FLV, and more!)
- 🔄 **Ultra-smooth Synchronization** with drift correction
- 🔧 **Automatic Transcoding** - Unsupported formats converted automatically using FFmpeg.wasm
- 💾 **Smart Caching** - Transcoded videos cached for instant reuse
- 👥 **Guest Access** - No authentication required
- 🎮 **Dual Control Modes** - Host-only or Shared control
- 💬 **Real-time Chat** functionality
- 📱 **Mobile & Desktop Support** - Responsive design
- 🔒 **Private Rooms** with unique codes
- 👑 **Room Management** - Up to 15-20 users per room

## Supported Video Formats

### ✅ All Formats Supported

| Category | Formats |
|----------|---------|
| **Containers** | MP4, MKV, AVI, MOV, WebM, FLV, WMV, M4V, 3GP, OGG, MPEG, TS |
| **Video Codecs** | H.264, H.265/HEVC, VP8, VP9, AV1, MPEG-4, DivX, XviD, Theora |
| **Audio Codecs** | AAC, MP3, Opus, Vorbis, AC3, DTS, FLAC, PCM |
| **Subtitles** | SRT, VTT, ASS/SSA (embedded & external) |

**How it works:**
- Natively supported formats (MP4, WebM) play directly
- Unsupported formats are automatically transcoded to WebM/VP9 using FFmpeg.wasm
- Transcoding happens in your browser - no server processing
- Transcoded files are cached for instant reuse

## Tech Stack

### Backend
- Node.js
- Express.js
- Socket.IO for real-time communication

### Frontend
- React.js
- **FFmpeg.wasm** - WebAssembly-based video transcoding
- WebRTC APIs
- Socket.IO Client
- React Router
- IndexedDB for caching transcoded videos

## Installation

### Prerequisites
- Node.js 14.x or higher
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/abhiram395/watch-together.git
cd watch-together
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

## Running the Application

### Development Mode

1. Start the server:
```bash
cd server
npm run dev
```
Server will run on `http://localhost:3001`

2. In a new terminal, start the client:
```bash
cd client
npm start
```
Client will run on `http://localhost:3000`

### Production Mode

1. Build the client:
```bash
cd client
npm run build
```

2. Start the server:
```bash
cd server
npm start
```

## Usage

### For Hosts

1. Go to the homepage
2. Enter your nickname
3. Click "Create Room"
4. Select a video file from your device
5. Share the room code with friends
6. Control playback and manage room settings

### For Guests

1. Go to the homepage
2. Enter your nickname
3. Enter the room code
4. Click "Join Room"
5. Watch synchronized with the host

## Features in Detail

### WebRTC Streaming
- Videos are streamed directly between peers (P2P)
- Server only handles signaling and synchronization
- Supports STUN/TURN servers for NAT traversal
- No video data stored on server

### Synchronization Engine
- Continuous drift detection every 100ms
- Small drift (<300ms): Gradual playback rate adjustment
- Large drift (>300ms): Hard seek to correct time
- Invisible corrections for seamless experience
- Late joiners sync instantly to current timestamp

### Control Modes

**Host-Only Mode:**
- Only host can play, pause, and seek
- Ideal for presentations or large groups
- Viewers locked to host actions

**Shared Control Mode:**
- Any participant can control playback
- Timestamp-based conflict resolution
- Perfect for casual watch parties

### Chat System
- Real-time messaging
- System notifications for join/leave
- Message history preserved during session

## Browser Support

### Desktop
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

### Mobile
- Chrome for Android
- Safari for iOS
- Samsung Internet

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Host      │◄───────►│   Server    │◄───────►│   Guest     │
│  (Browser)  │  Socket │  (Node.js)  │  Socket │  (Browser)  │
└─────────────┘   .IO   └─────────────┘   .IO   └─────────────┘
      │                                                 │
      │                WebRTC P2P                       │
      │◄───────────────────────────────────────────────►│
      │          (Direct Video Stream)                  │
```

## Security & Privacy

- All video streaming is peer-to-peer
- Server never stores or relays video content
- Rooms are ephemeral (deleted when empty)
- No user data persistence
- Private room codes for access control

## Legal Disclaimer

This platform is intended for private watch-together experiences. Users are responsible for owning or having rights to the content being streamed. The platform does not host, store, or distribute copyrighted content.

## Troubleshooting

### Video not loading
- All major video formats are supported (MP4, MKV, AVI, MOV, WebM, etc.)
- If transcoding is needed, allow time for processing (progress shown in UI)
- Check browser console for errors
- Ensure sufficient memory available for transcoding
- Try clearing the video cache if issues persist

### Transcoding taking too long
- Transcoding time depends on file size and your device performance
- Estimated time is shown in the progress dialog
- Large files (>2GB) may take several minutes
- Transcoded files are cached - next time will be instant
- Consider using smaller/compressed video files for faster processing

### Cache management
- Cache limit: 500MB
- Oldest transcoded videos automatically removed when limit reached
- Clear cache manually through browser DevTools → Application → IndexedDB → WatchTogetherCache

### Sync issues
- Check network connection quality
- Reduce number of participants if bandwidth is limited
- Ensure browser tabs are not throttled

### Connection issues
- Check firewall settings
- Ensure WebRTC is not blocked
- Try different network if behind restrictive firewall

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues and questions, please open an issue on GitHub.
