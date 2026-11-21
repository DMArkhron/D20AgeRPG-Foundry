import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inflateSync} from 'node:zlib';
function validPNG(bytes){
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let offset=8,ended=false;const data=[];
 while(offset<bytes.length){assert.ok(offset+12<=bytes.length,'PNG chunk header truncated');const length=bytes.readUInt32BE(offset),end=offset+12+length;assert.ok(end<=bytes.length,'PNG image truncated');const kind=bytes.toString('ascii',offset+4,offset+8);if(kind==='IDAT')data.push(bytes.subarray(offset+8,end-4));if(kind==='IEND'){ended=true;assert.equal(end,bytes.length);}offset=end;}
 assert.ok(ended,'PNG missing IEND');assert.ok(inflateSync(Buffer.concat(data)).length>0);
}
test('artes PNG homebrew e imagens embutidas dos tokens estão completas',()=>{
 const dir=new URL('../assets/classes/',import.meta.url);
 for(const file of ['druid.png','paladin.png','yogi.png'])validPNG(fs.readFileSync(new URL(file,dir)));
 for(const id of ['druid','paladin','yogi']){const svg=fs.readFileSync(new URL(`../assets/tokens/${id}.svg`,import.meta.url),'utf8');assert.ok(svg.endsWith('</svg>'));const image=svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);assert.ok(image);validPNG(Buffer.from(image[1],'base64'));}
});
test('retratos de aventureiros usam contain no seletor final da ficha padrão',()=>{
 const css=fs.readFileSync(new URL('../styles/d20age.css',import.meta.url),'utf8');assert.match(css,/\.actor-paper:not\(\.ink-paper\) \.portrait-button \.portrait\{object-fit:contain/);
});
