import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'seo/dist');
const source = resolve(process.env.SEO_QUESTIONS_DIR || resolve(root, '../../hybrid/TriviaQuiz/composeApp/src/commonMain/composeResources/files'));
const origin = 'https://xerolasgame.gr';
const categories = [
 ['history','istoria','Ιστορίας','Ιστορία','Ταξίδεψε σε εποχές, πρόσωπα και γεγονότα που διαμόρφωσαν τον κόσμο.'],
 ['geography','geografia','Γεωγραφίας','Γεωγραφία','Ανακάλυψε χώρες, πρωτεύουσες και γωνιές του πλανήτη μέσα από μικρές προκλήσεις.'],
 ['sports','athlitika','Αθλητισμού','Αθλητικά','Θυμήσου αθλητές, διοργανώσεις και στιγμές που έγραψαν ιστορία στα γήπεδα.'],
 ['movies','tainies','Κινηματογράφου','Ταινίες','Βάλε τις κινηματογραφικές σου γνώσεις στη δοκιμασία με ιστορίες από τη μεγάλη οθόνη.'],
 ['science','epistimi','Επιστήμης','Επιστήμη','Εξερεύνησε τη φύση, το διάστημα και τις ανακαλύψεις που εξηγούν τον κόσμο μας.'],
 ['mythology','mythologia','Μυθολογίας','Μυθολογία','Γνώρισε θεούς, ήρωες και μύθους που συνεχίζουν να εξάπτουν τη φαντασία.']
];
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const faq = [
 ['Τι είναι ο Ξερόλας;','Ο Ξερόλας είναι ελληνικό παιχνίδι γνώσεων. Δοκίμασε τις γνώσεις σου σε έξι κατηγορίες, μόνος ή με την παρέα σου.'],
 ['Μπορώ να παίξω δωρεάν;','Ναι, μπορείς να ανοίξεις το παιχνίδι δωρεάν από το πρόγραμμα περιήγησης, χωρίς να κατεβάσεις εφαρμογή.'],
 ['Πώς παίζω με φίλους;','Άνοιξε το παιχνίδι και διάλεξε το διαδικτυακό παιχνίδι με φίλους. Μοιράσου την πρόσκληση της παρέας για να μπείτε στο ίδιο παιχνίδι.'],
 ['Ποιες κατηγορίες ερωτήσεων υπάρχουν;','Ιστορία, Γεωγραφία, Αθλητικά, Ταινίες, Επιστήμη και Μυθολογία.'],
 ['Πώς το βάζω στο iPhone;','Άνοιξε το παιχνίδι στο Safari, πάτησε Κοινοποίηση και διάλεξε Προσθήκη στην οθόνη Αφετηρίας.'],
 ['Τι χρειάζεται για να παίξω στον ιστό;','Ένα σύγχρονο πρόγραμμα περιήγησης με υποστήριξη WebAssembly GC. Ενημέρωσε το Chrome, Edge, Firefox ή Safari αν εμφανιστεί μήνυμα ασυμβατότητας.']
];
const modes = [
 ['Μονομαχία «Γύρος των 7»','Προκάλεσε έναν αντίπαλο σε μια μονομαχία γνώσεων.'],
 ['Διαδικτυακά με φίλους','Μοιράσου μια πρόσκληση και παίξε με την παρέα σου.'],
 ['Ημερήσια πρόκληση','Βάλε μια μικρή πρόκληση γνώσεων στην ημέρα σου.'],
 ["Αστραπή 60''",'Σκέψου γρήγορα και δοκίμασε τις γνώσεις σου με χρονόμετρο.'],
 ['Μάχη Ομάδων','Χωριστείτε σε ομάδες και ενώστε τις γνώσεις σας.'],
 ['Σερί','Δες πόσο μακριά μπορείς να φτάσεις με σωστές απαντήσεις.'],
 ['Μάθε την κατηγορία','Διάλεξε το θέμα που σου αρέσει και εξασκήσου.'],
 ['Εβδομαδιαίο τουρνουά','Επίστρεψε για την εβδομαδιαία πρόκληση.']
];
const categoryLinks = () => `<div class="grid">${categories.map(c=>`<a class="card" href="/erotiseis/${c[1]}/">${c[3]}</a>`).join('')}</div>`;
const faqHtml = () => faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
const cta = '<a class="button" href="/play">Δοκίμασε τον εαυτό σου</a>';
await rm(out,{recursive:true,force:true});
await mkdir(resolve(out,'seo-assets'),{recursive:true});
async function asset(file) {
 const data = await readFile(resolve(root,'seo',file));
 const hash = createHash('sha256').update(data).digest('hex').slice(0,12);
 const name = file.split('/').at(-1).replace(/\.(\w+)$/, `.${hash}.$1`);
 await writeFile(resolve(out,'seo-assets',name), data);
 return '/seo-assets/'+name;
}
const css = await asset('site.css'), js = await asset('platform.js');
const preview = await asset('assets/game-preview.jpg');
const pages = [];
async function page(path,title,description,body,{faqs=false,landing=false}={}) {
 const graph = [
 {'@type':'WebSite','@id':origin+'/#website',name:'Ξερόλας',url:origin+'/',inLanguage:'el'},
 {'@type':['VideoGame','WebApplication'],'@id':origin+'/play#game',name:'Ξερόλας',url:origin+'/play',inLanguage:'el',applicationCategory:'GameApplication',operatingSystem:'Web, Android, iOS',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'EUR'},image:origin+'/og-image.png'},
 {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Αρχική',item:origin+'/'},...(path==='/'?[]:[{'@type':'ListItem',position:2,name:title,item:origin+path}])]}
 ];
 if(faqs)graph.push({'@type':'FAQPage',mainEntity:faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))});
 // JSON-LD is an inert data block, not executable JavaScript. No inline executable code or styles.
 const json = JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c');
 const html = `<!doctype html><html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Ξερόλας</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${origin+path}"><link rel="alternate" hreflang="el" href="${origin+path}"><meta name="theme-color" content="#14B8C8"><link rel="icon" href="/icons/favicon.svg"><meta property="og:type" content="website"><meta property="og:site_name" content="Ξερόλας"><meta property="og:locale" content="el_GR"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${origin+path}"><meta property="og:image" content="${origin}/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Η κουκουβάγια και ο τροχός κατηγοριών του Ξερόλα"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${origin}/og-image.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Commissioner:wght@700;800&amp;family=Inter:wght@400;600&amp;display=swap"><link rel="stylesheet" href="${css}"><script type="application/ld+json">${json}</script>${landing?`<script src="${js}" defer></script>`:''}</head><body data-seo-page="${path}"><a class="skip" href="#main">Στο περιεχόμενο</a><header><a class="brand" href="/"><img src="/icons/icon-192.png" width="48" height="48" alt="">Ξερόλας</a><nav aria-label="Κύρια πλοήγηση"><a href="/pos-paizetai/">Πώς παίζεται</a><a href="/syxnes-erotiseis/">Συχνές ερωτήσεις</a><a href="/play">Παίξε τώρα</a></nav></header><main id="main">${path==='/'?'':`<p class="crumb"><a href="/">Αρχική</a> / ${esc(title)}</p>`}${body}</main><footer><p>Ξερόλας: Μια ερώτηση, μια αφορμή για παρέα.</p><nav aria-label="Νομικά και επικοινωνία"><a href="/legal/privacy.html">Πολιτική απορρήτου</a><a href="/legal/terms.html">Όροι χρήσης</a><a href="mailto:coinoro@gmail.com">coinoro@gmail.com</a></nav></footer></body></html>`;
 const file = path==='/'?'seo-home.html':path.slice(1)+'index.html';
 await mkdir(dirname(resolve(out,file)),{recursive:true});
 await writeFile(resolve(out,file),html);
 pages.push({path,file,title,bytes:Buffer.byteLength(html)});
}
await page('/','Ξερόλας: Ελληνικό κουίζ γνώσεων για όλη την παρέα','Παίξε δωρεάν ελληνικό κουίζ γνώσεων. Γνώρισε τους τρόπους παιχνιδιού του Ξερόλα και δοκίμασε ερωτήσεις Ιστορίας, Γεωγραφίας, Επιστήμης και άλλων κατηγοριών.',`<section class="hero"><div><p class="eyebrow">Η γνώση γίνεται παιχνίδι</p><h1>Πόσο Ξερόλας είσαι;</h1><p>Το ελληνικό κουίζ γνώσεων που φέρνει την παρέα πιο κοντά. Απάντησε, ανακάλυψε κάτι καινούριο και βάλε την επόμενη πρόκληση!</p><a class="button" href="/play">Παίξε τώρα</a><a id="android-store" class="button" hidden href="https://play.google.com/store/apps/details?id=com.ptsiogas.triviaquiz">Στο Google Play</a><p id="ios-install" hidden>Στο iPhone ή iPad: άνοιξε το παιχνίδι στο Safari και πάτησε «Κοινοποίηση», «Προσθήκη στην οθόνη Αφετηρίας».</p></div><img src="${preview}" width="960" height="504" fetchpriority="high" alt="Η κουκουβάγια του Ξερόλα στον πολύχρωμο τροχό κατηγοριών"></section><section><h2>Ένα παιχνίδι, πολλές προκλήσεις</h2><div class="grid">${modes.map(([t,d])=>`<article class="card"><h3>${esc(t)}</h3><p>${d}</p></article>`).join('')}</div></section><section><h2>Διάλεξε την αγαπημένη σου κατηγορία</h2><p>Πάρε μια γεύση από τις ερωτήσεις του παιχνιδιού. Σκέψου την απάντηση πριν την αποκαλύψεις!</p>${categoryLinks()}</section><section><h2>Συχνές ερωτήσεις</h2>${faqHtml()}</section>`,{faqs:true,landing:true});
for(const [key,slug,genitive,label,intro] of categories){
 const bank=JSON.parse(await readFile(resolve(source,key+'.json'),'utf8'));
 if(bank.category!==key || !Array.isArray(bank.questions))throw new Error('Invalid category: '+key);
 const selected=[...new Map(bank.questions.map(q=>[q.question,q])).values()].slice(0,18);
 if(selected.length<15 || selected.some(q=>typeof q.question!=='string'||typeof q.correct_answer!=='string'||!q.choices.includes(q.correct_answer)))throw new Error('Invalid questions: '+key);
 await page(`/erotiseis/${slug}/`,`Ερωτήσεις γνώσεων ${genitive}`,`Δοκίμασε 18 ερωτήσεις γνώσεων ${genitive} από τον Ξερόλα με απαντήσεις που αποκαλύπτεις εσύ. Εξασκήσου και συνέχισε στο δωρεάν ελληνικό κουίζ.`,`<h1>Ερωτήσεις γνώσεων ${genitive}</h1><p>${intro} Οι παρακάτω 18 ερωτήσεις είναι ένα μικρό δείγμα από την κατηγορία «${label}» του Ξερόλα. Σκέψου πρώτα και μετά άνοιξε την απάντηση.</p>${cta}<ol class="questions">${selected.map(q=>`<li><h2>${esc(q.question)}</h2><details><summary>Δες την απάντηση</summary><p>${esc(q.correct_answer)}</p></details></li>`).join('')}</ol><h2>Έτοιμος για παιχνίδι;</h2>${cta}<h2>Περισσότερες κατηγορίες</h2>${categoryLinks()}`);
}
await page('/pos-paizetai/','Πώς παίζεται ο Ξερόλας','Μάθε πώς να ξεκινήσεις το ελληνικό κουίζ Ξερόλας, να διαλέξεις τρόπο παιχνιδιού και να παίξεις μόνος ή με φίλους.',`<h1>Πώς παίζεται ο Ξερόλας</h1><p>Δεν χρειάζεται να τα ξέρεις όλα. Χρειάζεται μόνο περιέργεια και διάθεση για παιχνίδι!</p><ol><li><strong>Άνοιξε το παιχνίδι.</strong> Πάτησε «Παίξε τώρα» από κινητό, τάμπλετ ή υπολογιστή.</li><li><strong>Διάλεξε πρόκληση.</strong> Παίξε μόνος, δοκίμασε την ημερήσια πρόκληση ή προσκάλεσε φίλους.</li><li><strong>Διάβασε την ερώτηση.</strong> Διάλεξε την απάντηση που θεωρείς σωστή από τις διαθέσιμες επιλογές. Όταν υπάρχει χρονόμετρο, πρόσεχε τον χρόνο.</li><li><strong>Συνέχισε και μάθε.</strong> Δες το αποτέλεσμα και δοκίμασε ξανά. Οι οδηγίες κάθε τρόπου παιχνιδιού εμφανίζονται μέσα στο παιχνίδι.</li></ol>${cta}<h2>Βρες τον τρόπο σου</h2><div class="grid">${modes.map(([t,d])=>`<article class="card"><h3>${esc(t)}</h3><p>${d}</p></article>`).join('')}</div><h2>Κάνε προθέρμανση</h2>${categoryLinks()}`);
await page('/syxnes-erotiseis/','Συχνές ερωτήσεις για τον Ξερόλα','Απαντήσεις για το ελληνικό κουίζ Ξερόλας: δωρεάν παιχνίδι, φίλοι, κατηγορίες, εγκατάσταση στο iPhone και υποστήριξη προγραμμάτων περιήγησης.',`<h1>Συχνές ερωτήσεις</h1>${faqHtml()}<h2>Θέλεις να μας μιλήσεις;</h2><p>Στείλε την ερώτησή σου στο <a href="mailto:coinoro@gmail.com">coinoro@gmail.com</a>.</p>${cta}`,{faqs:true});
await writeFile(resolve(out,'_redirects'),pages.map(p=>`${p.path} /${p.file} 200`).join('\n')+'\n/play /index.html 200\n');
await writeFile(resolve(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p=>`<url><loc>${origin+p.path}</loc></url>`).join('')}</urlset>`);
await writeFile(resolve(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(resolve(out,'pages.json'),JSON.stringify(pages,null,2)+'\n');
console.log(`Generated ${pages.length} pages, ${pages.reduce((n,p)=>n+p.bytes,0)} HTML bytes. Question banks remain local.`);
