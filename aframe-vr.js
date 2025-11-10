window.addEventListener('DOMContentLoaded', () => {
    const scenes = {
        living_room: {
            image: "./public/1.jpg",
            hotspots: [
                {
                    position: "-3 1.5 -1",
                    target: "kitchen",
                    label: "Go to Kitchen"
                }
            ]
        },
        kitchen: {
            image: "./public/2.jpg",
            hotspots: [
                {
                    position: "3 1.5 -1",
                    target: "living_room",
                    label: "Go to Living Room"
                }
            ]
        }
    };

    const sky = document.getElementById('sky');
    const navVRContainer = document.getElementById('nav-vr-container');

    function loadScene(sceneName) {
        const scene = scenes[sceneName];
        sky.setAttribute('src', scene.image);

        // Clear existing hotspots
        while (navVRContainer.firstChild) {
            navVRContainer.removeChild(navVRContainer.firstChild);
        }

        // Add new hotspots
        scene.hotspots.forEach(hotspot => {
            const hotspotEl = document.createElement('a-entity');
            hotspotEl.setAttribute('position', hotspot.position);

            const box = document.createElement('a-box');
            box.setAttribute('color', '#f00');
            box.setAttribute('scale', '0.5 0.5 0.5');
            hotspotEl.appendChild(box);

            const text = document.createElement('a-text');
            text.setAttribute('value', hotspot.label);
            text.setAttribute('align', 'center');
            text.setAttribute('position', '0 -1 0');
            hotspotEl.appendChild(text);

            hotspotEl.addEventListener('click', () => {
                loadScene(hotspot.target);
            });
            navVRContainer.appendChild(hotspotEl);
        });
    }

    loadScene('living_room');
});