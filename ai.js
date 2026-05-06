import { Hono } from "hono@4";
import { cors } from 'hono/cors';
import { readFileSync } from 'fs';

const app = new Hono();
app.use("/*", cors());

// ── SERVE STATIC HTML FILES ──
app.get("/", (c) => {
  try {
    const html = readFileSync('./index.html', 'utf8');
    return c.html(html);
  } catch(e) {
    return c.text("index.html not found: " + e.message, 404);
  }
});

app.get("/app", (c) => {
  try {
    const html = readFileSync('./app.html', 'utf8');
    return c.html(html);
  } catch(e) {
    return c.text("app.html not found: " + e.message, 404);
  }
});

app.get("/app.html", (c) => {
  try {
    const html = readFileSync('./app.html', 'utf8');
    return c.html(html);
  } catch(e) {
    return c.text("app.html not found: " + e.message, 404);
  }
});

app.get("/privacy", (c) => {
  try { return c.html(readFileSync('./privacy.html', 'utf8')); }
  catch(e) { return c.text("Not found", 404); }
});

app.get("/terms", (c) => {
  try { return c.html(readFileSync('./terms.html', 'utf8')); }
  catch(e) { return c.text("Not found", 404); }
});

// ── AI PROXY ──
app.post("/api/ai", async (c) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;
  if(!apiKey) return c.json({ error: { message: "API key not configured." } }, 500);
  try {
    const body = await c.req.json();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return c.json(data, response.status);
  } catch(error) {
    return c.json({ error: { message: error.message } }, 500);
  }
});

// ── CREATE CHECKOUT SESSION ──
app.post("/api/create-checkout", async (c) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if(!stripeSecret || !priceId) return c.json({ error: "Stripe not configured." }, 500);
  try {
    const { email, userId } = await c.req.json();
    const params = new URLSearchParams({
      'mode': 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': 'https://chefbidpro.com/app?upgrade=success',
      'cancel_url': 'https://chefbidpro.com/app?upgrade=cancelled',
      'customer_email': email,
      'client_reference_id': userId,
      'metadata[userId]': userId
    });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const session = await response.json();
    if(session.error) return c.json({ error: session.error.message }, 400);
    return c.json({ url: session.url });
  } catch(error) {
    return c.json({ error: error.message }, 500);
  }
});

// ── VERIFY SUBSCRIPTION ──
app.post("/api/verify-subscription", async (c) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if(!stripeSecret) return c.json({ isPro: false }, 500);
  try {
    const { email } = await c.req.json();
    const custRes = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { "Authorization": `Bearer ${stripeSecret}` }
    });
    const custData = await custRes.json();
    if(!custData.data?.length) return c.json({ isPro: false });
    const customerId = custData.data[0].id;
    const subRes = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`, {
      headers: { "Authorization": `Bearer ${stripeSecret}` }
    });
    const subData = await subRes.json();
    return c.json({ isPro: subData.data?.length > 0 });
  } catch(error) {
    return c.json({ isPro: false });
  }
});

// ── CANCEL SUBSCRIPTION ──
app.post("/api/cancel-subscription", async (c) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if(!stripeSecret) return c.json({ error: "Not configured" }, 500);
  try {
    const { email } = await c.req.json();
    const custRes = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { "Authorization": `Bearer ${stripeSecret}` }
    });
    const custData = await custRes.json();
    if(!custData.data?.length) return c.json({ error: "Customer not found" }, 404);
    const subRes = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${custData.data[0].id}&status=active&limit=1`, {
      headers: { "Authorization": `Bearer ${stripeSecret}` }
    });
    const subData = await subRes.json();
    if(!subData.data?.length) return c.json({ error: "No active subscription" }, 404);
    const cancelRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subData.data[0].id}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${stripeSecret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "cancel_at_period_end=true"
    });
    const cancelData = await cancelRes.json();
    return c.json({ success: true, endsAt: cancelData.current_period_end });
  } catch(error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/debug", (c) => {
  const key = process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;
  return c.json({ hasKey: !!key, keyStart: key ? key.slice(0,12) : 'NOT FOUND' });
});

Bun.serve({
  port: import.meta.env.PORT ?? 3000,
  fetch: app.fetch,
});
