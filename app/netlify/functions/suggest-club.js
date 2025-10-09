// Netlify Function to accept club suggestions
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }
  if (!payload.name || !payload.sport || !payload.county || !payload.address || !payload.email) {
    return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Missing required fields' }) };
  }
  // Append to suggestions log (Netlify functions have /tmp writable)
  try {
    const entry = { ...payload, ts: Date.now() };
    const p = path.join('/tmp', 'suggestions.log');
    fs.appendFileSync(p, JSON.stringify(entry) + '\n');
  } catch (e) { console.error('Failed to append to /tmp log', e); }
  // Try to send email if SMTP env vars are present
  try {
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT?parseInt(process.env.SMTP_PORT,10):587, secure: process.env.SMTP_PORT==='465', auth: process.env.SMTP_USER?{user:process.env.SMTP_USER, pass:process.env.SMTP_PASS}:undefined });
      const subject = `Club suggestion: ${payload.name || 'Unnamed'}`;
      const lines = [];
      lines.push(`Club Name: ${payload.name || ''}`);
      lines.push(`Sport: ${payload.sport || ''}`);
      lines.push(`County: ${payload.county || ''}`);
      lines.push(`Address: ${payload.address || ''}`);
      if (payload.website) lines.push(`Website: ${payload.website}`);
      if (payload.email) lines.push(`Contact Email: ${payload.email}`);
      if (payload.notes) { lines.push('', 'Notes:'); lines.push(payload.notes); }
      await transporter.sendMail({ from: process.env.SUGGEST_FROM || 'noreply@example.com', to: process.env.SUGGEST_TO || 'hello@davidhall.io', subject, text: lines.join('\n') });
    }
  } catch (e) { console.error('Email send failed', e); }
  return { statusCode: 200, body: JSON.stringify({ ok:true }) };
};
