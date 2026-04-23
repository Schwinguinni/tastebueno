const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  let password;
  try { ({ password } = JSON.parse(event.body || '{}')); } catch {}

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const store = getStore({ name: 'analytics', consistency: 'strong' });
    const pageviews = await store.get('pageviews', { type: 'json' }) || [];

    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const fiveMinsAgo = now - 300000;

    const today = pageviews.filter(v => v.ts > oneDayAgo);
    const active = pageviews.filter(v => v.ts > fiveMinsAgo);

    // Page breakdown
    const pages = {};
    pageviews.forEach(v => { pages[v.page] = (pages[v.page] || 0) + 1; });

    // Country breakdown
    const countries = {};
    pageviews.forEach(v => {
      if (v.country && v.country !== 'Unknown') {
        countries[v.country] = (countries[v.country] || 0) + 1;
      }
    });

    // Referrer breakdown
    const referrers = {};
    pageviews.forEach(v => {
      if (v.ref) {
        try {
          const host = new URL(v.ref).hostname;
          referrers[host] = (referrers[host] || 0) + 1;
        } catch {}
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total: pageviews.length,
        today: today.length,
        active: active.length,
        recent: pageviews.slice(0, 50),
        pages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 10),
        countries: Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 15),
        referrers: Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 10),
        mapPoints: pageviews.filter(v => v.lat && v.lon && v.lat !== 0).slice(0, 200),
      }),
    };
  } catch (err) {
    console.error('analytics-data:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
