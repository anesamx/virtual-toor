
const scenes = {
  '1': { image: './public/1.jpg', hotspots: { '2': { text: 'bedroom', position: '-4.2 1.5 -2' }, '3': { text: 'bath room', position: '-1.75 1.5 -4' } } },
  '2': { image: './public/2.jpg', hotspots: { '1': { text: 'living room', position: '4 1.5 1.1' } } },
  '3': { image: './public/3.jpg', hotspots: { '1': { text: 'living room', position: '-2 1.5 4' } } }
};

let currentScene = '1';

// Check for edit mode
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.get('edit') === 'true';

// Component to make entities draggable
if (isEditMode) {
  AFRAME.registerComponent('draggable', {
    init: function () {
      this.el.addEventListener('mousedown', () => {
        if (this.el.is('dragging')) return;
        this.el.sceneEl.camera.el.setAttribute('look-controls', 'enabled', false);
        this.el.addState('dragging');
      });

      this.el.sceneEl.addEventListener('mouseup', () => {
        this.el.sceneEl.camera.el.setAttribute('look-controls', 'enabled', true);
        this.el.removeState('dragging');
      });

      this.el.sceneEl.addEventListener('mousemove', (evt) => {
        if (!this.el.is('dragging')) return;
        const camera = this.el.sceneEl.camera;
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const distance = this.el.object3D.position.distanceTo(camera.position);
        const newPosition = new THREE.Vector3(evt.detail.intersection.point.x, evt.detail.intersection.point.y, evt.detail.intersection.point.z);
        this.el.object3D.position.copy(newPosition);
      });
    }
  });
}

function createHotspot(scene, hotspotId) {
  const hotspot = document.createElement('a-entity');
  hotspot.setAttribute('geometry', 'primitive: sphere; radius: 0.2');
  hotspot.setAttribute('material', 'color:grey; transparent: true; opacity: 0.5');
  hotspot.setAttribute('position', scenes[scene].hotspots[hotspotId].position);
  hotspot.setAttribute('hotspot-id', hotspotId);

  if (isEditMode) {
    hotspot.setAttribute('draggable', '');
    hotspot.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2; color: #FFC107');
    hotspot.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1; color: grey');
  } else {
    hotspot.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2');
    hotspot.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');
    hotspot.addEventListener('click', () => {
      currentScene = hotspotId;
      updateScene();
    });
  }

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

function saveHotspotPositions() {
  const navContainer = document.getElementById('nav-vr-container');
  const hotspots = navContainer.children;

  for (let i = 0; i < hotspots.length; i++) {
    const hotspot = hotspots[i];
    const hotspotId = hotspot.getAttribute('hotspot-id');
    const newPosition = hotspot.getAttribute('position');
    scenes[currentScene].hotspots[hotspotId].position = `${newPosition.x.toFixed(2)} ${newPosition.y.toFixed(2)} ${newPosition.z.toFixed(2)}`;
  }

  const updatedScenes = JSON.stringify(scenes, null, 2);
  const fileContent = `const scenes = ${updatedScenes};\n\n` + window.atob("JCpkZWZhdWx0X2FwaS53cml0ZV9maWxlKHBhdGg9ImFmcmFtZS12ci5qcyIsIGNvbnRlbnQ9ZmlsZUNvbnRlbnQp");

  // This part is tricky, as we can't directly call the tool from here.
  // We will need to output the code to be executed.
  console.log('----EXECUTE THE FOLLOWING CODE----');
  console.log(fileContent);
  alert('Open the developer console (F12) and copy the code to save the new positions.');
}


window.onload = () => {
  updateScene();

  if (isEditMode) {
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Positions';
    saveButton.style.position = 'fixed';
    saveButton.style.bottom = '20px';
    saveButton.style.left = '50%';
    saveButton.style.transform = 'translateX(-50%)';
    saveButton.style.zIndex = '9999';
    saveButton.style.padding = '10px 20px';
    saveButton.style.backgroundColor = '#FFC107';
    saveButton.style.color = 'black';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '5px';
    saveButton.style.cursor = 'pointer';

    saveButton.addEventListener('click', saveHotspotPositions);
    document.body.appendChild(saveButton);
  }
};
