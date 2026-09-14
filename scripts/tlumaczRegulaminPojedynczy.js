/**
 * Naprawia pojedynczy dlugi dokument prawny, tlumaczac PO JEDNYM JEZYKU na
 * raz (zamiast wszystkich 5 w jednym wywolaniu OpenAI) - dluzsze dokumenty
 * (np. Privacy Policy) przy tlumaczeniu na 5 jezykow naraz przekraczaly
 * limit tokenow odpowiedzi i JSON wychodzil urwany.
 *
 *   node scripts/tlumaczRegulaminPojedynczy.js <GID> <TYPE>
 */

'use strict';

require('dotenv').config({ quiet: true });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';
const openaiKey = process.env.OPENAI_API_KEY;

const gid = process.argv[2];
const policyType = process.argv[3] || 'Policy';
const LOCALES = ['pl', 'de', 'sv', 'cs', 'da'];
const LANG_NAMES = { pl: 'Polish', de: 'German', sv: 'Swedish', cs: 'Czech', da: 'Danish' };

const REVIEW_NOTE = '<!-- Tlumaczenie AI - wymaga przegladu prawnego przed publikacja / AI translation - needs legal review before going live -->';

async function adminGraphql(query, variables) {
  const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  return json;
}

async function fetchEnglishBody(gid) {
  const q = `{ translatableResource(resourceId: "${gid}") { translatableContent { key value digest locale } } }`;
  const json = await adminGraphql(q);
  const content = json.data.translatableResource.translatableContent;
  return content.find((c) => c.key === 'body');
}

async function translateOneLocale(bodyHtml, policyType, locale) {
  const prompt = `Translate this Shopify shop policy ("${policyType}") HTML into ${LANG_NAMES[locale]}. This is LEGAL/compliance text (consumer rights, GDPR, refunds, terms of service) for an e-commerce poster print shop (REXIMPRIMIS, operated by C-TECH Sp. z o.o., Poland). Preserve all HTML tags exactly. Preserve verbatim (do NOT translate): company name, address, email, phone number, NIP/REGON/KRS registration numbers, any other legal identifiers. Translate the surrounding legal language accurately and formally, matching how this kind of policy is normally phrased in ${LANG_NAMES[locale]} e-commerce/consumer-law context. Return ONLY the translated HTML, no JSON, no markdown fences, no commentary.

body_html:
${bodyHtml || ''}`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + openaiKey,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  }).then((res) => res.json());

  if (r.error) throw new Error('OpenAI: ' + JSON.stringify(r.error));
  const text = r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
  if (!text) throw new Error('Brak odpowiedzi OpenAI');
  return text.trim();
}

async function registerLocale(gid, locale, digest, value) {
  const mutation = `mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      userErrors { field message }
    }
  }`;
  const translations = [{ locale, key: 'body', value, translatableContentDigest: digest }];
  const json = await adminGraphql(mutation, { resourceId: gid, translations });
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  return json.data.translationsRegister;
}

(async () => {
  if (!gid) throw new Error('Podaj GID jako pierwszy argument');
  const en = await fetchEnglishBody(gid);
  if (!en) throw new Error('Brak tresci EN');

  for (const locale of LOCALES) {
    process.stdout.write(`${locale}... `);
    try {
      const translated = await translateOneLocale(en.value, policyType, locale);
      const value = REVIEW_NOTE + '\n' + translated;
      const result = await registerLocale(gid, locale, en.digest, value);
      if (result.userErrors && result.userErrors.length) {
        console.log('BLEDY: ' + JSON.stringify(result.userErrors));
      } else {
        console.log('OK');
      }
    } catch (e) {
      console.log('BLAD: ' + e.message);
    }
  }
})();
