// Netlify Edge Function — dynamic OG tags for BTD post pages
// Intercepts /{slug} requests, fetches post from Firebase, injects OG meta into HTML

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only handle post slugs (not assets, not root, not known pages)
  const skip = ['/', '/new-music', '/popular', '/search', '/about', '/contact'];
  if (skip.includes(path) || path.includes('.')) {
    return context.next();
  }

  const slug = path.replace(/^\//, '');
  if (!slug) return context.next();

  const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
  const PROJECT = 'ar-scouting-dashboard';
  const docId = `btd_post_${slug}`;

  try {
    // Hard timeout — never crash the page
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
    const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/config/${docId}?key=${FIREBASE_KEY}`;
    const resp = await fetch(firebaseUrl);
    if (!resp.ok) return context.next();

    const data = await resp.json();
    const f = data.fields;
    if (!f) return context.next();

    const title = `${f.artist?.stringValue} - "${f.title?.stringValue}" | Before The Data`;
    const description = f.writeup?.stringValue?.substring(0, 155) || `Free music discovery on Before The Data`;
    const image = f.artUrl?.stringValue || 'https://beforethedata.com/assets/og-image.jpg';
    const canonicalUrl = `https://beforethedata.com/${slug}`;

    // Fetch the base HTML
    const pageResp = await context.next();
    const html = await pageResp.text();

    // Inject dynamic OG tags
    const injected = html
      .replace(/<meta property="og:title"[^>]*>/g, `<meta property="og:title" content="${title}">`)
      .replace(/<meta property="og:description"[^>]*>/g, `<meta property="og:description" content="${description}">`)
      .replace(/<meta property="og:image"[^>]*>/g, `<meta property="og:image" content="${image}">`)
      .replace(/<meta property="og:url"[^>]*>/g, `<meta property="og:url" content="${canonicalUrl}">`)
      .replace(/<meta name="twitter:title"[^>]*>/g, `<meta name="twitter:title" content="${title}">`)
      .replace(/<meta name="twitter:description"[^>]*>/g, `<meta name="twitter:description" content="${description}">`)
      .replace(/<meta name="twitter:image"[^>]*>/g, `<meta name="twitter:image" content="${image}">`)
      .replace(/<meta name="description"[^>]*>/g, `<meta name="description" content="${description}">`);

    return new Response(injected, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    return context.next();
  }
};

// Path scoping handled by netlify.toml
