/**
 * Pobiera reklamy konkurencji z Meta Ad Library API (ads_archive) i zapisuje
 * lokalnie jako JSON, gotowy do wgrania do panelu "Competitor Watch"
 * (Artifact + db, https://claude.ai/artifact/5VxuTP4QKP8P7bjmWdnt7i).
 *
 * Wymaga META_AD_LIBRARY_TOKEN w .env (token z Graph API Explorer, po
 * weryfikacji tozsamosci na facebook.com/ID i utworzeniu apki z produktem
 * "Ad Library API" na developers.facebook.com).
 *
 * Uzycie (z folderu creatives/):
 *   node fetchMetaAdLibrary.js --brand="Gallerix" --search="Gallerix"
 *   node fetchMetaAdLibrary.js --brand="Posterlounge" --pageId=123456
 *
 * Wynik: data/meta_ads_<brand>.json (tablica rekordow gotowych pod
 * kolekcje "ads" w panelu).
 */

'use strict';
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');

const token = process.env.META_AD_LIBRARY_TOKEN;
const apiVersion = 'v21.0';

function arg(name) {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : null;
}

async function fetchAds({ brand, searchTerms, pageId, countries = ['SE', 'DE', 'PL', 'US', 'GB', 'DK'] }) {
  if (!token) throw new Error('Brak META_AD_LIBRARY_TOKEN w .env — patrz naglowek pliku.');

  const params = new URLSearchParams({
    access_token: token,
    ad_reached_countries: JSON.stringify(countries),
    ad_active_status: 'ALL',
    fields: [
      'id', 'ad_creation_time', 'ad_delivery_start_time', 'ad_delivery_stop_time',
      'page_name', 'page_id', 'ad_snapshot_url',
      'ad_creative_bodies', 'ad_creative_link_titles', 'ad_creative_link_captions',
      'publisher_platforms', 'languages',
    ].join(','),
    limit: '50',
  });
  if (searchTerms) params.set('search_terms', searchTerms);
  if (pageId) params.set('search_page_ids', JSON.stringify([pageId]));

  const url = `https://graph.facebook.com/${apiVersion}/ads_archive?${params.toString()}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error('Meta API error: ' + JSON.stringify(json.error));

  return (json.data || []).map((ad) => ({
    id: `meta-${ad.id}`,
    brand,
    platform: (ad.publisher_platforms || ['facebook']).join(', '),
    followers: '',
    country: Array.isArray(countries) ? countries.join(', ') : '',
    headline: (ad.ad_creative_bodies || []).join(' / ') || (ad.ad_creative_link_titles || []).join(' / ') || '(brak tekstu)',
    tags: ['meta-ad-library'],
    image: '',
    noteDate: (ad.ad_delivery_start_time || ad.ad_creation_time || '').slice(0, 10),
    // Bezpieczny publiczny link (bez naszego access_token w URL) zamiast ad.ad_snapshot_url,
    // ktore API zwraca z osadzonym tokenem - nie wgrywac tokena do bazy/strony.
    snapshotUrl: `https://www.facebook.com/ads/library/?id=${ad.id}`,
  }));
}

(async () => {
  const brand = arg('brand');
  const searchTerms = arg('search');
  const pageId = arg('pageId');
  if (!brand || (!searchTerms && !pageId)) {
    console.error('Uzycie: node fetchMetaAdLibrary.js --brand="Nazwa" --search="fraza" [--pageId=123]');
    process.exit(1);
  }

  const ads = await fetchAds({ brand, searchTerms, pageId });
  const outDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `meta_ads_${brand.toLowerCase().replace(/\s+/g, '_')}.json`);
  fs.writeFileSync(outFile, JSON.stringify(ads, null, 2), 'utf8');

  console.log(`Zapisano ${ads.length} reklam -> ${outFile}`);
})();
