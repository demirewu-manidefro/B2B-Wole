import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, ShieldAlert, Phone, CreditCard, Lock, CheckCircle2 } from 'lucide-react';
import { socketService } from '../services/socket';

export default function RfqChatModal({ product, currentPersona, onClose, showToast }) {
  const [messages, setMessages] = useState([
    { id: 1, senderId: 'system', text: `🔒 Duplex Negotiation Room initialized for SKU #${product?.id || 1}: ${product?.title || 'Wholesale Manifest'}. All communications are monitored by Section 5.4 Regex Scrubber to prevent offline banking or phone contact bypasses.` }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef(null);

  const roomId = `rfq_room_${product?.id || 1}`;

  useEffect(() => {
    socketService.connect(currentPersona.id);
    socketService.joinRoom(roomId);

    const handleMessage = (data) => {
      setMessages((prev) => [...prev, { id: Date.now(), senderId: data.senderId, text: data.message }]);
    };

    const handleScrubberAlert = (data) => {
      showToast(`🛡️ [Section 5.4 Regex Interception] Prohibited offline contact detected (${data.violations?.join(', ')}). Message scrubbed to protect Escrow integrity! Logged to audit_logs table.`, 'warning');
    };

    socketService.on('rfq:message', handleMessage);
    socketService.on('security:scrubber_alert', handleScrubberAlert);

    return () => {
      socketService.off('rfq:message', handleMessage);
      socketService.off('security:scrubber_alert', handleScrubberAlert);
    };
  }, [roomId, currentPersona.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputMsg.trim()) return;

    socketService.sendMessage(roomId, inputMsg.trim(), currentPersona.id);
    setInputMsg('');
  };

  const sendScrubberTest = (testType) => {
    let testMsg = '';
    if (testType === 'phone') {
      testMsg = "Hello Sara! Please call my personal phone +251911223344 or 0911223344 so we can bypass platform escrow commission.";
    } else if (testType === 'bank') {
      testMsg = "Transfer 5000 ETB directly to my Commercial Bank of Ethiopia (CBE) account 1000987654321 or Telebirr account right now.";
    }

    socketService.sendMessage(roomId, testMsg, currentPersona.id);
    showToast(`🚀 Dispatched Section 5.4 Regex Scrubber test (${testType.toUpperCase()}). Watch the server intercept and obfuscate!`, 'warning');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content !max-w-[750px]" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>

        <div className="flex items-center gap-2 text-ali-gold font-bold text-xs uppercase mb-1">
          <MessageSquare size={16} />
          <span>Real-Time Duplex Negotiation Room — Socket.io Room: #{roomId}</span>
        </div>
        <h2 className="text-xl font-extrabold text-white mb-1">{product?.title || 'Wholesale Manifest'}</h2>
        <p className="text-xs text-text-muted mb-4 flex items-center gap-2">
          <span>Active Persona: <strong className="text-white">{currentPersona.role.toUpperCase()} (ID #{currentPersona.id})</strong></span>
          <span>•</span>
          <span className="text-accent-emerald flex items-center gap-1"><Lock size={12}/> Section 5.4 Scrubber Engine Active</span>
        </p>

        {/* Section 5.4 Regex Scrubber Test Buttons Bar */}
        <div className="bg-bg-main p-3 rounded-xl border border-ali-red/40 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-bold text-ali-red flex items-center gap-1.5">
            <ShieldAlert size={16} /> Section 5.4 Regex Scrubber Test Shortcuts:
          </span>
          <div className="flex gap-2">
            <button 
              type="button" 
              className="btn btn-secondary btn-sm !text-xs !py-1 !px-2.5 hover:border-ali-red"
              onClick={() => sendScrubberTest('phone')}
            >
              <Phone size={13} className="text-ali-red" />
              <span>Test Phone # Scrubber</span>
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm !text-xs !py-1 !px-2.5 hover:border-ali-gold"
              onClick={() => sendScrubberTest('bank')}
            >
              <CreditCard size={13} className="text-ali-gold" />
              <span>Test CBE Bank Scrubber</span>
            </button>
          </div>
        </div>

        {/* Chat Window */}
        <div className="chat-window mb-4">
          <div className="chat-messages-box">
            {messages.map((m) => {
              const isSystem = m.senderId === 'system';
              const isMine = Number(m.senderId) === Number(currentPersona.id);
              return (
                <div 
                  key={m.id} 
                  className={`chat-bubble ${isSystem ? 'system' : isMine ? 'mine' : 'other'}`}
                >
                  {!isSystem && (
                    <div className="text-[10px] font-mono opacity-70 mb-1">
                      {isMine ? 'You (Persona ID #' + currentPersona.id + ')' : 'Participant (ID #' + m.senderId + ')'}
                    </div>
                  )}
                  <div>{m.text}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-bg-secondary border-t border-border-glass flex gap-2">
            <input 
              type="text" 
              className="form-input !py-2.5 !bg-bg-main flex-1 text-sm" 
              placeholder="Type negotiation proposals, custom unit pricing, or bulk delivery terms..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
            />
            <button type="submit" className="btn btn-gold !px-5">
              <Send size={16} />
              <span>Send</span>
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-text-muted flex items-center justify-center gap-1">
          <ShieldAlert size={13} className="text-ali-red" /> Any attempt to share 09/07 phone numbers, CBE 1000 accounts, or Telegram links is automatically replaced with [PLATFORM PROTECTED INFO].
        </p>
      </div>
    </div>
  );
}
