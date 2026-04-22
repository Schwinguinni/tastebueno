require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

/* ── Stripe price IDs for custom stencils ─────────────────────── */
const STENCIL_PRICE_IDS = {
  '11x14': {
    'Card Stock': process.env.STRIPE_PRICE_STENCIL_11x14_CARD    || 'REPLACE',
    'Plastic':    process.env.STRIPE_PRICE_STENCIL_11x14_PLASTIC  || 'REPLACE',
  },
  '22x28': {
    'Card Stock': process.env.STRIPE_PRICE_STENCIL_22x28_CARD    || 'REPLACE',
    'Plastic':    process.env.STRIPE_PRICE_STENCIL_22x28_PLASTIC  || 'REPLACE',
  },
};

/* ── Standard cart checkout ───────────────────────────────────── */
app.post('/api/create-checkout', async (req, res) => {
  const { items } = req.body || {};
  if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });

  const missing = items.find(i => !i.priceId || i.priceId.startsWith('REPLACE'));
  if (missing) return res.status(400).json({ error: `"${missing.name}" has no Stripe price ID yet — add it in the admin.` });

  try {
    const base = process.env.URL || `http://localhost:${PORT}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(i => ({ price: i.priceId, quantity: i.qty || 1 })),
      mode: 'payment',
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/cancel.html`,
      shipping_address_collection: { allowed_countries: ['US','CA','GB','AU','NZ'] },
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Custom stencil checkout ──────────────────────────────────── */
app.post('/api/custom-checkout', async (req, res) => {
  const { size, material, quantity, halftoneUrl, originalUrl, inverted, bgRemoved, filename } = req.body || {};
  if (!STENCIL_PRICE_IDS[size]?.[material]) return res.status(400).json({ error: 'Invalid size or material' });

  const priceId = STENCIL_PRICE_IDS[size][material];
  if (priceId === 'REPLACE') return res.status(400).json({ error: 'Stripe stencil price IDs not configured — see .env' });

  try {
    const base = process.env.URL || `http://localhost:${PORT}`;
    const qty = Math.max(1, Math.min(99, parseInt(quantity) || 1));
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: qty }],
      mode: 'payment',
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/custom.html`,
      shipping_address_collection: { allowed_countries: ['US','CA','GB','AU','NZ'] },
      allow_promotion_codes: true,
      metadata: {
        size, material,
        inverted:   inverted  ? 'Yes' : 'No',
        bg_removed: bgRemoved ? 'Yes' : 'No',
        filename: (filename || '').slice(0, 200),
        ...(halftoneUrl && { halftone_url: halftoneUrl.slice(0, 500) }),
        ...(originalUrl && { original_url: originalUrl.slice(0, 500) }),
      },
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Products API ─────────────────────────────────────────────── */
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

app.get('/api/products', (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8')));
  } catch {
    res.json({ products: [] });
  }
});

app.post('/api/admin/products', (req, res) => {
  const { password, products } = req.body || {};
  if (password !== (process.env.ADMIN_PASSWORD || 'admin')) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  // Password-only verification (no products payload) — just confirm auth
  if (!Array.isArray(products)) {
    return res.json({ success: true });
  }
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify({ products }, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Image upload ─────────────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/admin/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: '/images/' + req.file.filename });
  });
});

/* ── Start ────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║  TasteBueno — local dev server         ║
  ║  Shop:  http://localhost:${PORT}          ║
  ║  Admin: http://localhost:${PORT}/admin.html ║
  ╚════════════════════════════════════════╝
  `);
});
