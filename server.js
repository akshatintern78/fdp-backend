const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const config = require('./src/config');
const { sequelize, signatureDir, all, one } = require('./src/db');
const { signAdmin, signUser, requireAuth } = require('./src/auth');
const { amountInWords } = require('./src/words');
const { buildReceiptPdf } = require('./src/pdf');

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function publicUser(row) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    createdAt: row.created_at,
  };
}

function publicReceipt(row, signatureBase64) {
  return {
    id: Number(row.id),
    serialNo: Number(row.serial_no),
    date: String(row.receipt_date).slice(0, 10),
    fullName: row.full_name,
    address: row.address,
    mobile: row.mobile,
    amount: Number(row.amount),
    amountInWords: row.amount_in_words,
    paymentRef: row.payment_ref,
    fundraiserName: row.fundraiser_name || '',
    hasSignature: Boolean(row.signature_file),
    signatureBase64: signatureBase64 || null,
    createdAt: row.created_at,
  };
}

function readSignature(file) {
  if (!file || !fs.existsSync(file)) return null;
  return fs.readFileSync(file).toString('base64');
}

function normalizeMobile(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

function requireText(value, label, min, max) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (text.length < min) return { error: `${label} is required` };
  if (text.length > max) return { error: `${label} is too long` };
  return { value: text };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/admin/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (email !== config.adminEmail || password !== config.adminPassword) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }
  res.json({ token: signAdmin() });
});

app.get('/api/admin/users', requireAuth('admin'), asyncRoute(async (req, res) => {
  const rows = await all('SELECT id, name, email, mobile, created_at FROM users ORDER BY id DESC');
  res.json({ users: rows.map(publicUser) });
}));

app.post('/api/admin/users', requireAuth('admin'), asyncRoute(async (req, res) => {
  const name = requireText(req.body?.name, 'Name', 2, 80);
  if (name.error) return res.status(400).json(name);
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  const password = String(req.body?.password || '');
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 72) return res.status(400).json({ error: 'Password is too long' });
  const mobile = normalizeMobile(req.body?.mobile);
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: 'Enter a 10-digit mobile number' });

  const existing = await one('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = await one(
    'INSERT INTO users (name, email, password_hash, mobile) VALUES (?, ?, ?, ?) RETURNING id, name, email, mobile, created_at',
    [name.value, email, passwordHash, mobile],
  );
  res.status(201).json({ user: publicUser(user) });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = await one('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }
  res.json({
    token: signUser(user),
    user: publicUser(user),
  });
}));

app.get('/api/auth/me', requireAuth('user'), asyncRoute(async (req, res) => {
  const user = await one('SELECT id, name, email, mobile, created_at FROM users WHERE id = ?', [req.auth.id]);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  res.json({ user: publicUser(user) });
}));

function receiptForUser(id, userId) {
  return one('SELECT * FROM receipts WHERE id = ? AND user_id = ?', [id, userId]);
}

app.get('/api/receipts', requireAuth('user'), asyncRoute(async (req, res) => {
  const rows = await all('SELECT * FROM receipts WHERE user_id = ? ORDER BY id DESC', [req.auth.id]);
  res.json({ receipts: rows.map((row) => publicReceipt(row)) });
}));

app.get('/api/receipts/:id', requireAuth('user'), asyncRoute(async (req, res) => {
  const row = await receiptForUser(Number(req.params.id), req.auth.id);
  if (!row) return res.status(404).json({ error: 'Receipt not found' });
  res.json({ receipt: publicReceipt(row, readSignature(row.signature_file)) });
}));

app.get('/api/receipts/:id/pdf', requireAuth('user'), asyncRoute(async (req, res) => {
  const row = await receiptForUser(Number(req.params.id), req.auth.id);
  if (!row) return res.status(404).json({ error: 'Receipt not found' });
  const pdf = await buildReceiptPdf(row);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${row.serial_no}.pdf"`);
  res.send(pdf);
}));

app.post('/api/receipts', requireAuth('user'), asyncRoute(async (req, res) => {
  const fullName = requireText(req.body?.fullName, 'Full name', 2, 80);
  if (fullName.error) return res.status(400).json(fullName);

  const addressLines = Array.isArray(req.body?.addressLines)
    ? req.body.addressLines.map((line) => String(line ?? '').trim().replace(/\s+/g, ' '))
    : String(req.body?.address || '').split(/\r?\n/).map((line) => line.trim());
  if (!addressLines[0]) return res.status(400).json({ error: 'Address is required' });
  if (addressLines.some((line) => line.length > 80)) {
    return res.status(400).json({ error: 'Each address line must be 80 characters or less' });
  }
  const address = addressLines.slice(0, 3).join('\n');

  const mobile = normalizeMobile(req.body?.mobile);
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: 'Enter a 10-digit mobile number' });

  const date = String(req.body?.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: 'Choose a valid date' });
  }

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }
  const rounded = Math.round(amount * 100) / 100;

  const wordsInput = requireText(req.body?.amountInWords, 'Amount in words', 3, 180);
  const words = wordsInput.error ? { value: amountInWords(rounded) } : wordsInput;

  const payment = requireText(req.body?.paymentRef, 'Cash, cheque, draft or GPay number', 2, 60);
  if (payment.error) return res.status(400).json(payment);

  const fundraiser = requireText(req.body?.fundraiserName, 'Fundraising name', 2, 80);
  if (fundraiser.error) return res.status(400).json(fundraiser);

  let signatureBuffer = null;
  if (req.body?.signatureBase64) {
    const raw = String(req.body.signatureBase64).replace(/^data:image\/\w+;base64,/, '');
    signatureBuffer = Buffer.from(raw, 'base64');
    if (!signatureBuffer.length || signatureBuffer.length > 1_500_000) {
      return res.status(400).json({ error: 'Signature image is too large' });
    }
    const isPng = signatureBuffer[0] === 0x89 && signatureBuffer[1] === 0x50;
    if (!isPng) return res.status(400).json({ error: 'Signature must be a PNG image' });
  }

  const row = await sequelize.transaction(async (transaction) => {
    const serial = await one('SELECT COALESCE(MAX(serial_no), 0) + 1 AS n FROM receipts', [], transaction);
    const inserted = await one(
      `INSERT INTO receipts
        (user_id, serial_no, receipt_date, full_name, address, mobile, amount, amount_in_words, payment_ref, fundraiser_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [req.auth.id, serial.n, date, fullName.value, address, mobile, rounded, words.value, payment.value, fundraiser.value],
      transaction,
    );
    if (signatureBuffer) {
      const signatureFile = path.join(signatureDir, `${inserted.id}.png`);
      fs.writeFileSync(signatureFile, signatureBuffer);
      return one('UPDATE receipts SET signature_file = ? WHERE id = ? RETURNING *', [signatureFile, inserted.id], transaction);
    }
    return inserted;
  });
  res.status(201).json({ receipt: publicReceipt(row, signatureBuffer ? signatureBuffer.toString('base64') : null) });
}));

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Something went wrong' });
});

sequelize
  .authenticate()
  .then(() => {
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`FDP API listening on http://localhost:${config.port}`);
      console.log(`Admin sign-in: ${config.adminEmail}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed. Run Information/setup.txt in pgAdmin, then npx sequelize-cli db:migrate');
    console.error(error.message);
    process.exit(1);
  });
