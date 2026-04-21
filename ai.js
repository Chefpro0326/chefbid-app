import { resolve } from "path";

const htmlPath = resolve(process.cwd(), "index.html");
console.log("Looking for HTML at:", htmlPath);

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    try {
      const file = Bun.file(htmlPath);
      const exists = await file.exists();
      console.log("File exists:", exists);
      if (!exists) {
        return new Response("index.html not found at " + htmlPath, { status: 404 });
      }
      const text = await file.text();
      return new Response(text, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch(err) {
      console.error("Error:", err);
      return new Response("Error: " + err.message, { status: 500 });
    }
  }
});

console.log("ChefBid PRO running on port " + server.port);
