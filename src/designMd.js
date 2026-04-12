const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Resolves canonical design-md URL: env override, then design-md/<slug>/README.md link, then default pattern.
 */
function resolveDesignMdUrl(slug, explicitUrl) {
  const trimmed = explicitUrl && String(explicitUrl).trim();
  if (trimmed) return trimmed;

  const slugPart = slug && String(slug).trim();
  if (!slugPart) return '';

  const readmePath = path.join(__dirname, '..', 'design-md', slugPart, 'README.md');
  if (fs.existsSync(readmePath)) {
    const text = fs.readFileSync(readmePath, 'utf8');
    const m = text.match(/https:\/\/getdesign\.md\/[^\s)\]]+/);
    if (m) return m[0];
  }

  return `https://getdesign.md/${slugPart}/design-md`;
}

function roughStripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches design-md page text (truncated). Returns { url, text } or throws.
 */
async function fetchDesignMdBody(url, maxChars) {
  const { data } = await axios.get(url, {
    timeout: 20000,
    responseType: 'text',
    transformResponse: [(raw) => raw],
    headers: { Accept: 'text/html, text/markdown, */*' },
  });
  const raw = String(data);
  const text = raw.includes('<!DOCTYPE') || raw.includes('<html') ? roughStripHtml(raw) : raw.replace(/\s+/g, ' ').trim();
  return { url, text: text.slice(0, maxChars) };
}

module.exports = { resolveDesignMdUrl, fetchDesignMdBody };
