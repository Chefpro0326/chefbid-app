const server = Bun.serve({
  port: process.env.PORT || 8080,

  async fetch(req) {
    const url = new URL(req.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // AI PROXY
    if (url.pathname === "/api/ai" && req.method === "POST") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error("ANTHROPIC_API_KEY not set!");
        return new Response(
          JSON.stringify({ error: { message: "Server config error — API key missing." } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      try {
        const body = await req.json();
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
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

    // SERVE HTML
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
      return new Response("Server error: " + err.message, { status: 500, headers: corsHeaders });
    }
  },

  error(err) {
    return new Response("Server error: " + err.message, { status: 500 });
  },
});

console.log("ChefBid PRO running on port " + server.port);
console.log("API Key configured:", process.env.ANTHROPIC_API_KEY ? "YES" : "NO - CHECK RAILWAY VARIABLES");
