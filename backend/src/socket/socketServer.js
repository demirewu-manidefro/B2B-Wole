const { Server } = require('socket.io');
const scrubber = require('../utils/scrubber');
const db = require('../db');

/**
 * Section 2.2 & 5.4 Real-Time Duplex Communication & Chat Scrubber
 * Configures Socket.io for live buyer-vendor RFQ negotiations and chat.
 * Pipes all messaging packets through regular expression scrubbers before broadcasting.
 */
function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io Connected] Client ID: ${socket.id}`);

    // Join a specific RFQ negotiation room or general channel
    socket.on('join_room', ({ room_id, user_id, user_name, role }) => {
      socket.join(`room_${room_id}`);
      socket.data = { user_id, user_name, role, room_id };
      console.log(`👥 User '${user_name || user_id}' (${role}) joined room_${room_id}`);
      io.to(`room_${room_id}`).emit('system_notice', {
        message: `User '${user_name || 'Partner'}' joined the live negotiation session. Remember: Offline phone numbers and bank account transfers are prohibited and automatically scrubbed by platform guardrails.`
      });
    });

    // Section 5.4: Live Message Stream Scrubber
    socket.on('send_message', async ({ room_id, text, user_id, user_name, role }) => {
      try {
        const senderId = user_id || (socket.data ? socket.data.user_id : null);
        const senderName = user_name || (socket.data ? socket.data.user_name : 'Anonymous User');
        const senderRole = role || (socket.data ? socket.data.role : 'buyer');

        // Pipe packet through regular expression filters
        const scrubResult = await scrubber.scrubAndAudit(text, senderId, `SOCKET_ROOM_${room_id}`);

        const messagePayload = {
          id: `msg_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          room_id,
          sender_id: senderId,
          sender_name: senderName,
          sender_role: senderRole,
          text: scrubResult.scrubbedText,
          original_had_violation: scrubResult.hasViolation,
          violations: scrubResult.violations,
          timestamp: new Date().toISOString()
        };

        // Broadcast scrubbed packet to the room
        io.to(`room_${room_id}`).emit('receive_message', messagePayload);

        // If a violation was caught, emit a private warning back to the sender
        if (scrubResult.hasViolation) {
          socket.emit('security_alert', {
            severity: 'WARNING',
            title: 'Platform Guardrail Intervention',
            message: `Your message contained restricted contact details (${scrubResult.violations.join(', ')}). To protect escrow security and platform monetization, numbers and links were obfuscated to [PLATFORM PROTECTED INFO]. An incident was logged in the administrative audit trails.`,
            violations: scrubResult.violations
          });
        }
      } catch (err) {
        console.error('Socket send_message error:', err.message);
        socket.emit('error_notice', { message: 'Failed to process message packet.' });
      }
    });

    // Handle RFQ live price proposal broadcast
    socket.on('propose_price', ({ rfq_id, new_price, user_name, role }) => {
      io.to(`room_rfq_${rfq_id}`).emit('price_proposal_updated', {
        rfq_id,
        new_price: parseFloat(new_price),
        proposed_by: user_name || role,
        timestamp: new Date().toISOString()
      });
    });

    // Handle Escrow state transition broadcast
    socket.on('escrow_state_change', ({ order_id, tx_ref, new_status, updated_by }) => {
      io.emit('order_status_broadcast', {
        order_id,
        tx_ref,
        status: new_status,
        updated_by,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.io Disconnected] Client ID: ${socket.id}`);
    });
  });

  return io;
}

module.exports = {
  initSocketServer
};
