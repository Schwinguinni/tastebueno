const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' } };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const ip = (event.headers['x-forwarded-for'] || event.headers['x-nf-client-connection-ip'] || '').split(',')[0].trim();

    let geo = { city: 'Unknown', country: 'Unknown', countryCode: '', lat: 0, lon: 0 };
    if (ip && ip !== '127.0.0.1' && ip !== '::1') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,country,countryCode,lat,lon`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') geo = geoData;
      } catch {}
    }

    const store = getStore({ name: 'analytics', consistency: 'strong' });

    let pageviews = [];
    try {
      const existing = await store.get('pageviews', { type: 'json' });
      if (Array.isArray(existing)) pageviews = existing;
    } catch {}

    pageviews.unshift({
      ip,
      page: body.page || '/',
      ref: body.ref || '',
      ts: Date.now(),
      city: geo.city,
      country: geo.country,
      countryCode: geo.countryCode,
      lat: geo.lat,
      lon: geo.lon,
      ua: (event.headers['user-agent'] || '').substring(0, 120),
    });

    if (pageviews.length > 2000) pageviews = pageviews.slice(0, 2000);
    await store.setJSON('pageviews', pageviews);

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('track:', err.message);
    return { statusCode: 200, body: 'ok' };
  }
};
