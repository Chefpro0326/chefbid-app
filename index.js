import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFileSync } from "fs";
// ChefBid PRO v4 - Clean build

const app = new Hono();
app.use("/*", cors());

app.get("/", (c) => {
  try { return c.html(readFileSync("./index.html", "utf8")); }
  catch(e) { return c.text("index.html not found: " + e.message, 404); }
});

app.get("/app", (c) => {
  try { return c.html(readFileSync("./app.html", "utf8")); }
  catch(e) { return c.text("app.html not found: " + e.message, 404); }
});

app.get("/app.html", (c) => {
  try { return c.html(readFileSync("./app.html", "utf8")); }
  catch(e) { return c.text("Not found", 404); }
});

app.get("/privacy", (c) => {
  try { return c.html(readFileSync("./privacy.html", "utf8")); }
  catch(e) { return c.text("Not found", 404); }
});

app.get("/terms", (c) => {
  try { return c.html(readFileSync("./terms.html", "utf8")); }
  catch(e) { return c.text("Not found", 404); }
});

app.get("/debug", (c) => {
  const anthropicKey = Bun.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const stripeSecret = Bun.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const priceId      = Bun.env.STRIPE_PRICE_ID   || process.env.STRIPE_PRICE_ID;
  const basicPriceId = Bun.env.STRIPE_BASIC_PRICE_ID || process.env.STRIPE_BASIC_PRICE_ID;
  const bunKeys      = Object.keys(Bun.env);
  return c.json({
    hasAnthropicKey: !!anthropicKey,
    hasStripeSecret: !!stripeSecret,
    stripeStart:     stripeSecret ? stripeSecret.slice(0,12) : "NOT FOUND",
    hasPriceId:      !!priceId,
    hasBasicPriceId: !!basicPriceId,
    totalBunEnv:     bunKeys.length,
    stripeInBunEnv:  bunKeys.filter(k => k.includes('STRIPE'))
  });
});

app.post("/api/ai", async (c) => {
  const apiKey = Bun.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
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
  } catch(e) {
    return c.json({ error: { message: e.message } }, 500);
  }
});

app.post("/api/create-checkout", async (c) => {
  const stripeSecret = Bun.env.STRIPE_SECRET_KEY     || process.env.STRIPE_SECRET_KEY;
  const priceIdPro   = Bun.env.STRIPE_PRICE_ID       || process.env.STRIPE_PRICE_ID;
  const priceIdBasic = Bun.env.STRIPE_BASIC_PRICE_ID || process.env.STRIPE_BASIC_PRICE_ID;
  if(!stripeSecret || !priceIdPro) {
    return c.json({
      error: "Stripe not configured.",
      debug: {
        hasSecret: !!stripeSecret,
        hasPriceId: !!priceIdPro,
        stripeInBun: Object.keys(Bun.env).filter(k => k.includes('STRIPE'))
      }
    }, 500);
  }
  try {
    const { email, userId, plan } = await c.req.json();
    const selectedPrice = (plan === "basic" && priceIdBasic) ? priceIdBasic : priceIdPro;
    const params = new URLSearchParams({
      "mode": "subscription",
      "payment_method_types[0]": "card",
      "line_items[0][price]": selectedPrice,
      "line_items[0][quantity]": "1",
      "success_url": "https://chefbidpro.com/app?upgrade=success&plan=" + (plan || "pro"),
      "cancel_url": "https://chefbidpro.com/app?upgrade=cancelled",
      "customer_email": email,
      "client_reference_id": userId,
      "metadata[userId]": userId,
      "metadata[plan]": plan || "pro"
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
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/api/verify-subscription", async (c) => {
  const stripeSecret = Bun.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if(!stripeSecret) return c.json({ isPro: false, plan: "free" });
  try {
    const { email } = await c.req.json();
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { "Authorization": `Bearer ${stripeSecret}` } }
    );
    const custData = await custRes.json();
    if(!custData.data?.length) return c.json({ isPro: false, plan: "free" });
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${custData.data[0].id}&status=active&limit=1`,
      { headers: { "Authorization": `Bearer ${stripeSecret}` } }
    );
    const subData = await subRes.json();
    if(!subData.data?.length) return c.json({ isPro: false, plan: "free" });
    const priceUsed  = subData.data[0].items?.data?.[0]?.price?.id;
    const basicPrice = Bun.env.STRIPE_BASIC_PRICE_ID || process.env.STRIPE_BASIC_PRICE_ID;
    const plan = priceUsed === basicPrice ? "basic" : "pro";
    return c.json({ isPro: plan === "pro", plan });
  } catch(e) {
    return c.json({ isPro: false, plan: "free" });
  }
});

app.post("/api/cancel-subscription", async (c) => {
  const stripeSecret = Bun.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if(!stripeSecret) return c.json({ error: "Not configured" }, 500);
  try {
    const { email } = await c.req.json();
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { "Authorization": `Bearer ${stripeSecret}` } }
    );
    const custData = await custRes.json();
    if(!custData.data?.length) return c.json({ error: "Customer not found" }, 404);
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${custData.data[0].id}&status=active&limit=1`,
      { headers: { "Authorization": `Bearer ${stripeSecret}` } }
    );
    const subData = await subRes.json();
    if(!subData.data?.length) return c.json({ error: "No active subscription" }, 404);
    const cancelRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subData.data[0].id}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecret}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "cancel_at_period_end=true"
      }
    );
    const cancelData = await cancelRes.json();
    return c.json({ success: true, endsAt: cancelData.current_period_end });
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

const port = parseInt(Bun.env.PORT || process.env.PORT || "3000");
Bun.serve({ port, fetch: app.fetch });
console.log("ChefBid PRO v4 running on port", port);

