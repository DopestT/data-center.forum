import { load } from "cheerio";
import crypto from "node:crypto";

// Versioned per extraction strategy: legacy hashes are not comparable to article hashes.
export function extractContent(html, url) {
  const host = new URL(url).hostname;
  const $ = load(html);
  let selector;
  if (host === "www.aboutamazon.com") selector = ".ArticlePage-articleBody";
  if (host === "blog.google") selector = '[data-component="uni-article-body"]';
  if (!selector) return { text: normalizeLegacyHtml(html), extraction_version: "page-v1" };

  const body = $(selector);
  if (body.length !== 1) throw new Error(`Expected one article body (${selector}); found ${body.length}`);
  body.find('script,style,noscript,svg,nav,aside,footer,.related-content,.contentItem-role-promo,.articles-links,.uni-article-card').remove();
  // Preserve word boundaries between blocks without breaking inline text.
  body.find('p,div,h1,h2,h3,h4,li,br').each((_, element) => $(element).append(" "));
  const title = $("h1").first().text();
  const text = `${title} ${body.text()}`.replace(/\s+/g, " ").trim();
  if (text.length < 200) throw new Error("Article body is missing or unexpectedly short");
  return { text, extraction_version: `article-v1:${host}` };
}

function normalizeLegacyHtml(html) {
  return html.replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
}

export function observeSource(source, content, previous, observedAt) {
  const hash = crypto.createHash("sha256").update(content.text).digest("hex");
  const version = previous?.extraction_version ?? "page-v1";
  const baseline = !previous || version !== content.extraction_version;
  const changed = !baseline && previous.hash !== hash;
  const snapshot = {
    ...previous, hash, text: content.text, extraction_version: content.extraction_version,
    project_slugs: source.project_slugs ?? (source.project_slug ? [source.project_slug] : []),
    publisher: source.publisher, url: source.url,
    first_seen_at: previous?.first_seen_at ?? observedAt,
    last_observed_at: observedAt,
    changed_at: changed || !previous ? observedAt : previous.changed_at,
    ...(baseline ? { baseline_at: observedAt, ...(previous ? { legacy_hash: previous.hash } : {}) } : {})
  };
  const change = changed ? {
    source_id: source.id, project_slugs: snapshot.project_slugs, publisher: source.publisher,
    url: source.url, detected_at: observedAt, previous_hash: previous.hash, current_hash: hash,
    extraction_version: content.extraction_version,
    previous_text: previous.text ?? null, current_text: content.text,
    status: "needs_verification"
  } : null;
  return { snapshot, change, baseline };
}
