const PATCH = '<scr' + 'ipt>\n' +
'window.addEventListener("load", function() {\n' +
'  function findP(ip,v){\n' +
'    if(!ip)return null;\n' +
'    var vl=v.toLowerCase().trim(),keys=Object.keys(ip);\n' +
'    for(var i=0;i<keys.length;i++){if(keys[i]===v)return ip[keys[i]];}\n' +
'    for(var i=0;i<keys.length;i++){if(keys[i].toLowerCase()===vl)return ip[keys[i]];}\n' +
'    for(var i=0;i<keys.length;i++){var kl=keys[i].toLowerCase();if(kl.indexOf(vl.slice(0,4))>-1||vl.indexOf(kl.slice(0,4))>-1)return ip[keys[i]];}\n' +
'    return null;\n' +
'  }\n' +
'  function findI(prices,ing){\n' +
'    if(prices[ing])return prices[ing];\n' +
'    var il=ing.toLowerCase(),keys=Object.keys(prices);\n' +
'    for(var i=0;i<keys.length;i++){if(keys[i].toLowerCase()===il)return prices[keys[i]];}\n' +
'    return {};\n' +
'  }\n' +
'  function renderV4(data,vendors){\n' +
'    var box=document.getElementById("vendorPriceResults");\n' +
'    if(!box){console.error("vendorPriceResults not found");return;}\n' +
'    box.style.display="block";\n' +
'    var ings=data.ingredients||[],prices=data.prices||{};\n' +
'    var html="<div style=\'overflow-x:auto\'><table style=\'width:100%;border-collapse:collapse;font-size:0.85rem\'>";\n' +
'    html+="<thead><tr style=\'background:#1a1816\'>";\n' +
'    html+="<th style=\'text-align:left;padding:10px 12px;color:rgba(255,255,255,0.6);font-size:0.68rem;text-transform:uppercase\'>INGREDIENT</th>";\n' +
'    vendors.forEach(function(v){html+="<th style=\'text-align:right;padding:10px 12px;color:#d4a020;font-size:0.68rem;text-transform:uppercase\'>"+v+"</th>";});\n' +
'    html+="<th style=\'text-align:right;padding:10px 12px;color:#52D9A8;font-size:0.68rem;text-transform:uppercase\'>BEST</th></tr></thead><tbody>";\n' +
'    ings.forEach(function(ing,i){\n' +
'      var ip=findI(prices,ing),bp=Infinity,bv="";\n' +
'      vendors.forEach(function(v){var info=findP(ip,v);var p=info?parseFloat(info.price):NaN;if(p&&p<bp){bp=p;bv=v;}});\n' +
'      html+="<tr style=\'border-bottom:1px solid #e5e7eb;"+(i%2?"background:#f9fafb":"")+"\'>"\n' +
'      +"<td style=\'padding:8px 12px;font-weight:600\'>"+ing+"</td>";\n' +
'      vendors.forEach(function(v){var info=findP(ip,v);var p=info?parseFloat(info.price):NaN;\n' +
'        if(p){html+="<td style=\'text-align:right;padding:8px 12px;font-weight:"+(v===bv?"700":"400")+";color:"+(v===bv?"#059669":"#374151")+"\'>$"+p.toFixed(2)+"<span style=\'font-size:0.68rem;color:#9ca3af\'>/"+( info.unit||"unit")+"</span></td>";}\n' +
'        else{html+="<td style=\'text-align:right;padding:8px 12px;color:#9ca3af\'>-</td>";}\n' +
'      });\n' +
'      html+="<td style=\'text-align:right;padding:8px 12px;font-weight:700;color:#059669\'>"+(bp<Infinity?"$"+bp.toFixed(2):"-")+"</td></tr>";\n' +
'    });\n' +
'    html+="</tbody></table>";\n' +
'    if(data.bestVendor){html+="<div style=\'margin-top:12px;padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px\'><strong style=\'color:#059669\'>Best: "+data.bestVendor+"</strong> - "+(data.bestVendorReason||"")+"</div>";}\n' +
'    html+="</div>";\n' +
'    box.innerHTML=html;\n' +
'    console.log("v5 vendor table rendered: "+ings.length+" items");\n' +
'  }\n' +
'  document.getElementById("vendorLookupBtn") && document.getElementById("vendorLookupBtn").addEventListener("click", async function(e) {\n' +
'    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();\n' +
'    var btn=this;\n' +
'    var ven1=document.getElementById("ven1"),ven2=document.getElementById("ven2"),ven3=document.getElementById("ven3");\n' +
'    var vendors=[ven1&&ven1.value.trim(),ven2&&ven2.value.trim(),ven3&&ven3.value.trim()].filter(Boolean);\n' +
'    if(!vendors.length){alert("Please enter at least one vendor name");return;}\n' +
'    var ings=[];\n' +
'    if(window._parsedIngredients&&window._parsedIngredients.length){\n' +
'      ings=window._parsedIngredients.map(function(x){return x.name;}).slice(0,15);\n' +
'    } else {\n' +
'      document.querySelectorAll("#ingRows input[type=text]").forEach(function(el){if(el.value.trim())ings.push(el.value.trim());});\n' +
'    }\n' +
'    if(!ings.length){alert("Please generate or enter ingredients first");return;}\n' +
'    btn.disabled=true;btn.textContent="Loading prices...";\n' +
'    try{\n' +
'      var prompt="Return ONLY raw JSON no markdown.\\nVENDORS: "+vendors.join(", ")+"\\nINGREDIENTS: "+ings.join(", ")+"\\nFormat: {\\"ingredients\\":[\\"item\\"],\\"vendors\\":[\\"vendor\\"],\\"prices\\":{\\"item\\":{\\"vendor\\":{\\"price\\":1.50,\\"unit\\":\\"lb\\"}}},\\"bestVendor\\":\\"vendor\\",\\"bestVendorReason\\":\\"reason\\",\\"savingsNote\\":\\"note\\"}";\n' +
'      var res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:2000,messages:[{role:"user",content:prompt}]})})\n' +
'      var data=await res.json();\n' +
'      if(data.error){alert("Error: "+data.error.message);return;}\n' +
'      var raw=data.content.map(function(c){return c.text||"";}).join("").replace(/```json/gi,"").replace(/```/g,"").trim();\n' +
'      var s=raw.indexOf("{"),e=raw.lastIndexOf("}");\n' +
'      if(s<0||e<0){alert("Bad response");return;}\n' +
'      var parsed=JSON.parse(raw.slice(s,e+1));\n' +
'      window.aiVendorPrices=parsed;\n' +
'      renderV4(parsed,vendors);\n' +
'    }catch(err){alert("Error: "+err.message);}\n' +
'    finally{btn.disabled=false;btn.textContent="🔍 AI Lookup Prices for My Ingredients";}\n' +
'  }, true);\n' +
'  console.log("ChefBid v5 patch loaded OK");\n' +
'});\n' +
'</scr' + 'ipt>';

const server = Bun.serve({
  port: process.env.PORT || 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const h = {"Access-Control-Allow-Origin":"*"};
    if (req.method === "OPTIONS") return new Response("ok",{status:204,headers:h});
    if (url.pathname === "/api/debug") {
      const k = process.env.ANTHROPIC_API_KEY||"";
      return new Response(JSON.stringify({ok:true,keySet:!!k,keyLen:k.length,version:"v5b"}),{headers:{...h,"Content-Type":"application/json"}});
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
      // Try multiple injection points
      if(html.includes("</html>")) {
        html = html.replace("</html>", PATCH + "\n</html>");
      } else if(html.includes("</script>")) {
        // Inject after last </script>
        const lastScript = html.lastIndexOf("</script>");
        html = html.slice(0, lastScript + 9) + "\n" + PATCH + html.slice(lastScript + 9);
      } else {
        html = html + "\n" + PATCH;
      }
      return new Response(html,{headers:{...h,"Content-Type":"text/html;charset=utf-8"}});
    }
    return new Response("not found",{status:404,headers:h});
  },
  error(e){return new Response("err:"+e.message,{status:500});}
});
console.log("port",server.port,"key",process.env.ANTHROPIC_API_KEY?"YES":"NO");
