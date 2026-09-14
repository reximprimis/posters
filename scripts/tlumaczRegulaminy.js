/**
 * Tlumaczy 6 dokumentow prawnych sklepu (Contact, Legal notice, Privacy
 * policy, Refund policy, Shipping, Terms of service) z angielskiego (jedyny
 * istniejacy jezyk) na PL/DE/SV/CS/DA przez translationsRegister.
 *
 * WAZNE: to tresc prawna (prawa konsumenta, RODO, zwroty). Kazdy przetlumaczony
 * dokument dostaje niewidoczny dla klienta komentarz HTML na poczatku body,
 * oznaczajacy go do przegladu prawnego - to tlumaczenie AI, nie substytut
 * weryfikacji przez kogos znajacego lokalne prawo.
 *
 *   node scripts/tlumaczRegulaminy.js
 */

'use strict';

require('dotenv').config({ quiet: true });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';
const openaiKey = process.env.OPENAI_API_KEY;

const POLICIES = [
  { type: 'CONTACT_INFORMATION', gid: 'gid://shopify/ShopPolicy/55047913859' },
  { type: 'LEGAL_NOTICE', gid: 'gid://shopify/ShopPolicy/55047946627' },
  { type: 'PRIVACY_POLICY', gid: 'gid://shopify/ShopPolicy/55035363715' },
  { type: 'REFUND_POLICY', gid: 'gid://shopify/ShopPolicy/55047520643' },
  { type: 'SHIPPING_POLICY', gid: 'gid://shopify/ShopPolicy/55047881091' },
  { type: 'TERMS_OF_SERVICE', gid: 'gid://shopify/ShopPolicy/55047782787' },
];

const LOCALES = ['pl', 'de', 'sv', 'cs', 'da'];

const REVIEW_NOTE = {
  pl: '<!-- Tlumaczenie AI - wymaga przegladu prawnego przed publikacja / AI translation - needs legal review before going live -->',
};

async function adminGraphql(query, variables) {
  const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  const cost = json.extensions && json.extensions.cost;
  return { json, cost };
}

async function throttleGuard(cost) {
  if (!cost || !cost.throttleStatus) return;
  const { currentlyAvailable, restoreRate } = cost.throttleStatus;
  if (currentlyAvailable < 200) {
    const waitMs = Math.ceil((200 - currentlyAvailable) / restoreRate) * 1000 + 500;
    await new Promise((res) => setTimeout(res, waitMs));
  }
}

async function fetchEnglishBody(gid) {
  const q = `{ translatableResource(resourceId: "${gid}") { translatableContent { key value digest locale } } }`;
  const { json, cost } = await adminGraphql(q);
  await throttleGuard(cost);
  const content = json.data.translatableResource.translatableContent;
  return content.find((c) => c.key === 'body');
}

async function translateWithOpenAI(bodyHtml, policyType) {
  const prompt = `Translate this Shopify shop policy ("${policyType}") HTML into Polish (pl), German (de), Swedish (sv), Czech (cs) and Danish (da). This is LEGAL/compliance text (consumer rights, GDPR, refunds, terms of service) for an e-commerce poster print shop (REXIMPRIMIS, operated by C-TECH Sp. z o.o., Poland). Preserve all HTML tags exactly. Preserve verbatim (do NOT translate): company name, address, email, phone number, NIP/REGON/KRS registration numbers, any other legal identifiers. Translate the surrounding legal language accurately and formally, matching how this kind of policy is normally phrased in each language's own e-commerce/consumer-law context. Return ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{"pl":"...","de":"...","sv":"...","cs":"...","da":"..."}

body_html: ${JSON.stringify(bodyHtml || '')}`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + openaiKey,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  }).then((res) => res.json());

  if (r.error) throw new Error('OpenAI: ' + JSON.stringify(r.error));
  const text = r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
  if (!text) throw new Error('Brak odpowiedzi OpenAI: ' + JSON.stringify(r));
  return JSON.parse(text);
}

async function registerLocale(gid, locale, digest, value) {
  const mutation = `mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      userErrors { field message }
    }
  }`;
  const translations = [{ locale, key: 'body', value, translatableContentDigest: digest }];
  const { json, cost } = await adminGraphql(mutation, { resourceId: gid, translations });
  await throttleGuard(cost);
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  return json.data.translationsRegister;
}

(async () => {
  if (!domain || !token) throw new Error('Brak SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN w .env');
  if (!openaiKey) throw new Error('Brak OPENAI_API_KEY w .env');

  console.log(`Tlumacze ${POLICIES.length} dokumentow prawnych na ${LOCALES.length} jezykow...`);

  for (const policy of POLICIES) {
    process.stdout.write(`${policy.type}... `);
    try {
      const en = await fetchEnglishBody(policy.gid);
      if (!en) { console.log('BRAK TRESCI EN, pomijam'); continue; }

      const translated = await translateWithOpenAI(en.value, policy.type);

      const results = [];
      for (const locale of LOCALES) {
        const value = REVIEW_NOTE.pl + '\n' + (translated[locale] || '');
        results.push(await registerLocale(policy.gid, locale, en.digest, value));
      }

      const errs = results.flatMap((r) => r.userErrors || []);
      if (errs.length) {
        console.log('BLEDY: ' + JSON.stringify(errs));
      } else {
        console.log('OK (pl, de, sv, cs, da)');
      }
    } catch (e) {
      console.log('BLAD: ' + e.message);
    }
  }

  console.log('\nGotowe. WAZNE: kazdy dokument ma na poczatku niewidoczny komentarz HTML');
  console.log('oznaczajacy go jako tlumaczenie AI wymagajace przegladu prawnego.');
})();
