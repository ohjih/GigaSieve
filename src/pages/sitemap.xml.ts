const siteUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321').replace(/\/+$/, '');

const routes = [
    '/',
    '/app',
    '/privacy',
    '/about',
    '/contact',
    '/terms',
    '/recipes',
    '/recipes/logs',
    '/recipes/logs/nginx-status-codes',
    '/recipes/logs/cloudflare-ray-id',
    '/recipes/logs/top-ips',
    '/recipes/csv',
    '/recipes/csv/top-values',
    '/recipes/csv/preview-huge',
    '/recipes/csv/filter-rows',
    '/recipes/jsonl',
    '/recipes/jsonl/extract-keys',
    '/recipes/jsonl/error-objects',
    '/recipes/jsonl/top-values',
    '/guides',
    '/guides/open-1gb-csv-in-browser',
    '/guides/analyze-nginx-access-log',
    '/guides/regex-extract-from-log',
    '/guides/why-csv-is-slow',
    '/guides/json-vs-jsonl',
    '/guides/remove-pii-from-logs',
];

export function GET() {
    const urls = routes.map((route) => {
        return `  <url>\n    <loc>${siteUrl}${route}</loc>\n  </url>`;
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
