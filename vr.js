let viewer;

function enterVRTour() {
    // Initialize Pannellum
    viewer = pannellum.viewer('panorama', {
        "default": {
            "firstScene": "living_room",
            "author": "Your Name",
        },
        "scenes": {
            "living_room": {
                "title": "Living Room",
                "hfov": 110,
                "pitch": -3,
                "yaw": 0,
                "type": "equirectangular",
                "panorama": "./public/1.jpg",
                "hotSpots": [
                    {
                        "pitch": -2,
                        "yaw": 120,
                        "type": "scene",
                        "text": "Go to Kitchen",
                        "sceneId": "kitchen"
                    }
                ]
            },
            "kitchen": {
                "title": "Kitchen", 
                "hfov": 110,
                "pitch": -5,
                "yaw": 180,
                "type": "equirectangular",
                "panorama": "./public/2.jpg",
                "hotSpots": [
                    {
                        "pitch": -3,
                        "yaw": -100,
                        "type": "scene", 
                        "text": "Back to Living Room",
                        "sceneId": "living_room"
                    }
                ]
            }
        }
    });
}

function exitVRTour() {
    if(viewer) {
        viewer.destroy();
    }
    window.location.href = "index.html";
}

enterVRTour();