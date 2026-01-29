const publisherId = import.meta.env.PUBLIC_ADSENSE_PUBLISHER_ID;

const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : `# Set PUBLIC_ADSENSE_PUBLISHER_ID to publish your ads.txt\n`;

export function GET() {
    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
}
