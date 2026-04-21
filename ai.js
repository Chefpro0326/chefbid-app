import { readFileSync } from "fs";
import { join } from "path";

const html = readFileSync(join(import.meta.dir, "index.html"), "utf8");

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Serve index.html for all routes
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`ChefBid PRO running on port ${server.port}`);
