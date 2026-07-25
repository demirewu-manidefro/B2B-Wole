/**
 * Socket.io Client Handler
 * Manages real-time RFQ negotiations, live messaging, and security alert toasts.
 */
class SocketClient {
  constructor() {
    this.socket = null;
    this.activeRoomId = null;
  }

  init() {
    if (typeof io === 'undefined') {
      console.warn('Socket.io library not loaded yet.');
      return;
    }

    this.socket = io();

    this.socket.on('connect', () => {
      console.log('⚡ Connected to real-time Socket.io server:', this.socket.id);
    });

    this.socket.on('receive_message', (msg) => {
      window.dispatchEvent(new CustomEvent('socket_receive_message', { detail: msg }));
    });

    this.socket.on('system_notice', (notice) => {
      window.dispatchEvent(new CustomEvent('socket_system_notice', { detail: notice }));
    });

    // Section 5.4 Chat Scrubber Intervention Alert
    this.socket.on('security_alert', (alertData) => {
      window.dispatchEvent(new CustomEvent('socket_security_alert', { detail: alertData }));
    });

    this.socket.on('price_proposal_updated', (data) => {
      window.dispatchEvent(new CustomEvent('socket_price_proposal', { detail: data }));
    });

    this.socket.on('order_status_broadcast', (data) => {
      window.dispatchEvent(new CustomEvent('socket_order_broadcast', { detail: data }));
    });
  }

  joinRoom(roomId, userId, userName, role) {
    if (!this.socket) this.init();
    this.activeRoomId = roomId;
    this.socket.emit('join_room', { room_id: roomId, user_id: userId, user_name: userName, role });
  }

  sendMessage(text, userId, userName, role) {
    if (!this.socket || !this.activeRoomId) return;
    this.socket.emit('send_message', {
      room_id: this.activeRoomId,
      text,
      user_id: userId,
      user_name: userName,
      role
    });
  }

  proposePrice(rfqId, newPrice, userName, role) {
    if (!this.socket) return;
    this.socket.emit('propose_price', { rfq_id: rfqId, new_price: newPrice, user_name: userName, role });
  }

  emitEscrowChange(orderId, txRef, newStatus, updatedBy) {
    if (!this.socket) return;
    this.socket.emit('escrow_state_change', { order_id: orderId, tx_ref: txRef, new_status: newStatus, updated_by: updatedBy });
  }
}

const SOCKET = new SocketClient();
window.SOCKET = SOCKET;
document.addEventListener('DOMContentLoaded', () => SOCKET.init());
