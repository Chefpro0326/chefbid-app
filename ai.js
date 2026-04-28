// ChefBid PRO v6 - script injection fix
const server = Bun.serve({
  port: process.env.PORT || 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const h = {"Access-Control-Allow-Origin":"*"};
    if (req.method === "OPTIONS") return new Response("ok",{status:204,headers:h});

    if (url.pathname === "/api/debug") {
      const k = process.env.ANTHROPIC_API_KEY||"";
      return new Response(JSON.stringify({ok:true,keySet:!!k,keyLen:k.length,version:"v6"}),{headers:{...h,"Content-Type":"application/json"}});
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

    // Serve the vendor patch as a separate JS file
    if (url.pathname === "/vendor-patch.js") {
      const patch = `
function findP(ip,v){
  if(!ip)return null;
  var vl=v.toLowerCase().trim(),keys=Object.keys(ip);
  for(var i=0;i<keys.length;i++){if(keys[i]===v)return ip[keys[i]];}
  for(var i=0;i<keys.length;i++){if(keys[i].toLowerCase()===vl)return ip[keys[i]];}
  for(var i=0;i<keys.length;i++){var kl=keys[i].toLowerCase();if(kl.indexOf(vl.slice(0,4))>-1||vl.indexOf(kl.slice(0,4))>-1)return ip[keys[i]];}
  return null;
}
function findI(prices,ing){
  if(prices[ing])return prices[ing];
  var il=ing.toLowerCase(),keys=Object.keys(prices);
  for(var i=0;i<keys.length;i++){if(keys[i].toLowerCase()===il)return prices[keys[i]];}
  return {};
}
function renderV4(data,vendors){
  var box=document.getElementById("vendorPriceResults");
  if(!box){console.error("vendorPriceResults not found");return;}
  box.style.display="block";
  var ings=data.ingredients||[],prices=data.prices||{};
  var html="<div style='overflow-x:auto'><table style='width:100%;border-collapse:collapse;font-size:0.85rem'>";
  html+="<thead><tr style='background:#1a1816'>";
  html+="<th style='text-align:left;padding:10px 12px;color:rgba(255,255,255,0.6);font-size:0.68rem;text-transform:uppercase'>INGREDIENT</th>";
  vendors.forEach(function(v){html+="<th style='text-align:right;padding:10px 12px;color:#d4a020;font-size:0.68rem;text-transform:uppercase'>"+v+"</th>";});
  html+="<th style='text-align:right;padding:10px 12px;color:#52D9A8;font-size:0.68rem;text-transform:uppercase'>BEST</th></tr></thead><tbody>";
  ings.forEach(function(ing,i){
    var ip=findI(prices,ing),bp=Infinity,bv="";
    vendors.forEach(function(v){var info=findP(ip,v);var p=info?parseFloat(info.price):NaN;if(p&&p<bp){bp=p;bv=v;}});
    html+="<tr style='border-bottom:1px solid #e5e7eb;"+(i%2?"background:#f9fafb":"")+"'>";
    html+="<td style='padding:8px 12px;font-weight:600'>"+ing+"</td>";
    vendors.forEach(function(v){var info=findP(ip,v);var p=info?parseFloat(info.price):NaN;
      if(p){html+="<td style='text-align:right;padding:8px 12px;font-weight:"+(v===bv?"700":"400")+";color:"+(v===bv?"#059669":"#374151")+"'>$"+p.toFixed(2)+"<span style='font-size:0.68rem;color:#9ca3af'>/"+(info.unit||"unit")+"</span></td>";}
      else{html+="<td style='text-align:right;padding:8px 12px;color:#9ca3af'>-</td>";}
    });
    html+="<td style='text-align:right;padding:8px 12px;font-weight:700;color:#059669'>"+(bp<Infinity?"$"+bp.toFixed(2):"-")+"</td></tr>";
  });
  html+="</tbody></table>";
  if(data.bestVendor){html+="<div style='margin-top:12px;padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px'><strong style='color:#059669'>Best: "+data.bestVendor+"</strong> - "+(data.bestVendorReason||"")+"</div>";}
  html+="</div>";
  box.innerHTML=html;
  console.log("v6 vendor table OK: "+ings.length+" items");
}
window.vendorPatchLoaded = true;
console.log("vendor-patch.js v6 loaded");
`;
      return new Response(patch, {headers:{...h,"Content-Type":"application/javascript"}});
    }

    // Serve HTML with proper script tag pointing to our patch endpoint
    const f = Bun.file("index.html");
    if(await f.exists()) {
      let html = await f.text();
      const scriptTag = '<script src="/vendor-patch.js"></script>';
      // Inject before closing head tag
      if(html.includes("</head>")) {
        html = html.replace("</head>", scriptTag + "\n</head>");
      } else {
        html = scriptTag + "\n" + html;
      }
      return new Response(html,{headers:{...h,"Content-Type":"text/html;charset=utf-8"}});
    }
    return new Response("not found",{status:404,headers:h});
  },
  error(e){return new Response("err:"+e.message,{status:500});}
});
console.log("port",server.port,"key",process.env.ANTHROPIC_API_KEY?"YES":"NO");
