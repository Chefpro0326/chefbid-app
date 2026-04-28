// ChefBid PRO v3 - Cache busted
const VERSION = "v3-" + Date.now();

const server = Bun.serve({
  port: process.env.PORT || 8080,

  async fetch(req) {
    const url = new URL(req.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "X-ChefBid-Version": VERSION,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // AI PROXY
    if (url.pathname === "/api/ai" && req.method === "POST") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: { message: "API key not configured." } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      try {
        const body = await req.json();
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey.trim(),
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: { message: err.message } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // DEBUG
    if (url.pathname === "/api/debug") {
      const key = process.env.ANTHROPIC_API_KEY || '';
      return new Response(JSON.stringify({
        keySet: !!key,
        keyLength: key.length,
        keyStart: key.substring(0, 20),
        hasSpaces: key.includes(' '),
        hasNewline: key.includes('\n'),
        version: VERSION,
        serverVersion: "v3"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // SERVE HTML - always fresh, no caching
    try {
      const file = Bun.file("index.html");
      const exists = await file.exists();
      if (!exists) {
        return new Response("index.html not found", { status: 404, headers: corsHeaders });
      }
      const text = await file.text();
      return new Response(text, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response("Error: " + err.message, { status: 500, headers: corsHeaders });
    }
  },

  error(err) {
    return new Response("Server error: " + err.message, { status: 500 });
  },
});

console.log("ChefBid PRO v3 running on port " + server.port);
console.log("Version:", VERSION);
console.log("API Key:", process.env.ANTHROPIC_API_KEY ? "YES ✓" : "NO ✗");
