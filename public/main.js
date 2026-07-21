const { useState, useEffect, useRef } = React;

// Initialize Socket.io client
const socket = io();

// Helper to draw text on a canvas for 3D UI
function createTextCanvas(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = '40px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas;
}

const VRScene = ({ scenarios, initialScenarioId, onExit }) => {
  const mountRef = useRef(null);
  const loadScenarioRef = useRef(null);
  
  const visibleScenarios = scenarios.filter(s => !s.isHidden);

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
    if (typeof VRButton !== 'undefined') {
      vrButton = VRButton.createButton(renderer);
      document.body.appendChild(vrButton);
    } else {
      console.warn('VRButton not found - skipping WebXR initialization');
    }

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 0, 0.1);
    controls.update();

    const textureLoader = new THREE.TextureLoader();
    const sphereGeometry = new THREE.SphereGeometry(500, 60, 40);
    sphereGeometry.scale(-1, 1, 1);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    const loadScenario = (id) => {
      const s = scenarios.find(x => x.id === id);
      if (s) {
        textureLoader.load(s.panoramaUrl, (texture) => {
          sphereMaterial.map = texture;
          sphereMaterial.needsUpdate = true;
          // Notify socket server of local scene change
          socket.emit('viewer-scene-change', { activeScenarioId: id });
        });
      }
    };
    
    // Make function available to React component for the Sidebar
    loadScenarioRef.current = loadScenario;
    
    loadScenario(activeId);

    // Listen to admin scene changes
    socket.on('server-change-scenario', (scenarioId) => {
      loadScenario(scenarioId);
    });

    // Create 3D Menu (for VR headset users)
    const menuGroup = new THREE.Group();
    menuGroup.position.set(0, 1.5, -3); // Floating in front
    scene.add(menuGroup);

    const raycaster = new THREE.Raycaster();
    const clickMouse = new THREE.Vector2();
    const buttons = [];

    visibleScenarios.forEach((s, index) => {
      const canvas = createTextCanvas(s.name);
      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const geo = new THREE.PlaneGeometry(1, 0.25);
      const mesh = new THREE.Mesh(geo, mat);
      
      mesh.position.y = -index * 0.3;
      mesh.userData = { scenarioId: s.id };
      menuGroup.add(mesh);
      buttons.push(mesh);
    });

    const onMouseClick = (event) => {
      clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(clickMouse, camera);
      const intersects = raycaster.intersectObjects(buttons);
      if (intersects.length > 0) {
        loadScenario(intersects[0].object.userData.scenarioId);
      }
    };
    // We only attach this click on the canvas so it doesn't conflict with sidebar clicks
    renderer.domElement.addEventListener('click', onMouseClick);
    
    // VR Controllers raycasting setup
    const onSelect = (event) => {
      const controller = event.target;
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      const intersects = raycaster.intersectObjects(buttons);
      if (intersects.length > 0) {
        loadScenario(intersects[0].object.userData.scenarioId);
      }
    };

    const controller1 = renderer.xr.getController(0);
    controller1.addEventListener('select', onSelect);
    scene.add(controller1);
    
    const controller2 = renderer.xr.getController(1);
    controller2.addEventListener('select', onSelect);
    scene.add(controller2);
    
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -5)
    ]);
    const line = new THREE.Line(geometry);
    line.name = 'line';
    controller1.add(line.clone());
    controller2.add(line.clone());

    let lastGazeUpdate = 0;
    const gazeUpdateInterval = 80; // ~12 fps is enough for responsive updates without lagging the app

    const animate = () => {
      renderer.setAnimationLoop(() => {
        controls.update();
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
      renderer.domElement.removeEventListener('click', onMouseClick);
      if (vrButton && vrButton.parentNode) {
        vrButton.parentNode.removeChild(vrButton);
      }
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []); // Run once on mount

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <button 
        onClick={onExit}
        style={{ position: 'absolute', top: 20, left: 20, zIndex: 999 }}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-lg transition-transform hover:scale-105"
      >
        Quitter la VR
      </button>
      
      {/* Interactive Sidebar for Desktop/Mobile Viewers */}
      <div 
        className="absolute top-0 right-0 h-full w-64 bg-black/80 border-l border-gray-700 p-4 overflow-y-auto"
        style={{ zIndex: 900 }}
      >
        <h2 className="text-white text-xl font-bold mb-6 text-center border-b border-gray-600 pb-2">Scénarios</h2>
        {visibleScenarios.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">Aucun scénario disponible.</p>
        ) : (
          visibleScenarios.map(s => (
            <div 
              key={s.id} 
              onClick={() => { if(loadScenarioRef.current) loadScenarioRef.current(s.id); }} 
              className="cursor-pointer mb-6 transform transition-all hover:scale-105 group"
            >
              <div className="relative overflow-hidden rounded-lg shadow-lg border-2 border-transparent group-hover:border-blue-500">
                <img src={s.panoramaUrl} alt={s.name} className="w-full h-32 object-cover" />
                <div className="absolute bottom-0 w-full bg-black/60 p-2">
                  <p className="text-white text-sm font-semibold text-center">{s.name}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div ref={mountRef}></div>
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

  const handleUploadImage = async () => {
    if(!newImage) return;
    const formData = new FormData();
    formData.append('image', newImage);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const { imageUrl } = await res.json();
    
    const newData = { ...data, images: [...data.images, imageUrl] };
    await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    setData(newData);
    setNewImage(null);
  };

  const handleDeleteImage = async (url) => {
    const newData = { ...data, images: data.images.filter(i => i !== url) };
    await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    setData(newData);
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Landing Images */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Images de la Page d'Accueil</h2>
            <div className="mb-6 flex gap-2">
              <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>
              <button onClick={handleUploadImage} className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded shadow transition-colors whitespace-nowrap">Ajouter</button>
            </div>
            
            {data.images.length === 0 ? (
              <p className="text-gray-500 italic">Aucune image.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-4">
                {data.images.map((img, i) => (
                  <li key={i} className="relative group rounded overflow-hidden shadow-sm border">
                    <img src={img} className="w-full h-32 object-cover" />
                    <button onClick={() => handleDeleteImage(img)} className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">Supprimer</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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

const Landing = ({ images, onEnterVR }) => {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col relative overflow-hidden">
      
      {/* Navbar */}
      <nav className="relative z-20 flex justify-between items-center p-6 bg-black/60 backdrop-blur-md border-b border-gray-800">
        <div className="text-3xl font-extrabold tracking-widest text-white">djef vr</div>
        <button 
          onClick={() => window.location.hash = '#admin'} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-lg transition-colors font-semibold border border-blue-500"
        >
          Gérer les Scénarios
        </button>
      </nav>

      {/* Background blur effect if images exist */}
      {images.length > 0 && (
        <div className="absolute inset-0 z-0 opacity-20">
          <img src={images[0]} className="w-full h-full object-cover blur-sm" />
        </div>
      )}

      <div className="relative z-10 flex-grow flex flex-col">
        <header className="text-center py-20">
          <h1 className="text-6xl font-extrabold tracking-tight mb-4 drop-shadow-lg">Villa Moderne</h1>
          <p className="text-2xl font-light text-gray-300 drop-shadow-md">Un chef-d'œuvre architectural époustouflant.</p>
        </header>

        <main className="container mx-auto px-6 flex-grow flex flex-col items-center">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
            {images.map((img, idx) => (
              <div key={idx} className="group relative overflow-hidden rounded-xl shadow-2xl transition-transform duration-300 hover:-translate-y-2">
                <img src={img} alt={`Projet ${idx}`} className="w-full h-72 object-cover" />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300"></div>
              </div>
            ))}
          </div>
          
          {images.length === 0 && (
             <div className="p-8 border-2 border-dashed border-gray-600 rounded-xl">
               <p className="text-gray-400 text-lg">Aucune image téléchargée pour le moment.</p>
             </div>
          )}

          <div className="text-center mt-20 mb-10">
            <button 
              onClick={onEnterVR}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-full text-2xl shadow-xl shadow-blue-900/50 transition duration-300 ease-in-out transform hover:scale-105"
            >
              Entrer dans la Visite Virtuelle
            </button>
          </div>
        </main>

        <footer className="text-center py-8 bg-black/40 backdrop-blur-md border-t border-gray-800">
          <p className="text-gray-400">&copy; 2024 VR Portfolio. Tous droits réservés.</p>
          <button onClick={() => window.location.hash = '#admin'} className="text-gray-500 text-sm mt-4 hover:text-white transition-colors">Connexion Admin</button>
        </footer>
      </div>
    </div>
  );
};

const App = () => {
  const [data, setData] = useState({ images: [], scenarios: [] });
  const [showVR, setShowVR] = useState(false);
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

  return (
    <div className="App bg-black">
      {showVR ? (
        <VRScene 
          scenarios={data.scenarios} 
          initialScenarioId={data.scenarios.find(s => !s.isHidden)?.id} 
          onExit={() => setShowVR(false)} 
        />
      ) : (
        <Landing images={data.images} onEnterVR={() => setShowVR(true)} />
      )}
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
