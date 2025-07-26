import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MapCreator from './MapCreator';
import MapViewer from './MapViewer';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <nav style={{ marginBottom: 24, padding: '10px 0', borderBottom: '1px solid #ccc' }}>
          <Link to="/" style={{ marginRight: 20, textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Map Creator</Link>
          <Link to="/viewer" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Map Viewer</Link>
        </nav>
        <Routes>
          <Route path="/" element={<MapCreator />} />
          <Route path="/viewer" element={<MapViewer />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
