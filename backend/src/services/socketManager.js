import { DataStore } from './dataStore.js';

let ioInstance = null;

export const initSocketManager = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join general rooms
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`[WebSocket] Client ${socket.id} joined room: ${room}`);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      console.log(`[WebSocket] Client ${socket.id} left room: ${room}`);
    });

    // 1. Role-Based Room Join
    socket.on('join_role', ({ role, id }) => {
      if (role === 'dispatcher') {
        socket.join('dispatch_room');
      } else if (role === 'hospital') {
        socket.join('hospital_room');
        if (id) socket.join(`hospital_${id}`);
      } else if (role === 'ambulance') {
        if (id) socket.join(`ambulance_${id}`);
        socket.join('dispatch_room'); // Ambulances also receive live corridor broadcasts
      }
      console.log(`[WebSocket] Client ${socket.id} registered as role: ${role} (id: ${id || 'global'})`);
    });

    // 2. Real-Time Ambulance GPS Stream (Driver/Tablet -> Server -> Dispatchers/ER)
    socket.on('ambulance:update_location', async (data) => {
      try {
        const { ambulanceId, coordinates, speedKmH, heading, remainingKm, etaMinutes, routeProgressIndex } = data;
        if (!ambulanceId || !coordinates) return;

        const updatePayload = {
          'location.type': 'Point',
          'location.coordinates': coordinates,
          'location.longitude': coordinates[0],
          'location.latitude': coordinates[1],
          'location.speedKmH': speedKmH || 45,
          'location.heading': heading || 0,
        };
        if (remainingKm !== undefined) updatePayload.remainingKm = remainingKm;
        if (etaMinutes !== undefined) updatePayload.etaMinutes = etaMinutes;
        if (routeProgressIndex !== undefined) updatePayload.routeProgressIndex = routeProgressIndex;

        await DataStore.updateAmbulance(ambulanceId, updatePayload);

        // Broadcast to all active dispatchers and hospital rooms in real time
        io.to('dispatch_room').emit('ambulance:position_updated', {
          ambulanceId,
          coordinates,
          speedKmH,
          heading,
          remainingKm,
          etaMinutes,
          routeProgressIndex,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[WebSocket] ambulance:update_location error:', err.message);
      }
    });

    // 3. Real-Time Hospital Bed / ICU Update from Hospital Staff
    socket.on('hospital:update_beds', async (data) => {
      try {
        const { hospitalId, erBedsAvailable, icuBedsAvailable, diversionStatus, notes } = data;
        if (!hospitalId) return;

        const updateData = {};
        if (erBedsAvailable !== undefined) updateData.erBedsAvailable = Number(erBedsAvailable);
        if (icuBedsAvailable !== undefined) updateData.icuBedsAvailable = Number(icuBedsAvailable);
        if (diversionStatus !== undefined) updateData.diversionStatus = Boolean(diversionStatus);

        const updatedHosp = await DataStore.updateHospitalBeds(hospitalId, updateData);

        // Broadcast updated capacity to all dispatchers and hospital screens instantly
        const broadcastPayload = {
          hospitalId,
          hospitalName: updatedHosp?.name,
          ...updateData,
          notes,
          timestamp: new Date().toISOString(),
        };

        io.emit('hospital:bed_updated', broadcastPayload);
        console.log(`[WebSocket] Broadcasted live bed update for hospital ${hospitalId}`);
      } catch (err) {
        console.error('[WebSocket] hospital:update_beds error:', err.message);
      }
    });

    // 4. Real-Time Ambulance Status Transition (Driver -> Dispatchers)
    socket.on('ambulance:update_status', async (data) => {
      try {
        const { ambulanceId, status, incidentId } = data;
        if (!ambulanceId || !status) return;

        await DataStore.updateAmbulance(ambulanceId, { status });
        if (incidentId) {
          await DataStore.updateIncident(incidentId, { status });
        }

        io.emit('ambulance:status_changed', {
          ambulanceId,
          status,
          incidentId,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[WebSocket] ambulance:update_status error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });
};

export const broadcastEvent = (event, data, room = null) => {
  if (!ioInstance) return;
  if (room) {
    ioInstance.to(room).emit(event, data);
  } else {
    ioInstance.emit(event, data);
  }
};

export const getIO = () => ioInstance;
