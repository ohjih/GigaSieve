import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = [
  'src/pages/guides',
  'src/pages/recipes',
  'src/pages/formats',
  'src/pages/parsers',
  'src/pages/benchmarks'
];

const MIN_WORDS = 200;

const listAstroFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listAstroFiles(full);
    if (entry.name.endsWith('.astro')) return [full];
    return [];
  });
};

const stripFrontmatter = (raw) => {
  if (!raw.startsWith('---')) return raw;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return raw;
  return raw.slice(end + 4);
};

const stripTags = (text) => text
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const countWords = (text) => {
  const cleaned = stripTags(text);
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
};

const titleRegex = /title=\"([^\"]+)\"/g;
const descRegex = /description=\"([^\"]+)\"/g;

const warnings = [];
const titles = new Map();
const descriptions = new Map();

for (const dir of TARGET_DIRS) {
  const fullDir = path.join(ROOT, dir);
  const files = listAstroFiles(fullDir);
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf-8');
    const content = stripFrontmatter(raw);
    const wordCount = countWords(content);
    if (wordCount < MIN_WORDS) {
      warnings.push({ type: 'thin', file: path.relative(ROOT, file), detail: `Word count ${wordCount} (< ${MIN_WORDS})` });
    }

    let match;
    while ((match = titleRegex.exec(raw)) !== null) {
      const key = match[1].toLowerCase();
      const list = titles.get(key) ?? [];
      list.push(file);
      titles.set(key, list);
    }
    while ((match = descRegex.exec(raw)) !== null) {
      const key = match[1].toLowerCase();
      const list = descriptions.get(key) ?? [];
      list.push(file);
      descriptions.set(key, list);
    }
  }
}

const duplicates = [];
for (const [title, files] of titles.entries()) {
  if (files.length > 1) duplicates.push({ type: 'title', key: title, files });
}
for (const [desc, files] of descriptions.entries()) {
  if (files.length > 1) duplicates.push({ type: 'description', key: desc, files });
}

console.log('Content Audit Report');
console.log('====================');
console.log(`Scanned dirs: ${TARGET_DIRS.join(', ')}`);
console.log(`Warnings: ${warnings.length}`);

warnings.forEach((w) => {
  console.log(`- [${w.type}] ${w.file} :: ${w.detail}`);
});

console.log(`Duplicates: ${duplicates.length}`);
duplicates.forEach((d) => {
  console.log(`- [${d.type}] ${d.key}`);
  d.files.forEach((f) => console.log(`  - ${path.relative(ROOT, f)}`));
});

console.log('Done.');
