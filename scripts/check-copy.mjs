// Brand voice gate (CLAUDE.md copy rules) over the built public HTML:
// no em dashes, no exclamation marks, no hype words. Also lists remaining placeholders.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = 'dist/client';
const HYPE = /\b(stunning|luxurious|luxury|unforgettable|breathtaking|amazing|perfect|world-class|nestled|oasis|haven|exquisite|unparalleled|best-in-class)\b/i;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });
}

const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');

let problems = 0;
let placeholders = 0;
for (const file of htmlFiles(root)) {
  const html = readFileSync(file, 'utf8');
  const meta = [...html.matchAll(/<(?:title)>([^<]*)<|content="([^"]*)"/g)].map((m) => m[1] ?? m[2]).join(' ');
  const text = `${visibleText(html)} ${meta}`;
  const where = relative(root, file);
  for (const [rule, re] of [['em dash', /—/], ['exclamation mark', /!/], ['hype word', HYPE]]) {
    const m = text.match(re);
    if (m) {
      problems++;
      const i = m.index ?? 0;
      console.log(`${where}: ${rule}: "...${text.slice(Math.max(0, i - 40), i + 40)}..."`);
    }
  }
  placeholders += (text.match(/\[PLACEHOLDER:/g) ?? []).length;
}
console.log(`copy check: ${problems} problem(s); ${placeholders} placeholder(s) still to fill before launch`);
process.exit(problems ? 1 : 0);
