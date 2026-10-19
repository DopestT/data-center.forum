import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "app");
const cssPath = path.join(appDir, "globals.css");

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "admin") continue;
      files.push(...walk(full));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

function importPathFor(file) {
  let relative = path.relative(path.dirname(file), path.join(root, "components", "PublicTopbar")).replaceAll(path.sep, "/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

let changedFiles = 0;
for (const file of walk(appDir)) {
  let source = fs.readFileSync(file, "utf8");
  const startToken = '<header className="topbar">';
  const start = source.indexOf(startToken);
  if (start < 0) continue;
  const end = source.indexOf("</header>", start + startToken.length);
  if (end < 0) throw new Error(`Topbar in ${path.relative(root, file)} has no closing header`);

  source = `${source.slice(0, start)}<PublicTopbar>${source.slice(start + startToken.length, end)}</PublicTopbar>${source.slice(end + "</header>".length)}`;
  if (!source.includes('from "') || !source.includes("PublicTopbar")) throw new Error(`Unexpected source structure in ${path.relative(root, file)}`);
  if (!source.includes("import { PublicTopbar }")) {
    source = `import { PublicTopbar } from "${importPathFor(file)}";\n${source}`;
  }
  fs.writeFileSync(file, source);
  changedFiles += 1;
}

const chyronCss = `

/* Verified data-center news chyron */
.newsChyron{min-height:38px;display:flex;align-items:stretch;border-bottom:1px solid var(--line);background:#061218;position:sticky;top:72px;z-index:9;overflow:hidden;font-size:12px}.newsChyronLead{display:flex;align-items:center;flex:0 0 auto;padding:0 16px;background:var(--accent);color:#062019;font-size:10px;font-weight:900;letter-spacing:.12em;z-index:2}.newsChyronViewport{min-width:0;flex:1;overflow:hidden}.newsChyronTrack{display:flex;width:max-content;min-width:100%;animation:newsChyronCrawl 52s linear infinite;will-change:transform}.newsChyronGroup{display:flex;align-items:center;flex:0 0 auto}.newsChyronItem{display:flex;align-items:center;gap:10px;min-height:38px;padding:0 18px;white-space:nowrap;border-right:1px solid var(--line);color:#d7e1e5}.newsChyronItem strong{color:#fff;font-size:12px}.newsChyronItem time{color:#7f969f;font-variant-numeric:tabular-nums}.newsChyronType{color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.1em}.newsChyronVerified{border:1px solid #31584b;border-radius:999px;padding:3px 6px;color:#a8f0d4;font-size:8px;font-weight:900;letter-spacing:.08em}.newsChyronItem:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}.newsChyron:hover .newsChyronTrack,.newsChyron:focus-within .newsChyronTrack{animation-play-state:paused}.newsChyronEmpty{padding:0 clamp(20px,5vw,72px);color:#8fa5ae;font-size:10px;font-weight:800;letter-spacing:.1em}.newsChyronEmpty span{align-self:center}@keyframes newsChyronCrawl{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media(max-width:600px){.newsChyron{min-height:34px;top:72px}.newsChyronLead{padding:0 10px;font-size:0}.newsChyronLead::after{content:"NEWS";font-size:9px}.newsChyronItem{min-height:34px;padding:0 12px;gap:7px}.newsChyronItem span:not(.newsChyronType):not(.newsChyronVerified){display:none}}@media (prefers-reduced-motion: reduce){.newsChyronViewport{overflow-x:auto}.newsChyronTrack{animation:none}.newsChyronGroup[aria-hidden="true"]{display:none}.newsChyron:hover .newsChyronTrack,.newsChyron:focus-within .newsChyronTrack{animation-play-state:paused}}
`;

let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes("/* Verified data-center news chyron */")) {
  css += chyronCss;
  fs.writeFileSync(cssPath, css);
}

console.log(JSON.stringify({ changedFiles, cssUpdated: !css.includes("/* impossible sentinel */") }, null, 2));
