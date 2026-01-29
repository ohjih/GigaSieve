import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pagesDir = fileURLToPath(new URL('.', import.meta.url));
const siteUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321').replace(/\/+$/, '');

const isDynamicRoute = (name: string) => name.includes('[') || name.includes(']');

const toRoute = (filePath: string) => {
    const rel = filePath.slice(pagesDir.length).replace(/\\/g, '/');
    const noExt = rel.replace(/\.astro$/, '');
    if (noExt === '/index') {
        return '/';
    }
    if (noExt.endsWith('/index')) {
        return noExt.replace(/\/index$/, '/');
    }
    return noExt;
};

const walk = (dir: string, acc: string[] = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) {
            continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, acc);
            continue;
        }
        if (!entry.name.endsWith('.astro')) {
            continue;
        }
        if (isDynamicRoute(entry.name)) {
            continue;
        }
        acc.push(full);
    }
    return acc;
};

export function GET() {
    const files = walk(pagesDir);
    const urls = files.map((filePath) => {
        const route = toRoute(filePath);
        const stat = fs.statSync(filePath);
        const lastmod = stat.mtime.toISOString();
        return `  <url>\n    <loc>${siteUrl}${route}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    });

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `${urls.join('\n')}\n` +
        `</urlset>\n`;

    return new Response(body, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8'
        }
    });
}
