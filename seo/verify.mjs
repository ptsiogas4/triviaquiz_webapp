import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
const base = process.env.SEO_TEST_URL || 'http://127.0.0.1:8787';
const pages = JSON.parse(await readFile('seo/dist/pages.json','utf8'));
const game = await readFile('kserolas/index.html','utf8');
const routes = ['/play','/auth/callback?code=seo-test','/join/CODE','/i/CODE','/daily','/d/2026-11-21','/blitz','/quick/test','/quick','/settings','/account','/online','/unknown-seo-test','/index.html','/?source=pwa'];
let checks=0;
function curl(path,navigate=false){
 const result=execFileSync('curl',['--silent','--show-error','--fail-with-body',...(navigate?['-H','Sec-Fetch-Mode: navigate']:[]),'-w','\n%{http_code}',base+path],{encoding:'utf8',maxBuffer:2e6});
 const i=result.lastIndexOf('\n');assert.equal(result.slice(i+1),'200',path); return result.slice(0,i);
}
for(const navigation of [false,true]){
 for(const path of routes){
  const html=curl(path,navigation);
  if(path.startsWith('/?'))assert.match(html,/data-seo-page="\/"/);else assert.equal(html,game,path);
  checks++;
 }
 for(const p of pages){
  const html=curl(p.path,navigation);
  assert.equal(html,await readFile('seo/dist/'+p.file,'utf8'),p.path);
  assert.match(html,/<html lang="el">/);
  assert.ok(html.includes(`rel="canonical" href="https://xerolasgame.gr${p.path}"`));
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
  assert.ok(!html.includes('\u2014'));
  assert.doesNotMatch(html,/<style\b|\sstyle=|\son\w+=/i);
  for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
   if(match[1].includes('application/ld+json')){
    const data=JSON.parse(match[2]);assert.equal(data['@context'],'https://schema.org');
    assert.ok(data['@graph'].some(n=>n['@type']==='BreadcrumbList'));
    const faq=data['@graph'].find(n=>n['@type']==='FAQPage');
    if(faq)for(const q of faq.mainEntity){assert.ok(html.includes(q.name));assert.ok(html.includes(q.acceptedAnswer.text));}
   }else{assert.match(match[1],/src=/);assert.equal(match[2],'');}
  }
  if(p.path.startsWith('/erotiseis/'))assert.equal((html.match(/<summary>Δες την απάντηση/g)||[]).length,18);
  for(const match of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g))curl(match[1]);
  checks++;
 }
}
const sitemap=curl('/sitemap.xml');for(const p of pages)assert.ok(sitemap.includes(`<loc>https://xerolasgame.gr${p.path}</loc>`));
assert.match(curl('/robots.txt'),/Allow: \/\nSitemap: https:\/\/xerolasgame.gr\/sitemap.xml/);
for(const path of ['/', '/play', '/erotiseis/istoria/']){
 const headers=execFileSync('curl',['-sI',base+path],{encoding:'utf8'});
 assert.match(headers,/cache-control: no-cache/i);assert.match(headers,/content-security-policy:.*script-src 'self'/i);
}
const assetHtml=await readFile('seo/dist/seo-home.html','utf8');
for(const match of assetHtml.matchAll(/(?:src|href)="(\/seo-assets\/[^"]+)"/g)){
 const headers=execFileSync('curl',['-sI',base+match[1]],{encoding:'utf8'});
 assert.match(headers,/cache-control: public, max-age=31536000, immutable/i);
}
let bytes=0,gzip=0;
async function size(dir){for(const item of await readdir(dir)){const p=dir+'/'+item; if((await stat(p)).isDirectory())await size(p);else{const b=await readFile(p);bytes+=b.length;gzip+=gzipSync(b).length;}}}
await size('seo/dist');
assert.ok(bytes<200000,`SEO output too large: ${bytes}`);
console.log(`PASS: ${checks} route checks (curl and browser navigation), linked assets, JSON-LD, 108 samples, metadata, CSP, cache headers, sitemap.\nSEO output: ${bytes} bytes; ${gzip} bytes summed gzip.`);
