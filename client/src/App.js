import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import './styles/App.css';

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby/:sessionId" element={<Lobby />} />
            <Route path="/game/:sessionId" element={<Game />} />
          </Routes>
        </div>
      </Router>
    </DndProvider>
  );
}

export default App;
