const { useState, useEffect, useRef } = React;

// Initialize Socket.io client
const socket = io();

// (Text canvas helper removed since 3D VR menu was deleted)

const VRScene = ({ scenarios, initialScenarioId }) => {
  const [hasEntered, setHasEntered] = useState(false);
  const mountRef = useRef(null);
  const loadScenarioRef = useRef(null);

  useEffect(() => {
    // Notify server that viewer has joined
    socket.emit('join', { role: 'viewer', activeScenarioId: initialScenarioId });

    let activeId = initialScenarioId;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    
    // VR Button
    let vrButton = null;
    if (typeof THREE.VRButton !== 'undefined') {
      vrButton = THREE.VRButton.createButton(renderer);
      
      // Override VRButton styles to look like our custom React button
      vrButton.textContent = 'Entrer dans le monde 360';
      vrButton.style.padding = '16px 40px';
      vrButton.style.fontSize = '20px';
      vrButton.style.backgroundColor = '#2563eb';
      vrButton.style.color = 'white';
      vrButton.style.borderRadius = '9999px';
      vrButton.style.fontWeight = 'bold';
      vrButton.style.bottom = '40%';
      vrButton.style.left = '50%';
      vrButton.style.transform = 'translate(-50%, 50%)';
      vrButton.style.width = 'auto';
      vrButton.style.border = 'none';
      vrButton.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.5)';
      vrButton.style.zIndex = '10000'; // Above React overlay
      
      // Hover effects
      vrButton.onmouseenter = () => vrButton.style.backgroundColor = '#3b82f6';
      vrButton.onmouseleave = () => vrButton.style.backgroundColor = '#2563eb';

      document.body.appendChild(vrButton);
    } else {
      console.warn('VRButton not found - skipping WebXR initialization');
    }

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 0, 0.1);
    controls.update();

    renderer.xr.addEventListener('sessionstart', () => {
      controls.enabled = false;
      setHasEntered(true);
      if (vrButton) vrButton.style.display = 'none';
    });
    renderer.xr.addEventListener('sessionend', () => {
      controls.enabled = true;
      setHasEntered(false);
      if (vrButton) vrButton.style.display = 'block';
    });

    const textureLoader = new THREE.TextureLoader();
    const sphereGeometry = new THREE.SphereGeometry(500, 60, 40);
    sphereGeometry.scale(-1, 1, 1);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    const loadScenario = (id) => {
      let s = scenarios.find(x => x.id === id);
      if (s) {
        textureLoader.load(s.panoramaUrl, (texture) => {
          sphereMaterial.map = texture;
          sphereMaterial.needsUpdate = true;
          // Notify socket server of local scene change
          socket.emit('viewer-scene-change', { activeScenarioId: id });
        });
      } else if (id) {
        // Fallback: Fetch latest data if scenario not found locally (e.g. admin newly created it)
        fetch('/api/data')
          .then(res => res.json())
          .then(d => {
            const found = d.scenarios.find(x => x.id === id);
            if (found) {
              textureLoader.load(found.panoramaUrl, (texture) => {
                sphereMaterial.map = texture;
                sphereMaterial.needsUpdate = true;
                socket.emit('viewer-scene-change', { activeScenarioId: id });
              });
            }
          })
          .catch(e => console.error('Failed to fetch new scenario:', e));
      }
    };
    
    loadScenarioRef.current = loadScenario;
    loadScenario(activeId);

    // Listen to admin scene changes
    socket.on('server-change-scenario', (scenarioId) => {
      loadScenario(scenarioId);
    });

    let lastGazeUpdate = 0;
    const gazeUpdateInterval = 80; // ~12 fps is enough for responsive updates without lagging the app

    const animate = () => {
      renderer.setAnimationLoop(() => {
        if (controls.enabled) {
          controls.update();
        }
        renderer.render(scene, camera);

        // Emit gaze updates
        const now = Date.now();
        if (now - lastGazeUpdate > gazeUpdateInterval) {
          socket.emit('viewer-gaze-update', {
            rotation: {
              x: camera.quaternion.x,
              y: camera.quaternion.y,
              z: camera.quaternion.z,
              w: camera.quaternion.w
            }
          });
          lastGazeUpdate = now;
        }
      });
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      socket.off('server-change-scenario');
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      if (vrButton && vrButton.parentNode) {
        vrButton.parentNode.removeChild(vrButton);
      }
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []); // Run once on mount

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {!hasEntered && (
        <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center p-6 text-white text-center" style={{ zIndex: 9999 }}>
          <h1 className="text-4xl font-extrabold mb-4 tracking-tight">djef vr</h1>
          <p className="text-gray-400 mb-24 max-w-md">Préparez votre casque Meta Quest et cliquez ci-dessous pour lancer la visite immersive.</p>
          {/* The actual button is rendered by Three.js VRButton with z-index 10000 right here */}
        </div>
      )}
      <div style={{ width: '100vw', height: '100vh' }} ref={mountRef}></div>
    </div>
  );
};

// Live Three.js mirror of a viewer's rotation
const GazeMirror = ({ panoramaUrl, rotation }) => {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const textureLoaderRef = useRef(new THREE.TextureLoader());
  const materialRef = useRef(null);

  useEffect(() => {
    const width = 300;
    const height = 170;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(width, height);
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }
    
    camera.position.set(0, 0, 0.1);
    cameraRef.current = camera;

    const sphereGeometry = new THREE.SphereGeometry(10, 60, 40);
    sphereGeometry.scale(-1, 1, 1);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    materialRef.current = sphereMaterial;
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Initial load if panoramaUrl already exists
    if (panoramaUrl) {
      textureLoaderRef.current.load(panoramaUrl, (texture) => {
        sphereMaterial.map = texture;
        sphereMaterial.needsUpdate = true;
      });
    }

    let reqId;
    const animate = () => {
      renderer.render(scene, camera);
      reqId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      if (mountRef.current && renderer.domElement.parentNode) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update texture when panoramaUrl changes
  useEffect(() => {
    if (panoramaUrl && materialRef.current) {
      textureLoaderRef.current.load(panoramaUrl, (texture) => {
        materialRef.current.map = texture;
        materialRef.current.needsUpdate = true;
      });
    }
  }, [panoramaUrl]);

  // Update camera rotation when rotation changes
  useEffect(() => {
    if (rotation && cameraRef.current) {
      cameraRef.current.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }, [rotation]);

  return (
    <div className="border border-gray-700 rounded overflow-hidden shadow-inner bg-black" style={{ width: 300, height: 170 }}>
      <div ref={mountRef} />
    </div>
  );
};

const AdminPanel = ({ data, setData }) => {
  const [viewers, setViewers] = useState([]);
  const [newImage, setNewImage] = useState(null);
  const [showAddScenario, setShowAddScenario] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioImg, setNewScenarioImg] = useState(null);

  useEffect(() => {
    // Join as admin
    socket.emit('join', { role: 'admin' });

    const handleViewerList = (list) => {
      setViewers(list);
    };

    const handleViewerGaze = (data) => {
      setViewers(prev => prev.map(v => v.socketId === data.socketId ? { ...v, rotation: data.rotation } : v));
    };

    socket.on('viewer-list', handleViewerList);
    socket.on('server-viewer-gaze', handleViewerGaze);

    return () => {
      socket.off('viewer-list', handleViewerList);
      socket.off('server-viewer-gaze', handleViewerGaze);
    };
  }, []);


  const handleCreateScenario = async () => {
    if(!newScenarioName || !newScenarioImg) return;
    const formData = new FormData();
    formData.append('image', newScenarioImg);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const { imageUrl } = await res.json();
    
    const newScen = {
      id: 'scen-' + Date.now(),
      name: newScenarioName,
      panoramaUrl: imageUrl,
      isHidden: false
    };
    
    const newData = { ...data, scenarios: [...data.scenarios, newScen] };
    await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    setData(newData);
    setNewScenarioName('');
    setNewScenarioImg(null);
    setShowAddScenario(false);
  };

  const handleToggleScenario = async (id) => {
    const newData = { ...data, scenarios: data.scenarios.map(s => s.id === id ? { ...s, isHidden: !s.isHidden } : s) };
    await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    setData(newData);
  };
  
  const handleDeleteScenario = async (id) => {
    const newData = { ...data, scenarios: data.scenarios.filter(s => s.id !== id) };
    await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    setData(newData);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">Tableau de Bord Administrateur</h1>
        <a href="/" className="text-blue-600 hover:text-blue-800 mb-8 inline-block font-medium">&larr; Retour au Site</a>
        
        {/* Real-time Monitoring & Control Room */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl mb-8 border border-slate-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 border-b border-slate-700 pb-3 gap-2">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                Régie de Contrôle VR (Cinéma)
              </h2>
              <p className="text-sm text-slate-400">Contrôlez les casques VR et observez leur regard en temps réel.</p>
            </div>
            <span className="bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold px-3 py-1.5 rounded-full self-start sm:self-center">
              {viewers.length} Casque(s) connecté(s)
            </span>
          </div>

          {viewers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a13.916 13.916 0 00-1.5-.09l-.054-.09M12 11c1.744 2.772 2.753 5.955 2.753 9.571m-3.44-2.04L12 21m0-10a3 3 0 110-6 3 3 0 010 6z" />
              </svg>
              <p className="font-medium text-base">Aucun casque de visionnage connecté</p>
              <p className="text-xs text-slate-500 mt-1">Lancez la visite virtuelle sur un another appareil pour démarrer la synchronisation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {viewers.map((viewer) => {
                const currentScen = data.scenarios.find(s => s.id === viewer.activeScenarioId);
                return (
                  <div key={viewer.socketId} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-3">
                      <span className="font-bold text-blue-400 text-sm">{viewer.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {currentScen ? currentScen.name : 'Scénario inconnu'}
                      </span>
                    </div>
                    
                    <GazeMirror 
                      panoramaUrl={currentScen ? currentScen.panoramaUrl : null} 
                      rotation={viewer.rotation} 
                    />
                    
                    <p className="text-xs text-slate-500 mt-2 italic text-center w-full truncate">
                      Image : {currentScen ? currentScen.panoramaUrl.split('/').pop() : 'Aucune'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8">
          
          {/* Scenarios */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h2 className="text-2xl font-bold text-gray-800">Scénarios VR (Pièces)</h2>
              <span className="bg-gray-200 text-gray-800 text-sm font-bold px-3 py-1 rounded-full">{data.scenarios.length} Scénario(s)</span>
            </div>

            {data.scenarios.length === 0 && !showAddScenario && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 mb-4">0 Scénarios trouvés. Commencez par en ajouter un !</p>
                <button onClick={() => setShowAddScenario(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow transition-transform hover:scale-105">
                  + Ajouter un Scénario
                </button>
              </div>
            )}

            {(showAddScenario || data.scenarios.length > 0) && (
              <div className="mb-8 p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-bold mb-4 text-blue-800">Nouveau Scénario</h3>
                <input type="text" placeholder="Nom de la pièce (ex: Salon)" value={newScenarioName} onChange={e => setNewScenarioName(e.target.value)} className="border p-2 w-full mb-3 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"/>
                <input type="file" accept="image/*" onChange={e => setNewScenarioImg(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-gray-100 cursor-pointer mb-3"/>
                <div className="flex gap-2">
                  <button onClick={handleCreateScenario} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded">Créer le scénario</button>
                  {data.scenarios.length > 0 && showAddScenario && (
                    <button onClick={() => setShowAddScenario(false)} className="bg-gray-400 hover:bg-gray-500 text-white font-bold px-4 py-2 rounded">Annuler</button>
                  )}
                </div>
              </div>
            )}

            {data.scenarios.length > 0 && !showAddScenario && (
               <button onClick={() => setShowAddScenario(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow mb-6 w-full">
                 + Ajouter un autre Scénario
               </button>
            )}

            <ul className="space-y-4">
              {data.scenarios.map(s => (
                <li key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <img src={s.panoramaUrl} className="w-16 h-16 object-cover rounded mr-4 border" />
                    <div>
                      <p className="font-bold text-lg text-gray-800">{s.name}</p>
                      <p className={`text-xs font-bold ${s.isHidden ? 'text-red-500' : 'text-green-500'}`}>{s.isHidden ? 'Masqué' : 'Visible'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <button 
                      onClick={() => socket.emit('admin-select-scenario', s.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors shadow-sm shadow-blue-500/30"
                    >
                      Projeter (VR)
                    </button>
                    <button onClick={() => handleToggleScenario(s.id)} className={`${s.isHidden ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} text-white px-3 py-1.5 rounded text-sm font-medium transition-colors`}>
                      {s.isHidden ? 'Afficher' : 'Masquer'}
                    </button>
                    <button onClick={() => handleDeleteScenario(s.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">Supprimer</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [data, setData] = useState({ images: [], scenarios: [] });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(e => console.error(e));

    const checkHash = () => {
      setIsAdmin(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', checkHash);
    checkHash();
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  if (isAdmin) {
    return <AdminPanel data={data} setData={setData} />;
  }

  // Loading Screen: Wait until scenarios list is fetched
  if (data.scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de la visite virtuelle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App bg-black">
      <VRScene 
        scenarios={data.scenarios} 
        initialScenarioId={data.scenarios.find(s => !s.isHidden)?.id} 
      />
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
