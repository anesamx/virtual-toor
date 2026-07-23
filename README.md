# VR Architecture Portfolio - Virtual Tour

A real-time VR architecture portfolio viewer with a synchronized PC Admin dashboard for controlling VR viewer sessions.

## Features
- **Cinema VR Mode:** Direct immersive 360° VR experience.
- **Admin Control Room (`/#admin`):** Live gaze tracking & instant scene switching across all connected headsets.
- **Auto Image Optimization:** Server automatically compresses uploaded scenes to lightweight JPEG files using `sharp`.

## How to Start
Refer to [HOW_TO_START.md](file:///c:/dev/djef%20folder/vr%20model/virtual-toor/HOW_TO_START.md) for full setup and ngrok connection instructions.

```bash
# 1. Start local server
npm start

# 2. Expose via ngrok
ngrok http 8080
```