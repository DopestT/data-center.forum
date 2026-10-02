import test from "node:test";
import assert from "node:assert/strict";
import { extractContent, observeSource } from "./intelligence-content.mjs";

const paragraph = "AWS plans two data center complexes in Madison County with an announced investment of $10 billion. ".repeat(3);
const url = "https://www.aboutamazon.com/news/aws/test";
const source = { id: "aws-test", publisher: "AWS", url, project_slug: "test" };
const amazon = (news, body = paragraph) => `<nav>${news}</nav><h1>AWS investment</h1><div class="ArticlePage-articleBody"><p>${body}</p><div class="contentItem-role-promo">${news}</div></div><footer>${news}</footer>`;

test("changing navigation and embedded recommendations does not change article text", () => {
  assert.deepEqual(extractContent(amazon("Old news"), url), extractContent(amazon("New news"), url));
});
test("Google extraction excludes navigation and related cards", () => {
  const google = news => `<nav>${news}</nav><h1>Investment</h1><div data-component="uni-article-body"><p>${paragraph}</p></div><div class="uni-article-card">${news}</div>`;
  assert.deepEqual(extractContent(google("Old"), "https://blog.google/test"), extractContent(google("New"), "https://blog.google/test"));
});
test("missing or short article bodies fail rather than silently hashing the page", () => {
  assert.throws(() => extractContent("<main>Access denied</main>", url));
  assert.throws(() => extractContent('<div class="ArticlePage-articleBody">Error</div>', url));
});
test("legacy baseline migration retains the old hash without issuing a change", () => {
  const result = observeSource(source, extractContent(amazon("News"), url), { hash: "legacy", changed_at: "old" }, "now");
  assert.equal(result.baseline, true);
  assert.equal(result.change, null);
  assert.equal(result.snapshot.legacy_hash, "legacy");
  assert.equal(result.snapshot.changed_at, "old");
});
test("real article changes retain both texts and remain unverified", () => {
  const first = observeSource(source, extractContent(amazon("News"), url), null, "first");
  const second = observeSource(source, extractContent(amazon("News", paragraph.replaceAll("$10", "$12")), url), first.snapshot, "second");
  assert.equal(second.change.status, "needs_verification");
  assert.match(second.change.previous_text, /\$10 billion/);
  assert.match(second.change.current_text, /\$12 billion/);
  const third = observeSource(source, extractContent(amazon("Other news", paragraph.replaceAll("$10", "$12")), url), second.snapshot, "third");
  assert.equal(third.change, null);
  assert.equal(third.snapshot.last_observed_at, "third");
  assert.equal(third.snapshot.changed_at, "second");
});
