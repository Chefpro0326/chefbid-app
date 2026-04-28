const server = Bun.serve({
  port: process.env.PORT || 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const h = {"Access-Control-Allow-Origin":"*","Content-Type":"text/plain"};
    if (req.method === "OPTIONS") return new Response("ok",{status:204,headers:h});
    if (url.pathname === "/api/debug") {
      const k = process.env.ANTHROPIC_API_KEY||"";
      return new Response(JSON.stringify({ok:true,keySet:!!k,keyLen:k.length,version:"v4"}),{headers:{...h,"Content-Type":"application/json"}});
    }
    if (url.pathname === "/api/ai" && req.method === "POST") {
      const k = process.env.ANTHROPIC_API_KEY;
      if(!k) return new Response(JSON.stringify({error:{message:"no key"}}),{status:500,headers:{...h,"Content-Type":"application/json"}});
      const body = await req.json();
      const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":k.trim(),"anthropic-version":"2023-06-01"},body:JSON.stringify(body)});
      const d = await r.json();
      return new Response(JSON.stringify(d),{status:r.status,headers:{...h,"Content-Type":"application/json"}});
    }
    const f = Bun.file("index.html");
    if(await f.exists()) return new Response(f,{headers:{...h,"Content-Type":"text/html;charset=utf-8"}});
    return new Response("not found",{status:404,headers:h});
  }
});
console.log("running port",server.port);
