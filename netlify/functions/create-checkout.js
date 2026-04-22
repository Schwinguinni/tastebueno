/* Standard product checkout — receives cart items with Stripe Price IDs */
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let items;
  try {
    ({ items } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!items || !items.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "Cart is empty" }) };
  }

  // Validate all items have a priceId before calling Stripe
  const missing = items.filter(i => !i.priceId || i.priceId.startsWith("REPLACE_"));
  if (missing.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Product "${missing[0].name}" has no Stripe price ID yet. Add it in shop.html.` })
    };
  }

  try {
    const base = process.env.URL || "https://tastebueno.com";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map(item => ({
        price: item.priceId,
        quantity: item.qty || 1,
      })),
      mode: "payment",
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/cancel.html`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "NZ"],
      },
      allow_promotion_codes: true,
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
