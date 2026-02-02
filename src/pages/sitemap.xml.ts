const siteUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321').replace(/\/+$/, '');
const ensureTrailingSlash = (path: string) => {
    if (path === '/') return '/';
    return path.endsWith('/') ? path : `${path}/`;
};

const baseRoutes = [
    '/',
    '/app',
    '/privacy',
    '/about',
    '/contact',
    '/terms',
    '/changelog',
    '/recipes',
    '/recipes/logs',
    '/recipes/logs/nginx-status-codes',
    '/recipes/logs/cloudflare-ray-id',
    '/recipes/logs/top-ips',
    '/recipes/logs/top-uris',
    '/recipes/logs/slow-requests',
    '/recipes/logs/status-by-hour',
    '/recipes/csv',
    '/recipes/csv/top-values',
    '/recipes/csv/preview-huge',
    '/recipes/csv/filter-rows',
    '/recipes/csv/group-by',
    '/recipes/csv/dedupe-rows',
    '/recipes/csv/date-range-filter',
    '/recipes/jsonl',
    '/recipes/jsonl/extract-keys',
    '/recipes/jsonl/error-objects',
    '/recipes/jsonl/top-values',
    '/recipes/jsonl/flatten-nested',
    '/recipes/jsonl/filter-by-key',
    '/recipes/jsonl/regex-extract',
    '/guides',
    '/guides/open-1gb-csv-in-browser',
    '/guides/analyze-nginx-access-log',
    '/guides/regex-extract-from-log',
    '/guides/why-csv-is-slow',
    '/guides/json-vs-jsonl',
    '/guides/remove-pii-from-logs',
    '/guides/analyze-cloudflare-logs',
    '/guides/find-slow-requests',
    '/guides/log-anomaly-basics',
    '/guides/csv-group-by-in-browser',
    '/guides/jsonl-schema-from-logs',
    '/guides/convert-csv-to-jsonl',
];

const localizedRoutes = baseRoutes;

const extraLangs = ['ko', 'es', 'ja', 'zh'];

const routes = [
    ...baseRoutes.map((route) => ensureTrailingSlash(route)),
    ...extraLangs.flatMap((lang) =>
        localizedRoutes.map((route) => {
            const normalized = ensureTrailingSlash(route);
            return normalized === '/' ? `/${lang}/` : `/${lang}${normalized}`;
        })
    ),
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
