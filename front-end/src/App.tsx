import React from 'react';
import './App.css';
import Feed from "./components/Feed"; // Ensure case-sensitivity matches your file

function App() {
  return (
    <div className="App">
      <div className="cameraicon">
        <img 
          src={`/testimage/cameraicon.webp`} 
          alt="Camera" 
          className="camera-icon" 
        />
      </div>
      <h1>RetroInstagram</h1>
      <div className="Posts">
        <Feed />
      </div>
    </div>
  );
}

export default App;
