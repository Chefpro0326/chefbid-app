const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const file = Bun.file("index.html");
    const contents = await file.text();
    return new Response(contents, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`ChefBid PRO running on port ${server.port}`);
