/* Custom stencil checkout — creates a Stripe session with order details in metadata */
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Prices mirrored from the frontend — source of truth is your Stripe dashboard
const PRICES = {
  "11x14": { "Card Stock": 2495, "Plastic": 3495 },
  "22x28": { "Card Stock": 4995, "Plastic": 6495 },
};

// Stripe Price IDs for each variant — create these in your Stripe dashboard
// Dashboard → Products → Add product → Add price (one-time)
const PRICE_IDS = {
  "11x14": {
    "Card Stock": process.env.STRIPE_PRICE_STENCIL_11x14_CARD    || "REPLACE_WITH_STRIPE_PRICE_ID",
    "Plastic":    process.env.STRIPE_PRICE_STENCIL_11x14_PLASTIC  || "REPLACE_WITH_STRIPE_PRICE_ID",
  },
  "22x28": {
    "Card Stock": process.env.STRIPE_PRICE_STENCIL_22x28_CARD    || "REPLACE_WITH_STRIPE_PRICE_ID",
    "Plastic":    process.env.STRIPE_PRICE_STENCIL_22x28_PLASTIC  || "REPLACE_WITH_STRIPE_PRICE_ID",
  },
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  const { size, material, quantity, halftoneUrl, originalUrl, topText, botText, fontSize, inverted, bgRemoved, filename } = body;

  if (!PRICES[size] || !PRICES[size][material]) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid size or material" }) };
  }

  const priceId = PRICE_IDS[size][material];
  if (priceId.startsWith("REPLACE_")) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Stripe price IDs not configured. See .env.example and SETUP.md." })
    };
  }

  const qty = Math.max(1, Math.min(99, parseInt(quantity) || 1));

  // Build metadata (Stripe limits each value to 500 chars)
  const metadata = {
    size,
    material,
    inverted:    inverted   ? "Yes" : "No",
    bg_removed:  bgRemoved  ? "Yes" : "No",
    filename:    (filename || "").slice(0, 200),
    top_text:    (topText  || "").slice(0, 200),
    bottom_text: (botText  || "").slice(0, 200),
    font_size:   fontSize || "medium",
  };
  if (halftoneUrl) metadata.halftone_url = halftoneUrl.slice(0, 500);
  if (originalUrl) metadata.original_url = originalUrl.slice(0, 500);

  try {
    const base = process.env.URL || "https://tastebueno.com";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price: priceId,
        quantity: qty,
      }],
      mode: "payment",
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/custom.html`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "NZ"],
      },
      allow_promotion_codes: true,
      metadata,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
