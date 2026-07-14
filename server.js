/* PINIT — jednostavan server bez ijedne instalacije (čisti Node.js).
   Servira aplikacije iz /public i drži podatke u data.json.
   Rute:
     GET  /                    → public/app.html      (građanska aplikacija: prijave + Drive)
     GET  /platforma           → public/platforma.html (dispečer / komunalne službe)
     GET  /komandni            → public/komandni.html  (Drive komandni centar — stanje cesta)
     API:
     GET  /api/reports[?city=] · POST /api/reports · PATCH /api/reports/:id · POST /api/reports/:id/vote
     GET  /api/workers · POST /api/workers
     POST /api/register
     GET  /api/drives · POST /api/drives
*/
const http=require('http'), fs=require('fs'), path=require('path');
const PORT=process.env.PORT||3000;
const PUB=path.join(__dirname,'public');
const DB=path.join(__dirname,'data.json');

let db={reports:[],workers:[],drives:[],accounts:[]};
try{ if(fs.existsSync(DB)) db=Object.assign(db,JSON.parse(fs.readFileSync(DB,'utf8'))); }catch(e){ console.error('data.json neispravan, krećem prazan.'); }
let saveT=null;
function save(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ fs.writeFileSync(DB,JSON.stringify(db)); }catch(e){ console.error('save fail',e.message); } }, 200); }

let seq=Date.now();
function nid(){ return (seq++).toString(36); }
function initials(name){ return (name||'?').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'?'; }

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};

function sendJSON(res,code,obj){ const b=JSON.stringify(obj); res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(b); }
function sendFile(res,file){
  fs.readFile(file,(err,data)=>{
    if(err){ res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); res.end('404 — nema: '+path.basename(file)); return; }
    res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream'});
    res.end(data);
  });
}
function body(req){ return new Promise(r=>{ let d=''; req.on('data',c=>{ d+=c; if(d.length>6e6) req.destroy(); }); req.on('end',()=>{ try{ r(d?JSON.parse(d):{}); }catch(e){ r({}); } }); }); }

const server=http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://x'); const p=u.pathname; const m=req.method;

  // ── API ──
  if(p.startsWith('/api/')){
    try{
      // REPORTS
      if(p==='/api/reports' && m==='GET'){
        const city=u.searchParams.get('city');
        let out=db.reports;
        if(city) out=out.filter(r=>(r.city||'')===city);
        return sendJSON(res,200,out);
      }
      if(p==='/api/reports' && m==='POST'){
        const b=await body(req);
        const r=Object.assign({},b,{ id:nid(), ts:b.ts||Date.now(),
          status:(b.status!=null?b.status:0), worker:b.worker||null, cost:b.cost||null,
          votes:(b.votes!=null?b.votes:1), confirms:b.confirms||0 });
        db.reports.unshift(r); save();
        return sendJSON(res,201,r);
      }
      let mm;
      if((mm=p.match(/^\/api\/reports\/([^/]+)\/vote$/)) && m==='POST'){
        const b=await body(req); const r=db.reports.find(x=>String(x.id)===mm[1]);
        if(!r) return sendJSON(res,404,{error:'nema'});
        r.votes=Math.max(0,(r.votes||0)+(Number(b.delta)||0)); save();
        return sendJSON(res,200,r);
      }
      if((mm=p.match(/^\/api\/reports\/([^/]+)$/)) && m==='PATCH'){
        const b=await body(req); const r=db.reports.find(x=>String(x.id)===mm[1]);
        if(!r) return sendJSON(res,404,{error:'nema'});
        ['status','worker','cost','pri','note'].forEach(k=>{ if(b[k]!==undefined) r[k]=b[k]; });
        save(); return sendJSON(res,200,r);
      }
      // WORKERS
      if(p==='/api/workers' && m==='GET') return sendJSON(res,200,db.workers);
      if(p==='/api/workers' && m==='POST'){
        const b=await body(req);
        const w={ id:nid(), name:b.name||'Radnik', role:b.role||'Terenac', dept:b.dept||'putevi', av:initials(b.name) };
        db.workers.push(w); save(); return sendJSON(res,201,w);
      }
      // REGISTER
      if(p==='/api/register' && m==='POST'){
        const b=await body(req);
        const a={ userId:nid(), token:nid()+nid(), name:b.name||'', city:b.city||'', ts:Date.now() };
        db.accounts.push(a); save();
        return sendJSON(res,201,{userId:a.userId,token:a.token});
      }
      // DRIVES
      if(p==='/api/drives' && m==='GET') return sendJSON(res,200,db.drives);
      if(p==='/api/drives' && m==='POST'){
        const b=await body(req);
        const d=Object.assign({},b,{ id:nid(), ts:Date.now() });
        db.drives.unshift(d); if(db.drives.length>500) db.drives.length=500; save();
        return sendJSON(res,201,{ok:true,id:d.id});
      }
      return sendJSON(res,404,{error:'nepoznata ruta'});
    }catch(e){ return sendJSON(res,500,{error:String(e&&e.message||e)}); }
  }

  // ── STRANICE ──
  if(p==='/' || p==='/index.html') return sendFile(res,path.join(PUB,'app.html'));
  if(p==='/platforma' || p==='/platforma.html') return sendFile(res,path.join(PUB,'platforma.html'));
  if(p==='/komandni' || p==='/komandni.html') return sendFile(res,path.join(PUB,'komandni.html'));

  // ── STATIKA (sigurno, samo unutar /public) ──
  const safe=path.normalize(p).replace(/^(\.\.[/\\])+/,'');
  const file=path.join(PUB,safe);
  if(file.startsWith(PUB) && fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res,file);

  res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); res.end('404');
});

server.listen(PORT,()=>{
  console.log('PINIT server → http://localhost:'+PORT);
  console.log('  aplikacija:  /            (app.html)');
  console.log('  platforma:   /platforma');
  console.log('  komandni:    /komandni');
});
