// Netlify Function to accept club suggestions
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  // Robust parsing: accept JSON, form-encoded, or base64-encoded bodies.
  let payload = {};
  try {
    let bodyStr = event.body || '';
    if (event.isBase64Encoded) {
      bodyStr = Buffer.from(bodyStr, 'base64').toString('utf8');
    }
    try {
      payload = JSON.parse(bodyStr || '{}');
    } catch (jsonErr) {
      // Fallback: try URL-encoded form data
      try {
        payload = Object.fromEntries(new URLSearchParams(bodyStr || ''));
      } catch (e2) {
        // Give up; return clearer error for logs
        console.error('Failed to parse request body as JSON or form-encoded', jsonErr, e2);
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid request body' }) };
      }
    }
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid request body' }) };
  }
  // Accept simplified payload: description (notes) and email required
  if (!payload.notes || !payload.email) {
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
  const subject = `Club suggestion`;
  const lines = [];
  lines.push(`Description: ${payload.notes || ''}`);
  lines.push(`Contact Email: ${payload.email || ''}`);
      await transporter.sendMail({ from: process.env.SUGGEST_FROM || 'noreply@example.com', to: process.env.SUGGEST_TO || 'hello@davidhall.io', subject, text: lines.join('\n') });
    }
  } catch (e) { console.error('Email send failed', e); }
  return { statusCode: 200, body: JSON.stringify({ ok:true }) };
};
