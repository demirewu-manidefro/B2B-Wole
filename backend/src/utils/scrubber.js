const db = require('../db');

/**
 * Section 5.4 Multi-tenant Chat & Communication Scrubbers
 * Pipes data streams through regular expression filters to detect and obfuscate
 * Ethiopian phone numbers, bank accounts, and external links to prevent offline banking
 * and personal phone negotiations from bypassing the escrow system.
 */

// Regex patterns for Ethiopian commerce communications
const ETH_PHONE_REGEX = /\b(?:\+?251|0)[79]\d{8}\b|\b09\d{2}[-\s]?\d{3}[-\s]?\d{3}\b|\b07\d{2}[-\s]?\d{3}[-\s]?\d{3}\b/gi;
const BANK_ACCOUNT_REGEX = /\b(?:1000\d{9}|0132\d{8}|\d{10,16})\b/g; // CBE 13-digit accounts starting with 1000, Telebirr, Awash
const EXTERNAL_LINK_REGEX = /(?:https?:\/\/|www\.)[^\s]+|\b[a-zA-Z0-9.-]+\.(?:com|et|me|net|org|io)\b|(?:t\.me|wa\.me|telegram|whatsapp)[^\s]*/gi;
const KEYWORD_REGEX = /\b(?:telebirr me|send to cbe|call me on|my phone|direct deposit|offline transfer|personal account)\b/gi;

/**
 * Scrubs a text string and logs any security violations to the audit trail.
 * @param {string} text - The input message string from Socket.io or RFQ notes.
 * @param {number} userId - The ID of the user sending the message.
 * @param {string} context - The context where the message was sent (e.g., 'SOCKET_CHAT', 'RFQ_NOTE').
 * @returns {Promise<{scrubbedText: string, hasViolation: boolean, violations: string[]}>}
 */
async function scrubAndAudit(text, userId = null, context = 'SOCKET_CHAT') {
  if (!text || typeof text !== 'string') {
    return { scrubbedText: text, hasViolation: false, violations: [] };
  }

  let scrubbedText = text;
  const violations = [];

  // Check Phone Numbers
  if (scrubbedText.match(ETH_PHONE_REGEX)) {
    violations.push('PHONE_NUMBER_DETECTED');
    scrubbedText = scrubbedText.replace(ETH_PHONE_REGEX, '[PLATFORM PROTECTED INFO]');
  }

  // Check Bank Accounts
  if (scrubbedText.match(BANK_ACCOUNT_REGEX)) {
    violations.push('BANK_ACCOUNT_DETECTED');
    scrubbedText = scrubbedText.replace(BANK_ACCOUNT_REGEX, '[PLATFORM PROTECTED INFO]');
  }

  // Check External Links
  if (scrubbedText.match(EXTERNAL_LINK_REGEX)) {
    violations.push('EXTERNAL_LINK_DETECTED');
    scrubbedText = scrubbedText.replace(EXTERNAL_LINK_REGEX, '[PLATFORM PROTECTED INFO]');
  }

  // Check Risky Keywords
  if (scrubbedText.match(KEYWORD_REGEX)) {
    violations.push('OFFLINE_TRANSACTION_KEYWORD');
    scrubbedText = scrubbedText.replace(KEYWORD_REGEX, '[PLATFORM PROTECTED INFO]');
  }

  const hasViolation = violations.length > 0;

  // Log to audit trail if violation detected
  if (hasViolation) {
    try {
      const detailsMsg = `User attempted offline negotiation in ${context}. Violations flagged: ${violations.join(', ')}. Original snippet: "${text.substring(0, 80)}..."`;
      await db.query(
        `INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4);`,
        [userId, 'CHAT_SECURITY_SCRUB', 'WARNING', detailsMsg]
      );
      console.warn(`🛡️ [Scrubber Audit Alert] User ${userId} flagged for: ${violations.join(', ')}`);
    } catch (err) {
      console.error('Failed to log scrubber violation to audit_logs:', err.message);
    }
  }

  return {
    scrubbedText,
    hasViolation,
    violations
  };
}

module.exports = {
  scrubAndAudit,
  ETH_PHONE_REGEX,
  BANK_ACCOUNT_REGEX,
  EXTERNAL_LINK_REGEX
};
