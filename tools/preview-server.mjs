import http from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const types={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"};
http.createServer(async(request,response)=>{
  try{const pathname=decodeURIComponent(new URL(request.url,"http://localhost").pathname);let relative=pathname.replace(/^\/+/,"");if(!relative||relative.endsWith("/"))relative+="index.html";const target=path.resolve(root,relative);if(!target.startsWith(root)){response.writeHead(403).end();return;}const data=await readFile(target);response.writeHead(200,{"Content-Type":types[path.extname(target)] ?? "application/octet-stream"});response.end(data);}catch{response.writeHead(404).end("Arquivo não encontrado");}
}).listen(8765,"127.0.0.1",()=>console.log("Prévia em http://127.0.0.1:8765/preview/"));
