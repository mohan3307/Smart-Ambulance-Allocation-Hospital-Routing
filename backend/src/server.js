import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import { DataStore } from './services/dataStore.js';
import { initSocketManager } from './services/socketManager.js';
import { RoutingSimulator } from './services/routingSimulator.js';
import { broadcastEvent } from './services/socketManager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import { seedDemoUsersIfConnected } from './controllers/authController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../frontend/dist');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// API Endpoints
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Smart Ambulance Core API', timestamp: new Date() });
});

// Serve frontend build
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize WebSockets
initSocketManager(io);

// Background Telemetry Simulation Loop
// Advances active dispatched ambulances along their waypoints rapidly (every 1.2 seconds)
setInterval(async () => {
  try {
    const ambulances = await DataStore.getAmbulances();
    const activeUnits = ambulances.filter(
      (a) =>
        (a.status === 'En_Route_Scene' || a.status === 'En_Route_Hospital') &&
        a.activeRoute &&
        a.activeRoute.length > 0
    );

    for (const amb of activeUnits) {
      let currentIndex = amb.routeProgressIndex || 0;
      const maxIndex = amb.activeRoute.length - 1;

      if (currentIndex < maxIndex) {
        // Fast progress: dynamic step so the entire mission completes in ~12 to 15 seconds
        const step = Math.max(1, Math.ceil(maxIndex / 12));
        currentIndex = Math.min(maxIndex, currentIndex + step);
        const nextCoord = amb.activeRoute[currentIndex];
        const { remainingKm, etaMinutes } = RoutingSimulator.computeRemainingETA(
          amb.activeRoute,
          currentIndex,
          amb.location?.speedKmH || 48,
          amb.trafficDelayFactor || 1.0
        );

        let newStatus = amb.status;
        const sceneWaypointIndex = Math.floor(amb.activeRoute.length * 0.45);
        if (currentIndex >= sceneWaypointIndex && currentIndex < sceneWaypointIndex + step * 2 && amb.status === 'En_Route_Scene') {
          newStatus = 'On_Scene';
          if (amb.currentIncidentId) {
            await DataStore.updateIncident(amb.currentIncidentId, { status: 'On_Scene' });
            broadcastEvent('incident:status_changed', {
              incidentId: amb.currentIncidentId,
              status: 'On_Scene',
              message: 'Ambulance on scene. Paramedics assessing vitals and boarding patient.',
            });
          }
        } else if (currentIndex >= sceneWaypointIndex + step * 2 && (amb.status === 'En_Route_Scene' || amb.status === 'On_Scene')) {
          newStatus = 'En_Route_Hospital';
          if (amb.currentIncidentId) {
            await DataStore.updateIncident(amb.currentIncidentId, { status: 'En_Route_Hospital' });
            broadcastEvent('incident:status_changed', {
              incidentId: amb.currentIncidentId,
              status: 'En_Route_Hospital',
              message: 'Patient safely loaded into ambulance. En route to hospital trauma bay with sirens active.',
            });
          }
        } else if (currentIndex >= maxIndex) {
          newStatus = 'Arrived_Hospital';
          if (amb.currentIncidentId) {
            await DataStore.updateIncident(amb.currentIncidentId, { 
              status: 'Arrived_Hospital',
              patientSafe: true,
            });
            broadcastEvent('incident:status_changed', {
              incidentId: amb.currentIncidentId,
              status: 'Arrived_Hospital',
              patientSafe: true,
              message: '✅ PATIENT SAFE & ADMITTED at hospital trauma bay.',
            });
          }
        }

        await DataStore.updateAmbulance(amb.id || amb._id, {
          location: {
            latitude: nextCoord.latitude,
            longitude: nextCoord.longitude,
            heading: amb.location?.heading || 0,
            speedKmH: amb.location?.speedKmH || 48,
          },
          routeProgressIndex: currentIndex,
          status: newStatus,
        });

        broadcastEvent('ambulance:position_updated', {
          ambulanceId: amb.id || amb._id,
          callSign: amb.callSign,
          latitude: nextCoord.latitude,
          longitude: nextCoord.longitude,
          routeProgressIndex: currentIndex,
          remainingKm,
          etaMinutes,
          status: newStatus,
          currentIncidentId: amb.currentIncidentId,
        });
      }
    }
  } catch (err) {
    // Ignore simulation cycle errors
  }
}, 1200);

const startServer = async () => {
  await connectDB();
  await seedDemoUsersIfConnected();
  await DataStore.initialize();

  httpServer.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Smart Ambulance Core API running on http://localhost:${PORT}`);
    console.log(`📡 Real-time WebSockets Gateway active on port ${PORT}`);
    console.log(`🏥 8 Hospitals & 12 Ambulances loaded with live telemetry`);
    console.log(`=======================================================`);
  });
};

startServer();
