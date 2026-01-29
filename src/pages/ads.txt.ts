import { SITE_CONFIG } from '../site.config';

const publisherId = SITE_CONFIG.adsensePublisherId?.trim();
const isValidPublisherId = !!publisherId && /^pub-\d{16}$/.test(publisherId);

const body = isValidPublisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : `# Set SITE_CONFIG.adsensePublisherId in src/site.config.ts to publish your ads.txt\n`;

export function GET() {
    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
}
