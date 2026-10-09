import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.env.SERVE_DIST ? 'dist' : '.');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.csv':'text/csv'};
http.createServer(async(req,res)=>{
 try {const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+sep)) throw Error();
 const file=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(file);
 } catch {res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('DataLens: http://127.0.0.1:'+(process.env.PORT||4173)));
