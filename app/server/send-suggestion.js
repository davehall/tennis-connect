#!/usr/bin/env node
// Simple Express dev endpoint to receive club suggestions and either send email via SMTP
// (if SMTP_* env vars provided) or append to a local file (suggestions.log).
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
// Accept cross-origin requests from a local static server during development
app.use(cors());
app.use(bodyParser.json({ limit: '256kb' }));

const SUGGESTIONS_LOG = path.join(__dirname, '..', 'assets', 'data', 'suggestions.log');

async function trySendEmail(payload) {
  const host = process.env.SMTP_HOST;
  if (!host) return false;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SUGGEST_FROM || 'noreply@example.com';
  const to = process.env.SUGGEST_TO || 'hello@davidhall.io';

  const transporter = nodemailer.createTransport({ host, port, secure: port===465, auth: user ? { user, pass } : undefined });
  const subject = `Club suggestion: ${payload.name || 'Unnamed'}`;
  const lines = [];
  lines.push(`Club Name: ${payload.name || ''}`);
  lines.push(`Sport: ${payload.sport || ''}`);
  lines.push(`County: ${payload.county || ''}`);
  lines.push(`Address: ${payload.address || ''}`);
  if (payload.website) lines.push(`Website: ${payload.website}`);
  if (payload.email) lines.push(`Contact Email: ${payload.email}`);
  if (payload.notes) { lines.push('', 'Notes:'); lines.push(payload.notes); }
  const body = lines.join('\n');

  await transporter.sendMail({ from, to, subject, text: body });
  return true;
}

app.post('/api/suggest-club', async (req, res) => {
  try {
    const payload = req.body || {};
    // Simplified validation: require description (notes) and email
    if (!payload.notes || !payload.email) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    // Append to local log as JSON line for auditing
    try {
      const entry = { ...payload, ts: Date.now() };
      fs.appendFileSync(SUGGESTIONS_LOG, JSON.stringify(entry) + '\n');
    } catch (err) {
      console.error('Failed to append suggestion to log', err);
    }
    // Try to send email if SMTP configured; don't treat failure as fatal
    try {
      const emailed = await trySendEmail(payload);
      if (emailed) {
        return res.json({ ok: true, emailed: true });
      }
    } catch (e) {
      console.error('Email sending failed', e);
    }
    return res.json({ ok: true, emailed: false });
  } catch (err) {
    console.error('Suggest handler error', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5173;
app.listen(port, () => console.log(`Suggest dev server listening on http://localhost:${port}`));
