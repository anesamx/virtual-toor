const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const SERVER_SCRIPT = path.join(__dirname, 'server.js');
const LOG_FILE = path.join(__dirname, 'supervisor.log');
const NGROK_URL_FILE = path.join(__dirname, 'ngrok_url.txt');
const TUNNEL_JSON = path.join(__dirname, 'public', 'tunnel_info.json');

let serverProc = null;
let ngrokProc = null;
let isShuttingDown = false;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {}
}

// 1. Supervise VR Server (port 8080)
function startServer() {
  if (isShuttingDown) return;
  log('🛡️ [VR SERVER] Starting server.js on port 8080...');
  
  serverProc = spawn('node', [SERVER_SCRIPT], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env
  });

  serverProc.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    log(`⚠️ [VR SERVER] Process exited (Code: ${code}, Signal: ${signal}). Auto-restarting in 2s...`);
    setTimeout(checkAndStartServer, 2000);
  });

  serverProc.on('error', (err) => {
    if (isShuttingDown) return;
    log(`❌ [VR SERVER] Failed to spawn: ${err.message}. Retrying in 3s...`);
    setTimeout(checkAndStartServer, 3000);
  });
}

function checkAndStartServer() {
  if (isShuttingDown) return;
  const req = http.get('http://127.0.0.1:8080', (res) => {
    log('🛡️ [VR SERVER] Verified active on port 8080.');
  });
  req.on('error', () => {
    startServer();
  });
}

const SHARED_BIN_DIR = path.resolve(__dirname, '..', '..', 'bin');
const SHARED_NGROK_EXE = path.join(SHARED_BIN_DIR, 'ngrok.exe');
const SHARED_NGROK_CONFIG = path.join(SHARED_BIN_DIR, 'ngrok.yml');

// 2. Supervise ngrok tunnel (port 8080)
function startNgrok() {
  if (isShuttingDown) return;
  log('🌐 [NGROK] Starting ngrok http 8080...');
  
  const ngrokExe = fs.existsSync(SHARED_NGROK_EXE) ? SHARED_NGROK_EXE : 'ngrok';
  const args = ['http', '8080'];
  if (fs.existsSync(SHARED_NGROK_CONFIG)) {
    args.push('--config', SHARED_NGROK_CONFIG);
  }
  
  ngrokProc = spawn(ngrokExe, args, {
    cwd: __dirname,
    stdio: 'ignore', // run cleanly in background
    shell: false,
    env: process.env
  });

  ngrokProc.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    log(`⚠️ [NGROK] Process exited (Code: ${code}, Signal: ${signal}). Auto-restarting in 3s...`);
    setTimeout(checkAndStartNgrok, 3000);
  });

  ngrokProc.on('error', (err) => {
    if (isShuttingDown) return;
    log(`❌ [NGROK] Failed to spawn: ${err.message}. Retrying in 4s...`);
    setTimeout(checkAndStartNgrok, 4000);
  });

  pollNgrokUrl(10);
}

function checkAndStartNgrok() {
  if (isShuttingDown) return;
  const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
    log('🌐 [NGROK] ngrok tunnel is already active on port 4040.');
    pollNgrokUrl(5);
  });
  req.on('error', () => {
    startNgrok();
  });
}

// Poll ngrok local Web API (port 4040)
function pollNgrokUrl(retriesLeft) {
  if (isShuttingDown || retriesLeft <= 0) return;

  const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
    let raw = '';
    res.on('data', (chunk) => { raw += chunk; });
    res.on('end', () => {
      try {
        const data = JSON.parse(raw);
        const httpsTunnel = (data.tunnels || []).find((t) => t.proto === 'https');
        if (httpsTunnel && httpsTunnel.public_url) {
          const publicUrl = httpsTunnel.public_url;
          log(`\n======================================================`);
          log(`🚀 VR HEADSET PUBLIC HTTPS URL: ${publicUrl}`);
          log(`👑 ADMIN DASHBOARD: ${publicUrl}/#admin`);
          log(`======================================================\n`);
          
          fs.writeFileSync(NGROK_URL_FILE, publicUrl, 'utf8');
          try {
            fs.writeFileSync(TUNNEL_JSON, JSON.stringify({ public_url: publicUrl, updated: Date.now() }, null, 2));
          } catch (e) {}
          return;
        }
      } catch (e) {}
      setTimeout(() => pollNgrokUrl(retriesLeft - 1), 2000);
    });
  });

  req.on('error', () => {
    setTimeout(() => pollNgrokUrl(retriesLeft - 1), 2000);
  });
}

function shutdown() {
  isShuttingDown = true;
  log('🛑 Shutting down VR Supervisor and child processes...');
  if (serverProc) {
    try { serverProc.kill('SIGTERM'); } catch (e) {}
  }
  if (ngrokProc) {
    try { ngrokProc.kill('SIGTERM'); } catch (e) {}
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Launch supervisors
checkAndStartServer();
setTimeout(checkAndStartNgrok, 1500);
