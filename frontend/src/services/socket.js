import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(userId = 1) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io({
      query: { userId },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log(`[Socket.io Connected] Socket ID: ${this.socket.id} (User ID: ${userId})`);
    });

    // Handle incoming chat messages
    this.socket.on('rfq:message', (data) => {
      this.emitToListeners('rfq:message', data);
    });

    // Handle Section 5.4 Scrubber Intervention Alerts
    this.socket.on('security:scrubber_alert', (data) => {
      console.warn('🛡️ [Socket Security Alert]:', data);
      this.emitToListeners('security:scrubber_alert', data);
    });

    // Handle Escrow state broadcasts
    this.socket.on('escrow:state_updated', (data) => {
      this.emitToListeners('escrow:state_updated', data);
    });

    // Handle Pricing updates
    this.socket.on('pricing:updated', (data) => {
      this.emitToListeners('pricing:updated', data);
    });
  }

  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join:room', { roomId });
      console.log(`[Socket.io] Joined room: ${roomId}`);
    }
  }

  sendMessage(roomId, message, senderId) {
    if (this.socket) {
      this.socket.emit('rfq:send_message', { roomId, message, senderId });
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emitToListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => callback(data));
    }
  }
}

export const socketService = new SocketService();
