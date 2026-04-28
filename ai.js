const PATCH = '<script>\nwindow.addEventListener(\'load\', function() {\n  function findVendorPrice(ingPrices, vendorName) {\n    if(!ingPrices || !vendorName) return null;\n    var vl = vendorName.toLowerCase().trim();\n    var keys = Object.keys(ingPrices);\n    // Exact match\n    for(var i=0;i<keys.length;i++) { if(keys[i]===vendorName) return ingPrices[keys[i]]; }\n    // Case insensitive\n    for(var i=0;i<keys.length;i++) { if(keys[i].toLowerCase()===vl) return ingPrices[keys[i]]; }\n    // Partial match - vendor name contains key or key contains vendor name\n    for(var i=0;i<keys.length;i++) { var kl=keys[i].toLowerCase(); if(kl.indexOf(vl.substring(0,5))>-1 || vl.indexOf(kl.substring(0,5))>-1) return ingPrices[keys[i]]; }\n    return null;\n  }\n  function findIngPrice(prices, ingName) {\n    if(!prices || !ingName) return {};\n    var il = ingName.toLowerCase().trim();\n    if(prices[ingName]) return prices[ingName];\n    var keys = Object.keys(prices);\n    for(var i=0;i<keys.length;i++) { if(keys[i].toLowerCase()===il) return prices[keys[i]]; }\n    for(var i=0;i<keys.length;i++) { var kl=keys[i].toLowerCase(); if(kl.indexOf(il.substring(0,5))>-1||il.indexOf(kl.substring(0,5))>-1) return prices[keys[i]]; }\n    return {};\n  }\n  window.renderVendorTable = function(data, vendors) {\n    var box = document.getElementById(\'vendorPriceResults\');\n    if(!box) { console.error(\'vendorPriceResults not found\'); return; }\n    box.style.display = \'block\';\n    var ings = data.ingredients || [];\n    var prices = data.prices || {};\n    console.log(\'v4p render: ings=\'+ings.length+\' vendors=\'+vendors+\' priceKeys=\'+Object.keys(prices).slice(0,3));\n    var html = \'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.85rem">\';\n    html += \'<thead><tr style="background:#1a1816">\';\n    html += \'<th style="text-align:left;padding:10px 12px;color:rgba(255,255,255,0.6);font-size:0.68rem;font-family:monospace;text-transform:uppercase">INGREDIENT</th>\';\n    vendors.forEach(function(v){html += \'<th style="text-align:right;padding:10px 12px;color:#d4a020;font-size:0.68rem;font-family:monospace;text-transform:uppercase">\'+v+\'</th>\';});\n    html += \'<th style="text-align:right;padding:10px 12px;color:#52D9A8;font-size:0.68rem;font-family:monospace;text-transform:uppercase">BEST</th></tr></thead><tbody>\';\n    ings.forEach(function(ing, i) {\n      var ip = findIngPrice(prices, ing);\n      var bp=Infinity, bv=\'\';\n      vendors.forEach(function(v){\n        var info=findVendorPrice(ip,v);\n        var p=info?parseFloat(info.price):NaN;\n        if(p&&p<bp){bp=p;bv=v;}\n      });\n      html += \'<tr style="border-bottom:1px solid #e5e7eb;\'+(i%2?\'background:#f9fafb\':\'\')+\'">\';\n      html += \'<td style="padding:8px 12px;font-weight:600">\'+ing+\'</td>\';\n      vendors.forEach(function(v){\n        var info=findVendorPrice(ip,v);\n        var p=info?parseFloat(info.price):NaN;\n        if(p){html+=\'<td style="text-align:right;padding:8px 12px;font-family:monospace;font-weight:\'+(v===bv?\'700\':\'400\')+\';color:\'+(v===bv?\'#059669\':\'#374151\')+\'">$\'+p.toFixed(2)+\'<span style="font-size:0.68rem;color:#9ca3af">/\'+(info.unit||\'unit\')+\'</span></td>\';}\n        else{html+=\'<td style="text-align:right;padding:8px 12px;color:#9ca3af">-</td>\';}\n      });\n      html+=\'<td style="text-align:right;padding:8px 12px;font-family:monospace;font-weight:700;color:#059669">\'+(bp<Infinity?\'$\'+bp.toFixed(2):\'-\')+\'</td></tr>\';\n    });\n    html += \'</tbody></table>\';\n    if(data.bestVendor){html+=\'<div style="margin-top:12px;padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px"><strong style="color:#059669">Best: \'+data.bestVendor+\'</strong> - \'+(data.bestVendorReason||\'\')+\'</div>\';}\n    html += \'</div>\';\n    box.innerHTML = html;\n    console.log(\'v4p vendor table rendered OK\');\n  };\n  console.log(\'v4p patch loaded OK\');\n});\n</script>';

const server = Bun.serve({
  port: process.env.PORT || 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const h = {"Access-Control-Allow-Origin":"*"};
    if (req.method === "OPTIONS") return new Response("ok",{status:204,headers:h});
    if (url.pathname === "/api/debug") {
      const k = process.env.ANTHROPIC_API_KEY||"";
      return new Response(JSON.stringify({ok:true,keySet:!!k,keyLen:k.length,version:"v4p2"}),{headers:{...h,"Content-Type":"application/json"}});
    }
    if (url.pathname === "/api/ai" && req.method === "POST") {
      const k = process.env.ANTHROPIC_API_KEY;
      if(!k) return new Response(JSON.stringify({error:{message:"no key"}}),{status:500,headers:{...h,"Content-Type":"application/json"}});
      try {
        const body = await req.json();
        const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":k.trim(),"anthropic-version":"2023-06-01"},body:JSON.stringify(body)});
        const d = await r.json();
        return new Response(JSON.stringify(d),{status:r.status,headers:{...h,"Content-Type":"application/json"}});
      } catch(e) {
        return new Response(JSON.stringify({error:{message:e.message}}),{status:500,headers:{...h,"Content-Type":"application/json"}});
      }
    }
    const f = Bun.file("index.html");
    if(await f.exists()) {
      let html = await f.text();
      html = html.replace("</body>", PATCH);
      return new Response(html,{headers:{...h,"Content-Type":"text/html;charset=utf-8"}});
    }
    return new Response("not found",{status:404,headers:h});
  },
  error(e){return new Response("err:"+e.message,{status:500});}
});
console.log("port",server.port,"key",process.env.ANTHROPIC_API_KEY?"YES":"NO");
