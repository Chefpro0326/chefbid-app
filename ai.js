const server = Bun.serve({
  port: process.env.PORT || 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const h = {"Access-Control-Allow-Origin":"*","Content-Type":"text/plain"};
    if (req.method === "OPTIONS") return new Response("ok",{status:204,headers:h});
    if (url.pathname === "/api/debug") {
      const k = process.env.ANTHROPIC_API_KEY||"";
      return new Response(JSON.stringify({ok:true,keySet:!!k,keyLen:k.length,version:"v4-patched"}),{headers:{...h,"Content-Type":"application/json"}});
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
    // Serve HTML with patch injected
    const f = Bun.file("index.html");
    if(await f.exists()) {
      let html = await f.text();
      // Inject our vendor fix patch before </body>
      const patch = `
<script>
// ChefBid PRO v4 patch - fixes vendor price display
window.addEventListener('load', function() {

  // Override renderVendorTable with working version
  window.renderVendorTable = function(data, vendors) {
    console.log('Patched renderVendorTable v4 called');
    var resultBox = document.getElementById('vendorPriceResults');
    if(!resultBox) { console.error('vendorPriceResults not found'); return; }
    resultBox.style.display = 'block';

    var ingredients = data.ingredients || [];
    var prices = data.prices || {};

    var html = '<div style="overflow-x:auto">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-top:8px">';
    html += '<thead><tr style="background:#1a1816">';
    html += '<th style="text-align:left;padding:10px 12px;color:rgba(255,255,255,0.6);font-size:0.68rem;font-family:DM Mono,monospace;text-transform:uppercase;letter-spacing:1px">INGREDIENT</th>';
    vendors.forEach(function(v) {
      html += '<th style="text-align:right;padding:10px 12px;color:#d4a020;font-size:0.68rem;font-family:DM Mono,monospace;text-transform:uppercase;letter-spacing:1px">' + v + '</th>';
    });
    html += '<th style="text-align:right;padding:10px 12px;color:#52D9A8;font-size:0.68rem;font-family:DM Mono,monospace;text-transform:uppercase;letter-spacing:1px">BEST</th>';
    html += '</tr></thead><tbody>';

    ingredients.forEach(function(ing, i) {
      var ingPrices = prices[ing] || {};
      // Try case insensitive match
      if(!Object.keys(ingPrices).length) {
        var k = Object.keys(prices).find(function(k2){ return k2.toLowerCase() === ing.toLowerCase(); });
        if(k) ingPrices = prices[k];
      }
      var bestPrice = Infinity, bestVendor = '';
      vendors.forEach(function(v) {
        var info = ingPrices[v] || ingPrices[v.toLowerCase()] || {};
        if(!info || !info.price) {
          var k2 = Object.keys(ingPrices).find(function(k3){ return k3.toLowerCase().indexOf(v.toLowerCase().substring(0,4)) > -1; });
          if(k2) info = ingPrices[k2];
        }
        var p = parseFloat(info && info.price);
        if(p && p < bestPrice){ bestPrice = p; bestVendor = v; }
      });

      html += '<tr style="border-bottom:1px solid #e5e7eb;' + (i%2===0?'':'background:#f9fafb') + '">';
      html += '<td style="padding:8px 12px;font-weight:600;font-size:0.87rem">' + ing + '</td>';
      vendors.forEach(function(v) {
        var info = ingPrices[v] || ingPrices[v.toLowerCase()] || {};
        if(!info || !info.price) {
          var k2 = Object.keys(ingPrices).find(function(k3){ return k3.toLowerCase().indexOf(v.toLowerCase().substring(0,4)) > -1; });
          if(k2) info = ingPrices[k2];
        }
        var p = parseFloat(info && info.price);
        var isBest = v === bestVendor;
        if(p) {
          html += '<td style="text-align:right;padding:8px 12px;font-family:DM Mono,monospace;font-size:0.85rem;font-weight:' + (isBest?'700':'400') + ';color:' + (isBest?'#059669':'#374151') + '">$' + p.toFixed(2) + '<span style="font-size:0.68rem;color:#9ca3af">/' + (info.unit||'unit') + '</span></td>';
        } else {
          html += '<td style="text-align:right;padding:8px 12px;color:#9ca3af">—</td>';
        }
      });
      html += '<td style="text-align:right;padding:8px 12px;font-family:DM Mono,monospace;font-size:0.85rem;font-weight:700;color:#059669">' + (bestPrice < Infinity ? '$' + bestPrice.toFixed(2) : '—') + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    if(data.bestVendor) {
      html += '<div style="margin-top:12px;padding:12px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px">';
      html += '<div style="font-weight:700;color:#059669;font-size:0.92rem;margin-bottom:4px">✓ Best Overall: ' + data.bestVendor + '</div>';
      html += '<div style="font-size:0.82rem;color:#374151">' + (data.bestVendorReason||'') + '</div>';
      if(data.savingsNote) html += '<div style="font-size:0.78rem;color:#6b7280;margin-top:4px">' + data.savingsNote + '</div>';
      html += '</div>';
    }
    html += '</div>';
    resultBox.innerHTML = html;
    console.log('Vendor table rendered with', ingredients.length, 'ingredients');
  };

  // Also patch lookupVendorPrices to store result globally
  var origLookup = window.lookupVendorPrices;
  window.lookupVendorPrices = async function() {
    await origLookup.call(this);
    console.log('Lookup complete, aiVendorPrices:', window.aiVendorPrices);
  };

  console.log('ChefBid PRO v4 patch applied');
});
</script>
</body>`;
      html = html.replace('</body>', patch);
      return new Response(html,{headers:{...h,"Content-Type":"text/html;charset=utf-8"}});
    }
    return new Response("not found",{status:404,headers:h});
  }
});
console.log("running port",server.port);
console.log("API Key:",process.env.ANTHROPIC_API_KEY?"YES":"NO");
