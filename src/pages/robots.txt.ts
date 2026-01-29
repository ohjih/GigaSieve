const siteUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321').replace(/\/+$/, '');

const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /cdn-cgi/

Sitemap: ${siteUrl}/sitemap.xml
`;

export function GET() {
    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
}
