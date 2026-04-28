// ChefBid PRO v3 - final
const server = Bun.serve({
  port: process.env.PORT || 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"no-cache"};
    if (req.method === "OPTIONS") return new Response(null, {status:204,headers:cors});
    if (url.pathname === "/api/ai" && req.method === "POST") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return new Response(JSON.stringify({error:{message:"API key not set"}}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
      try {
        const body = await req.json();
        const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key.trim(),"anthropic-version":"2023-06-01"},body:JSON.stringify(body)});
        const data = await r.json();
        return new Response(JSON.stringify(data),{status:r.status,headers:{...cors,"Content-Type":"application/json"}});
      } catch(e) {
        return new Response(JSON.stringify({error:{message:e.message}}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
      }
    }
    if (url.pathname === "/api/debug") {
      const key = process.env.ANTHROPIC_API_KEY||'';
      return new Response(JSON.stringify({keySet:!!key,keyLength:key.length,keyStart:key.substring(0,20),version:"v3"}),{headers:{...cors,"Content-Type":"application/json"}});
    }
    try {
      const file = Bun.file("index.html");
      if (!await file.exists()) return new Response("Not found",{status:404,headers:cors});
      return new Response(await file.text(),{headers:{...cors,"Content-Type":"text/html;charset=utf-8"}});
    } catch(e) {
      return new Response("Error:"+e.message,{status:500,headers:cors});
    }
  },
  error(e){return new Response("Error:"+e.message,{status:500});}
});
console.log("ChefBid PRO v3 port "+server.port);
console.log("API Key:",process.env.ANTHROPIC_API_KEY?"YES":"NO");
