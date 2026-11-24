// Approved changes from Don's Owner's Control Center (TrueXpanse workspace), applied as each page is served.
// Ported from the Control Center template (Field Asset Solutions' site) 2026-11-10; same contract.
//
// The owner approves new wording in the Control Center (Website desk) and clicks
// Publish. This function reads the published wording (public text only, through
// site_live_changes) and writes it into the page before it reaches the visitor or
// Google. No rebuild and no deploy per change, and Undo is instant.
//
// Spots that can change are tagged in the templates: data-edit="headline" (the h1),
// "lede" (the intro line under it) and "cta" (the page's main buttons), plus the
// <title> and meta description. Photos tagged data-edit-img="slot" on an <img> (not inside <picture>) are swapped the
// same way: new src and alt, srcset dropped. Uploaded photos are served from /cc-media/ (a proxy in _redirects).
// At the next release the helper writes live changes
// into the source files, so the code stays the source of truth.
//
// Blog posts written in the Control Center (Blog & search) are served the same way: published posts
// render from /blog/post-template/ at /blog/<slug>/ and are added to the blog list,
// sitemap.xml, llms.txt and site-manifest.json. Taking a post down removes it everywhere at once.
//
// Fail-safe: if the Control Center is slow or down, the page is served unchanged.
// Demo: ?view=demo shows changes approved in the Demo workspace (with a ribbon,
// noindex); ?view=live goes back. Real visitors only ever see the live workspace.
import type { Config, Context } from '@netlify/edge-functions';

const SUPABASE_URL = 'https://curjmqoiibjcrglqwtqh.supabase.co';
// Publishable key: safe in public code by design (the same key ships in the Control Center).
const PUBLISHABLE_KEY = 'sb_publishable_hHZoWSA_inU117fvHSce6A_ZMhP19_Y';
// The site's main next step (posts in the manifest point to it).
const MAIN_CTA = { label: 'Book a Free Strategy Session', href: '/apply.html' };
const CACHE_MS = 10_000;

type Target = 'headline' | 'lede' | 'cta' | 'title' | 'description';
type Change = { page_url: string; target: Target; after: string; published_at: string };

const cache = new Map<string, { at: number; rows: Change[] }>();

async function loadChanges(host: string, view: 'live' | 'demo'): Promise<Change[]> {
  const key = `${host}|${view}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/site_live_changes`, {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_host: host, p_view: view }),
      signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = (await r.json()) as Change[];
    const clean = Array.isArray(rows) ? rows.filter((c) => c && typeof c.after === 'string' && typeof c.page_url === 'string') : [];
    cache.set(key, { at: Date.now(), rows: clean });
    return clean;
  } catch {
    return hit?.rows ?? []; // keep the last good copy; never break the page
  }
}

type Img = { page_url: string; slot: string; src: string; alt: string; width: number | null; height: number | null; published_at: string };
const imgCache = new Map<string, { at: number; rows: Img[] }>();
async function loadImages(host: string, view: 'live' | 'demo'): Promise<Img[]> {
  const key = `${host}|${view}`;
  const hit = imgCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/site_live_images`, {
      method: 'POST', headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_host: host, p_view: view }), signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = (await r.json()) as Img[];
    const clean = Array.isArray(rows) ? rows.filter((x) => x && typeof x.page_url === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(x.slot || '')
      && /^\/[A-Za-z0-9/_.%-]+$/.test(x.src || '') && !x.src.includes('..') && !x.src.startsWith('//')) : [];
    imgCache.set(key, { at: Date.now(), rows: clean });
    return clean;
  } catch {
    return hit?.rows ?? [];
  }
}
function setAttr(tag: string, name: string, val: string) {
  const re = new RegExp(`\\s${name}="[^"]*"`);
  const a = ` ${name}="${esc(val)}"`;
  return re.test(tag) ? tag.replace(re, () => a) : tag.replace(/^<img\b/i, () => `<img${a}`);
}
/** Photo swaps: each <img data-edit-img="slot"> gets the published photo and description; srcset and sizes are dropped
 *  (they would show the old photo). If the tag sets width and height, the height follows the new photo's shape. */
export function applyImages(html: string, imgs: Img[]): { html: string; applied: number } {
  let applied = 0;
  let out = html;
  for (const im of imgs) {
    const re = new RegExp(`<img\\b[^>]*\\bdata-edit-img="${im.slot}"[^>]*>`, 'gi');
    out = out.replace(re, (tag) => {
      applied++;
      let t = tag.replace(/\s(?:srcset|sizes)="[^"]*"/gi, '');
      t = setAttr(t, 'src', im.src);
      t = setAttr(t, 'alt', im.alt || '');
      const w = Number((t.match(/\swidth="(\d+)"/) || [])[1]);
      if (w && im.width && im.height && /\sheight="\d+"/.test(t)) t = t.replace(/\sheight="\d+"/, ` height="${Math.round((w * im.height) / im.width)}"`);
      return t;
    });
  }
  return { html: out, applied };
}

type Post = { slug: string; industry?: string | null; updated_at?: string; title: string; topic: string | null; summary: string | null; body_html: string; seo_title: string | null; seo_description: string | null; image: string | null; image_alt: string | null; author: string | null; jsonld: string | null; published_at: string; keywords: string[] | null };
const postCache = new Map<string, { at: number; rows: Post[] }>();
async function loadPosts(host: string, view: 'live' | 'demo'): Promise<Post[]> {
  const key = `${host}|${view}`;
  const hit = postCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/site_live_posts`, {
      method: 'POST', headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_host: host, p_view: view }), signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = (await r.json()) as Post[];
    const clean = Array.isArray(rows) ? rows.filter((x) => x && /^[a-z0-9-]+$/.test(x.slug || '') && typeof x.body_html === 'string') : [];
    postCache.set(key, { at: Date.now(), rows: clean });
    return clean;
  } catch {
    return hit?.rows ?? [];
  }
}
// Audience key (from the Control Center profile) → [page path, label]. A post for that audience links to its page.
const INDUSTRY_PAGE: Record<string, [string, string]> = {};
const niceDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
function fillTokens(tpl: string, p: Post): string {
  const map: Record<string, string> = {
    __CC_SEO_TITLE__: esc(p.seo_title || p.title), __CC_SEO_DESC__: esc(p.seo_description || p.summary || ''), __CC_SLUG__: p.slug,
    __CC_TOPIC__: esc(p.topic || 'Blog'), __CC_TITLE__: esc(p.title), __CC_SUMMARY__: esc(p.summary || ''),
    __CC_IMAGE__: esc((p.image || '').replace(/^\//, '')), __CC_IMAGE_ALT__: esc(p.image_alt || ''), __CC_AUTHOR__: esc(p.author || ''),
    __CC_DATE_ISO__: (p.published_at || '').slice(0, 10), __CC_DATE__: niceDate(p.published_at),
    __CC_UPDATED_ISO__: (p.updated_at || p.published_at || '').slice(0, 10), __CC_UPDATED__: niceDate(p.updated_at || p.published_at),
    __CC_INDUSTRY_LINKS__: INDUSTRY_PAGE[p.industry || ''] ? `For <a href="${INDUSTRY_PAGE[p.industry || ''][0]}">${INDUSTRY_PAGE[p.industry || ''][1]}</a>` : '',
    __CC_IMAGE_URL__: p.image ? `https://truexpanse.com${p.image.startsWith('/') ? '' : '/'}${esc(p.image)}` : 'https://truexpanse.com/images/don_primary.jpg',
  };
  return tpl.replace(/__CC_[A-Z_]+__/g, (m) => map[m] ?? '');
}
/** A published post in the site's own Field Notes layout. body_html comes from the Control Center's escaping renderer. */
export function renderPost(tpl: string, p: Post): string {
  const [body, sources = ''] = p.body_html.split('<!--cc:sources-->');
  let out = tpl.replace('__CC_BODY__', () => body).replace('__CC_SOURCES__', () => sources);
  out = fillTokens(out, p);
  if (!sources.trim()) out = out.replace(/<aside class="sources"[^>]*data-cc-sources[^>]*>[\s\S]*?<\/aside>/, '');
  out = out.replace('<meta name="robots" content="noindex, follow">', ''); // the template's own noindex; the preview keeps its site-wide one
  if (p.jsonld) out = out.replace('</head>', () => `<script type="application/ld+json">${p.jsonld!.replace(/<\//g, '<\\/')}</script></head>`);
  return out;
}
export function addCards(html: string, posts: Post[]): string {
  const m = html.match(/<template data-cc-card[^>]*>([\s\S]*?)<\/template>/);
  if (!m || !posts.length) return html;
  const cards = posts.map((p) => fillTokens(m[1], p).replace('January 1, 2000', niceDate(p.published_at)).replace('2000-01-01', (p.published_at || '').slice(0, 10))).join('');
  return html.replace(/(<span data-cc-cards[^>]*><\/span>)/, (_m, mk) => `${mk}${cards}`);
}
export function addToSitemap(xml: string, posts: Post[]): string {
  const origin = (xml.match(/<loc>(https?:\/\/[^/<]+)/) || [])[1];
  if (!origin || !posts.length) return xml;
  const urls = posts.map((p) => `<url><loc>${origin}/blog/${p.slug}/</loc><lastmod>${(p.published_at || '').slice(0, 10)}</lastmod></url>`).join('');
  return xml.replace('</urlset>', () => `${urls}</urlset>`);
}
export function addToLlms(txt: string, posts: Post[]): string {
  const origin = (txt.match(/https?:\/\/[^/\s)]+/) || [])[0];
  if (!origin || !posts.length) return txt;
  return `${txt.replace(/\s+$/, '')}\n\n## Blog posts (published from the Control Center)\n${posts.map((p) => `- [${p.title}](${origin}/blog/${p.slug}/): ${p.summary || ''}`).join('\n')}\n`;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const normPath = (p: string) => {
  let x = p.replace(/\/index\.html$/, '/');
  if (!x.endsWith('/') && !/\.[a-z0-9]+$/i.test(x)) x += '/';
  return x;
};
/** The forms one page can be asked for by: /pages/coaching.html, /pages/coaching, /pages/coaching/. */
const samePage = (pageUrl: string, path: string) => {
  if (pageUrl === path) return true;
  const bare = (u: string) => u.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  return bare(pageUrl) === bare(path);
};

function inner(html: string, tag: string, edit: string, text: string, all: boolean) {
  const re = new RegExp(`(<${tag}\\b[^>]*\\bdata-edit="${edit}"[^>]*>)([\\s\\S]*?)(</${tag}>)`, all ? 'g' : '');
  return html.replace(re, (_m, open, _old, close) => `${open}${esc(text)}${close}`);
}
function metaContent(html: string, attr: 'name' | 'property', key: string, text: string) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`, 'g');
  return html.replace(re, (_m, a, b) => `${a}${esc(text)}${b}`);
}

export function applyToHtml(html: string, changes: Change[]): { html: string; applied: number } {
  let out = html;
  let applied = 0;
  for (const c of changes) {
    const before = out;
    const t = c.after.trim();
    if (!t) continue;
    if (c.target === 'headline') out = inner(out, 'h1', 'headline', t, false);
    else if (c.target === 'lede') out = inner(out, 'p', 'lede', t, false);
    else if (c.target === 'cta') out = inner(out, 'a', 'cta', t, true);
    else if (c.target === 'title') {
      out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(t)}</title>`);
      out = metaContent(out, 'property', 'og:title', t);
      out = metaContent(out, 'name', 'twitter:title', t);
    } else if (c.target === 'description') {
      out = metaContent(out, 'name', 'description', t);
      out = metaContent(out, 'property', 'og:description', t);
      out = metaContent(out, 'name', 'twitter:description', t);
    }
    if (out !== before) applied++;
  }
  return { html: out, applied };
}

export function applyToManifest(json: string, changes: Change[], posts: Post[] = [], imgs: Img[] = []): string {
  try {
    const m = JSON.parse(json);
    for (const p of posts) {
      if ((m.pages || []).some((x: any) => x.url === `/blog/${p.slug}/`)) continue;
      (m.pages ||= []).push({ url: `/blog/${p.slug}/`, type: 'note', title: p.seo_title || p.title, description: p.seo_description || '', headline: p.title,
        cta: { ...MAIN_CTA }, images: p.image ? [{ src: p.image, alt: p.image_alt || '' }] : [], keywords: p.keywords || [],
        source: 'Control Center · Blog & search', review: null });
    }
    for (const c of changes) {
      const p = (m.pages || []).find((x: any) => x.url === c.page_url);
      if (!p) continue;
      if (c.target === 'headline') p.headline = c.after;
      else if (c.target === 'cta' && p.cta) p.cta.label = c.after;
      else if (c.target === 'title') p.title = c.after;
      else if (c.target === 'description') p.description = c.after;
      if (m.elements?.headlines && c.target === 'headline') for (const h of m.elements.headlines) if (h.url === c.page_url) h.text = c.after;
      if (m.elements?.ctas && c.target === 'cta') for (const h of m.elements.ctas) if (h.url === c.page_url) h.label = c.after;
    }
    m.liveChanges = changes.map((c) => ({ url: c.page_url, target: c.target, publishedAt: c.published_at }));
    for (const im of imgs) {
      const p = (m.pages || []).find((x: any) => x.url === im.page_url);
      const slot = (p?.images || []).find((x: any) => x.slot === im.slot);
      if (!slot) continue;
      slot.swappedFrom ||= { src: slot.src, alt: slot.alt };
      slot.src = im.src;
      slot.alt = im.alt;
    }
    m.liveImages = imgs.map((i) => ({ url: i.page_url, slot: i.slot, src: i.src, publishedAt: i.published_at }));
    return JSON.stringify(m, null, 2);
  } catch {
    return json;
  }
}

const RIBBON = `<div id="cc-demo-ribbon" style="position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;background:#0f172a;color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:10px 16px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25)"><span>Demo view: showing changes approved in the Demo workspace.</span><a href="?view=live" style="color:#fdba74;text-decoration:underline">Exit demo view</a></div>`;

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const q = url.searchParams.get('view');
  const cookieView = /(?:^|;\s*)cc_view=demo(?:;|$)/.test(req.headers.get('cookie') || '');
  const view: 'live' | 'demo' = q === 'demo' || (q !== 'live' && cookieView) ? 'demo' : 'live';

  const path = normPath(url.pathname);
  if (path === '/blog/post-template/' && req.headers.get('x-cc-template') !== '1') {
    return fetch(new URL('/cc-not-found/', url)); // the template is not a page; serve the site's 404
  }
  const postMatch = path.match(/^\/blog\/([a-z0-9-]+)\/$/);
  if (postMatch && postMatch[1] !== 'post-template') {
    const post = (await loadPosts(url.hostname, view)).find((p) => p.slug === postMatch[1]);
    if (post) {
      const tpl = await fetch(new URL('/blog/post-template/', url), { headers: { 'x-cc-template': '1' } });
      if (tpl.ok) {
        let html = renderPost(await tpl.text(), post);
        if (view === 'demo') html = html.replace('</body>', `${RIBBON}</body>`);
        const h = new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate', 'x-cc-post': post.slug });
        if (view === 'demo') h.set('x-robots-tag', 'noindex, nofollow');
        if (q === 'demo') h.append('set-cookie', 'cc_view=demo; Path=/; Secure; SameSite=Lax');
        return new Response(html, { status: 200, headers: h });
      }
    }
  }

  const res = await context.next();
  const type = res.headers.get('content-type') || '';
  const isHtml = type.includes('text/html');
  const isManifest = url.pathname === '/site-manifest.json';
  const isSitemap = url.pathname === '/sitemap.xml';
  const isLlms = url.pathname === '/llms.txt';
  if (res.status !== 200 || (!isHtml && !isManifest && !isSitemap && !isLlms)) return res;
  const cardPage = path === '/blog/' || path === '/'; // pages with a <template data-cc-card> strip (homepage added 2026-11-24)
  const wantsPosts = isManifest || isSitemap || isLlms || cardPage;
  const posts = wantsPosts ? await loadPosts(url.hostname, view) : [];

  const changes = isSitemap || isLlms ? [] : (await loadChanges(url.hostname, view)).filter((c) => isManifest || samePage(c.page_url, path));
  const imgs = isSitemap || isLlms ? [] : (await loadImages(url.hostname, view)).filter((i) => isManifest || samePage(i.page_url, path));
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('x-approved-changes', String(changes.length));
  headers.set('x-approved-images', String(imgs.length));
  if (q === 'demo') headers.append('set-cookie', 'cc_view=demo; Path=/; Secure; SameSite=Lax');
  if (q === 'live') headers.append('set-cookie', 'cc_view=; Path=/; Max-Age=0; Secure; SameSite=Lax');
  if (view === 'demo') headers.set('x-robots-tag', 'noindex, nofollow');

  headers.set('x-cc-posts', String(posts.length));
  const body = await res.text();
  if (isManifest) return new Response(applyToManifest(body, changes, posts, imgs), { status: 200, headers });
  if (isSitemap) return new Response(addToSitemap(body, posts), { status: 200, headers });
  if (isLlms) return new Response(addToLlms(body, posts), { status: 200, headers });
  let { html } = applyToHtml(body, changes);
  if (imgs.length) html = applyImages(html, imgs).html;
  if (cardPage) html = addCards(html, posts);
  if (view === 'demo') html = html.replace('</body>', `${RIBBON}</body>`);
  return new Response(html, { status: 200, headers });
};

export const config: Config = {
  path: '/*',
  excludedPath: ['/css/*', '/js/*', '/images/*', '/cc-media/*', '/downloads/*', '/robots.txt', '/*.ico', '/*.svg', '/*.png', '/*.jpg', '/*.jpeg', '/*.webp', '/*.gif', '/*.pdf', '/*.css', '/*.js', '/*.woff2', '/*.mp4'],
};
