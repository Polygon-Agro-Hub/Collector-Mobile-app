/**
 * BUDRY MFD-300 Scale Bridge � for Expo Go development
 * =====================================================
 * Connects to the scale via TCP on 192.168.1.23:33581
 * and serves live weight data over HTTP so Expo Go can poll it.
 *
 * Usage:
 *   node services/scale/scale-bridge.js
 *
 * Then in the CoDiNet app (Expo Go), enter:
 *   Bridge IP:   192.168.1.13   (your PC's IP on the Wi-Fi)
 *   Bridge Port: 3001
 */

const net  = require("net");
const http = require("http");
const os   = require("os");

const SCALE_IP        = "192.168.1.23";
const SCALE_PORT      = 33581;
const BRIDGE_PORT     = 3001;
const RECONNECT_MS    = 3000;

let currentWeight  = null;
let lastUpdateAt   = null;
let scaleConnected = false;
let reconnectTimer = null;
let scaleSocket    = null;

function parseScaleChunk(chunk) {
  const str = chunk.toString("utf8");
  const m = str.match(/([+-]?\s*\d+(?:\.\d+)?)\s*kg/i);
  if (m && m[1]) {
    const val = parseFloat(m[1].replace(/\s+/g, ""));
    if (!isNaN(val)) {
      if (val !== currentWeight) {
        console.log("Weight update: " + val + " kg");
      }
      currentWeight = val;
      lastUpdateAt = Date.now();
    }
  }
}

function connectToScale() {
  if (scaleSocket) {
    try { scaleSocket.destroy(); } catch (_) {}
    scaleSocket = null;
  }

  console.log("Connecting to scale at " + SCALE_IP + ":" + SCALE_PORT + "...");
  const sock = new net.Socket();
  sock.setTimeout(7000);

  sock.connect(SCALE_PORT, SCALE_IP, function() {
    console.log("Scale connected - receiving live stream");
    scaleConnected = true;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  });

  sock.on("data", function(chunk) { parseScaleChunk(chunk); });

  sock.on("timeout", function() {
    console.warn("Scale socket timed out, reconnecting...");
    sock.destroy();
  });

  sock.on("error", function(err) {
    if (!scaleConnected) {
      console.error("Scale connection error: " + err.message);
    }
    scaleConnected = false;
    scheduleReconnect();
  });

  sock.on("close", function() {
    scaleConnected = false;
    scheduleReconnect();
  });

  scaleSocket = sock;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  console.log("Reconnecting to scale in " + (RECONNECT_MS / 1000) + "s...");
  reconnectTimer = setTimeout(function() {
    reconnectTimer = null;
    connectToScale();
  }, RECONNECT_MS);
}

const server = http.createServer(function(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/api/weight" || req.url === "/") {
    var stale = lastUpdateAt ? (Date.now() - lastUpdateAt) > 5000 : true;
    res.writeHead(200);
    res.end(JSON.stringify({
      weight:    currentWeight !== null ? currentWeight : 0,
      unit:      "kg",
      connected: scaleConnected,
      stale:     stale,
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(BRIDGE_PORT, "0.0.0.0", function() {
  var ifaces = os.networkInterfaces();
  var ips = [];
  for (var name in ifaces) {
    var list = ifaces[name];
    for (var i = 0; i < list.length; i++) {
      if (list[i].family === "IPv4" && !list[i].internal) {
        ips.push("  " + name + ": http://" + list[i].address + ":" + BRIDGE_PORT);
      }
    }
  }

  console.log("");
  console.log("======================================================");
  console.log("  CoDiNet Scale Bridge - running");
  console.log("======================================================");
  console.log("Bridge HTTP endpoints:");
  ips.forEach(function(l) { console.log(l); });
  console.log("");
  console.log("In the CoDiNet app (Expo Go), enter:");
  console.log("  IP Address : <your PC Wi-Fi IP above>");
  console.log("  Port       : " + BRIDGE_PORT);
  console.log("");
  console.log("Scale target: " + SCALE_IP + ":" + SCALE_PORT);
  console.log("======================================================");
  console.log("");

  connectToScale();
});
