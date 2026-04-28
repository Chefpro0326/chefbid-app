// ChefBid PRO v7
const server = Bun.serve({
  port: process.env.PORT || 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const h = {"Access-Control-Allow-Origin":"*"};
    if (req.method === "OPTIONS") return new Response("ok",{status:204,headers:h});
    if (url.pathname === "/api/debug") {
      const k = process.env.ANTHROPIC_API_KEY||"";
      return new Response(JSON.stringify({ok:true,keySet:!!k,keyLen:k.length,version:"v7"}),{headers:{...h,"Content-Type":"application/json"}});
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
    if (url.pathname === "/vendor-patch.js") {
      const patch = `
// ChefBid v7 vendor patch
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
  console.log("v7 vendor table OK: "+ings.length+" items");
}

// Override lookupVendorPrices completely
window.lookupVendorPrices = async function() {
  var ven1=document.getElementById("ven1"),ven2=document.getElementById("ven2"),ven3=document.getElementById("ven3");
  var vendors=[ven1&&ven1.value.trim(),ven2&&ven2.value.trim(),ven3&&ven3.value.trim()].filter(Boolean);
  if(!vendors.length){alert("Please enter at least one vendor name");return;}
  var ings=[];
  if(window._parsedIngredients&&window._parsedIngredients.length){
    ings=window._parsedIngredients.map(function(x){return x.name;}).slice(0,15);
  } else {
    document.querySelectorAll("#ingRows input[type=text]").forEach(function(el){if(el.value.trim())ings.push(el.value.trim());});
  }
  if(!ings.length){alert("Please generate or enter ingredients first");return;}
  var btn=document.getElementById("vendorLookupBtn");
  if(btn){btn.disabled=true;btn.textContent="Loading prices...";}
  try{
    var prompt="Return ONLY raw JSON no markdown no explanation.\\nVENDORS: "+vendors.join(", ")+"\\nINGREDIENTS: "+ings.join(", ")+"\\nUse EXACTLY these vendor names as keys: "+vendors.join(", ")+"\\nFormat: {\\"ingredients\\":[\\"item\\"],\\"vendors\\":[\\"v1\\",\\"v2\\"],\\"prices\\":{\\"item\\":{\\"v1\\":{\\"price\\":1.50,\\"unit\\":\\"lb\\"},\\"v2\\":{\\"price\\":1.40,\\"unit\\":\\"lb\\"}}},\\"bestVendor\\":\\"v1\\",\\"bestVendorReason\\":\\"reason\\",\\"savingsNote\\":\\"note\\"}";
    var res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:3000,messages:[{role:"user",content:prompt}]})});
    var data=await res.json();
    if(data.error){alert("Error: "+data.error.message);return;}
    var raw=data.content.map(function(c){return c.text||"";}).join("").replace(/\x60\x60\x60json/gi,"").replace(/\x60\x60\x60/g,"").trim();
    var s=raw.indexOf("{"),e=raw.lastIndexOf("}");
    if(s<0||e<0){alert("Bad response: "+raw.slice(0,200));return;}
    var parsed=JSON.parse(raw.slice(s,e+1));
    window.aiVendorPrices=parsed;
    console.log("v7 parsed vendors:", Object.keys(parsed.prices&&parsed.prices[parsed.ingredients[0]]||{}));
    renderV4(parsed,vendors);
  }catch(err){alert("Error: "+err.message);}
  finally{if(btn){btn.disabled=false;btn.textContent="🔍 AI Lookup Prices for My Ingredients";}}
};

window.vendorPatchLoaded = true;
console.log("vendor-patch.js v7 loaded - lookupVendorPrices overridden");
`;
      return new Response(patch, {headers:{...h,"Content-Type":"application/javascript"}});
    }

    const f = Bun.file("index.html");
    if(await f.exists()) {
      let html = await f.text();
      const scriptTag = '<script src="/vendor-patch.js?v=7"></script>';
      if(html.includes("</head>")) {
        html = html.replace("</head>", scriptTag + "\n</head>");
      } else {
        html = scriptTag + "\n" + html;
      }
      return new Response(html,{headers:{...h,"Content-Type":"text/html;charset=utf-8","Cache-Control":"no-cache"}});
    }
    return new Response("not found",{status:404,headers:h});
  },
  error(e){return new Response("err:"+e.message,{status:500});}
});
console.log("port",server.port,"key",process.env.ANTHROPIC_API_KEY?"YES":"NO");
