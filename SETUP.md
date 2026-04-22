# TasteBueno — Setup Guide

## What You Need Before Going Live

### 1. Stripe Account
Go to https://dashboard.stripe.com → sign up (free).

**Get your API keys** (Dashboard → Developers → API keys):
- Publishable key: starts with `pk_live_...`
- Secret key: starts with `sk_live_...`

**Create products & prices** for every item:
Go to Dashboard → Products → Add product.
For each product, add a "one-time" price.
Copy the Price ID (starts with `price_...`).

Prices to create:
| Product | Price |
|---|---|
| Custom Stencil 11×14" Card Stock | $24.95 |
| Custom Stencil 11×14" Plastic | $34.95 |
| Custom Stencil 22×28" Card Stock | $49.95 |
| Custom Stencil 22×28" Plastic | $64.95 |
| Art Print 8×10" | $19.95 |
| Art Print 11×14" | $29.95 |
| Art Print 18×24" | $49.95 |
| Sticker Single | $3.95 |
| Sticker 5-Pack | $14.95 |
| Sticker 10-Pack | $24.95 |
| Spray Paint Black | $8.95 |
| Spray Paint White | $8.95 |
| Spray Paint Red | $8.95 |
| Spray Paint Bundle | $22.95 |
| Original Artwork | (your price) |

After creating prices, paste the Price IDs into:
- **shop.html** — find `data-price-id="REPLACE_WITH_STRIPE_PRICE_ID"` and replace for each product
- **.env** on Netlify — add the four stencil price IDs as env vars (see below)

---

### 2. Cloudinary Account (for custom stencil image storage)
Go to https://cloudinary.com → sign up (free tier is plenty).

1. Note your **Cloud name** (shown on dashboard)
2. Go to Settings → Upload → Add upload preset
   - Set it to **Unsigned**
   - Name it something like `tastebueno_uploads`
   - Set folder to `tastebueno_orders`
   - Save

Then open **custom.html** and replace:
```js
window.CLOUDINARY_CLOUD_NAME = 'REPLACE_WITH_YOUR_CLOUDINARY_CLOUD_NAME';
window.CLOUDINARY_UPLOAD_PRESET = 'REPLACE_WITH_YOUR_UPLOAD_PRESET';
```

---

### 3. Deploy to Netlify
1. Go to https://netlify.com → sign up (free)
2. Drag the entire `tastebueno` folder onto the Netlify dashboard
   (or connect your GitHub repo)
3. Once deployed, go to **Site settings → Environment variables** and add:

```
STRIPE_SECRET_KEY         = sk_live_...
STRIPE_PUBLISHABLE_KEY    = pk_live_...
CLOUDINARY_CLOUD_NAME     = your_cloud_name
CLOUDINARY_UPLOAD_PRESET  = tastebueno_uploads
URL                       = https://your-site.netlify.app  (or your custom domain)

# Stencil price IDs from Stripe
STRIPE_PRICE_STENCIL_11x14_CARD    = price_...
STRIPE_PRICE_STENCIL_11x14_PLASTIC = price_...
STRIPE_PRICE_STENCIL_22x28_CARD    = price_...
STRIPE_PRICE_STENCIL_22x28_PLASTIC = price_...
```

4. Run `npm install` in the `tastebueno` folder (or Netlify does this automatically)
5. Trigger a redeploy after adding env vars

---

### 4. Connect Your Domain (tastebueno.com)
Netlify → Domain management → Add custom domain → follow DNS instructions.

---

### 5. Replace Placeholder Content

| What to replace | Where |
|---|---|
| Hero product photo | `index.html` — hero-visual section |
| Custom stencil before/after photo | `index.html` — custom-cta-preview section |
| About photo | `index.html` — about-img section |
| Product photos | `shop.html` — replace emoji placeholders with `<img>` tags |
| Instagram/TikTok links | Footer `href="#"` links in both files |
| Contact email | Search `hello@tastebueno.com` and replace |
| Reviews | Update reviewer names/text in `index.html` if desired |

---

### Testing Checklist
- [ ] Use Stripe test mode first (`pk_test_...` / `sk_test_...`) — Stripe provides them automatically
- [ ] Test card: `4242 4242 4242 4242`, any future expiry, any CVC
- [ ] Test a standard product add to cart → checkout
- [ ] Test a custom stencil design → order
- [ ] Check your Stripe dashboard shows the test orders
- [ ] Switch to live keys when ready
