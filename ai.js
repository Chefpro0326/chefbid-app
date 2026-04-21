const file = Bun.file("index.html");

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const text = await file.text();
    return new Response(text, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
  error(err) {
    return new Response("Error: " + err.message, { status: 500 });
  }
});

console.log("ChefBid PRO running on port " + server.port);
