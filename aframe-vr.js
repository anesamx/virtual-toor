
const scenes = {
  '1': { image: './public/1.jpg', hotspots: { '2': { text: 'Go to scene 2', position: '-3 1.5 -1' }, '3': { text: 'Go to scene 3', position: '3 1.5 -1' } } },
  '2': { image: './public/2.jpg', hotspots: { '1': { text: 'Go back to scene 1', position: '3 1.5 -1' } } },
  '3': { image: './public/3.jpg', hotspots: { '1': { text: 'Go back to scene 1', position: '-3 1.5 -1' } } }
};

let currentScene = '1';

function createHotspot(scene, hotspotId) {
  const hotspot = document.createElement('a-entity');
  hotspot.setAttribute('geometry', 'primitive: sphere; radius: 0.2');
  hotspot.setAttribute('material', 'color: red; transparent: true; opacity: 0.5');
  hotspot.setAttribute('position', scenes[scene].hotspots[hotspotId].position);
  hotspot.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2');
  hotspot.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');

  hotspot.addEventListener('click', () => {
    currentScene = hotspotId;
    updateScene();
  });

  const text = document.createElement('a-text');
  text.setAttribute('value', scenes[scene].hotspots[hotspotId].text);
  text.setAttribute('look-at', '[camera]');
  text.setAttribute('scale', '0.5 0.5 0.5');
  text.setAttribute('position', '0 0.4 0');
  hotspot.appendChild(text);

  return hotspot;
}

function updateScene() {
  const sky = document.getElementById('sky');
  const navContainer = document.getElementById('nav-vr-container');

  sky.setAttribute('src', scenes[currentScene].image);
  navContainer.innerHTML = '';

  for (const hotspotId in scenes[currentScene].hotspots) {
    const hotspot = createHotspot(currentScene, hotspotId);
    navContainer.appendChild(hotspot);
  }
}

window.onload = () => {
  updateScene();
};
