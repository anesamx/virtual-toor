
import React from 'react';

const Landing = ({ onEnterVR }) => {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <header className="text-center py-16">
        <h1 className="text-5xl font-bold">Modern Villa</h1>
        <p className="text-xl mt-4">A stunning architectural masterpiece.</p>
      </header>

      <main className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <img src="../public/placeholder-1.jpg" alt="Project image 1" className="w-full h-auto rounded-lg shadow-lg" />
          <img src="../public/placeholder-2.jpg" alt="Project image 2" className="w-full h-auto rounded-lg shadow-lg" />
          <img src="../public/placeholder-3.jpg" alt="Project image 3" className="w-full h-auto rounded-lg shadow-lg" />
        </div>

        <div className="text-center mt-16">
          <button 
            onClick={onEnterVR}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-xl transition duration-300 ease-in-out transform hover:scale-110"
          >
            Enter VR Tour
          </button>
        </div>
      </main>

      <footer className="text-center py-8 mt-16">
        <p>&copy; 2024 Your Name. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
