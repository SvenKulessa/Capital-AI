import { readFile, writeFile } from 'node:fs/promises';
import { cookieCopy } from '../src/i18n/cookieCopy.ts';
import { cookieStorageRows } from '../src/privacy/cookieStorageInventory.ts';
import { PROCESSING_ACTIVITIES, PRIVACY_NOTICE_VERSION } from '../src/privacy/privacyPolicy.ts';
const path = new URL('../public/datenschutz/index.html', import.meta.url);
let html = await readFile(path, 'utf8');
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for (const activity of PROCESSING_ACTIVITIES.filter(a => ['learning-inquiry','consented-ga4'].includes(a.id))) {
  const section = `<section data-processing-id="${activity.id}"><h2>${escape(activity.title)}</h2>` +
    [['Zweck',activity.purpose],['Datenkategorien',activity.dataCategories.join(' · ')],['Rechtsgrundlage',activity.legalBasis],['Empfänger',activity.recipients.join(' · ')],['Drittland / Transfer',activity.transfer],['Speicherung / Löschung',activity.retention],['Technische Kontrollen',activity.technicalControls.join(' · ')]].map(([label,value])=>`<p><strong>${label}:</strong> ${escape(value)}</p>`).join('') + '</section>';
  const pattern = new RegExp(`<section data-processing-id="${activity.id}">[\\s\\S]*?</section>`);
  html = pattern.test(html) ? html.replace(pattern,section) : html.replace('<section data-processing-id="hosting">', section+'\n<section data-processing-id="hosting">');
}
const inventory = '<!-- cookie-storage:start --><section id="cookie-storage"><h2>Cookies und lokaler Speicher</h2>'+Object.entries(cookieCopy).map(([locale,copy]) =>
 `<details lang="${locale}"${locale==='de'?' open':''}><summary>${escape(copy.inventory)} (${locale.toUpperCase()})</summary><p>${escape(copy.analyticsOff)}</p>`+
 cookieStorageRows(copy).map(([name,storage,purpose,retention])=>`<article><h3 style="overflow-wrap:anywhere">${escape(name)}</h3><p>${escape(storage)}</p><p><strong>${escape(copy.purpose)}:</strong> ${escape(purpose)}</p><p><strong>${escape(copy.retention)}:</strong> ${escape(retention)}</p></article>`).join('')+
 `</details>`).join('')+'</section><!-- cookie-storage:end -->';
if(html.includes('<!-- cookie-storage:start -->')) html=html.replace(/<!-- cookie-storage:start -->[\s\S]*?<!-- cookie-storage:end -->/,inventory);
else html=html.replace('<section><h2>8. Betroffenenrechte', inventory+'\n<section><h2>8. Betroffenenrechte');
html=html.replace(/<p>Stand der zugrunde liegenden Datenschutzinformation:[\s\S]*?<\/p>/,`<p>Datenschutzinformation Version ${PRIVACY_NOTICE_VERSION}. Diese Seite wird als eigenständiges HTML-Dokument ohne JavaScript und ohne Anmeldung ausgeliefert.</p>`);
html=html.replace('Optionales Browser-Analytics und Werbung sind deaktiviert.', 'GA4 wird nur nach gültiger Einwilligung zur Reichweitenmessung geladen. Marketing bleibt deaktiviert.');
if (process.argv.includes('--check')) { if(html !== await readFile(path,'utf8')) throw Error('COOKIE_STORAGE_NOTICE_DRIFT'); }
else await writeFile(path,html);
