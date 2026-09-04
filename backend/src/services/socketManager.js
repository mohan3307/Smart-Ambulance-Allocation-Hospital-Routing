let ioInstance = null;

export const initSocketManager = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join specialized rooms
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`[WebSocket] Client ${socket.id} joined room: ${room}`);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      console.log(`[WebSocket] Client ${socket.id} left room: ${room}`);
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
