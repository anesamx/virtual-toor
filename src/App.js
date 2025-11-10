
import React, { useState } from 'react';
import Landing from './Landing';

const App = () => {
  const [showVR, setShowVR] = useState(false);

  return (
    <div className="App">
      {showVR ? (
        <p>VR Tour will be here</p>
      ) : (
        <Landing onEnterVR={() => setShowVR(true)} />
      )}
    </div>
  );
};

export default App;
