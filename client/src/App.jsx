// Main App component
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import Home from './pages/Home';
import Room from './pages/Room';
import './styles/main.css';

function App() {
  return (
    <Router>
      <RoomProvider>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room" element={<Room />} />
          </Routes>
        </div>
      </RoomProvider>
    </Router>
  );
}

export default App;
