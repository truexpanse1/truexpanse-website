#!/usr/bin/env python3
"""Build site-manifest.json: what the Owner's Control Center reads about truexpanse.com.

The Control Center's Website desk and Blog & search read this file (through the edge function, which adds
published posts and live wording changes) to know the pages, their headlines and buttons, images, offers
and forms. Run it before every deploy (scripts/deploy.sh does). Same contract as the Control Center
template's sites (see netlify/edge-functions/approved-changes.ts).
"""
import json, os, re, datetime, html as H

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = 'https://truexpanse.com'
# Pages that are not part of the public site (old versions, internal tools, previews).
SKIP = {'index-old.html', 'index-v2.html', 'home.html', 'pitch/index.html', 'partners.html', 'downloads/mat-newsletter-preview.html',
        'grow/index.html', 'outcome-engine/index.html', 'blog/post-template/index.html', 'pages/standard.html', 'pages/coatings-pro.html',
        'pages/forge-coatings.html', 'pages/life-coaching.html'}
TYPE = {'index.html': 'home', 'pages/about.html': 'about', 'pages/contact.html': 'contact', 'pages/faq.html': 'faq', 'pages/privacy.html': 'legal',
        'blog/index.html': 'hub', 'apply.html': 'offer', 'guides/business-growth-checklist.html': 'offer',
        'million-dollar-math-calculator.html': 'tool', 'million-dollar-math.html': 'tool', 'pages/roi-calculator.html': 'tool', 'pages/procrastination-tax.html': 'tool'}

def text(s): return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()
def url_of(f):
    if f == 'index.html': return '/'
    if f.endswith('/index.html'): return '/' + f[:-len('index.html')]
    return '/' + f
def absu(u, f):
    if re.match(r'^(https?:|mailto:|tel:|#|data:)', u): return u
    if u.startswith('/'): return u
    base = '/' + os.path.dirname(f)
    parts = [p for p in (base + '/' + u).split('/') if p not in ('', '.')]
    out = []
    for p in parts:
        if p == '..':
            if out: out.pop()
        else: out.append(p)
    return '/' + '/'.join(out)

pages, headlines, images, ctas, forms = [], [], {}, [], []
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('node_modules', 'netlify', 'scripts')]
    for name in files:
        if not name.endswith('.html'): continue
        f = os.path.relpath(os.path.join(dirpath, name), ROOT)
        if f in SKIP: continue
        h = open(os.path.join(ROOT, f), encoding='utf-8', errors='ignore').read()
        noindex = re.search(r'<meta name="robots" content="[^"]*noindex', h) is not None
        if noindex and TYPE.get(f) not in ('offer', 'tool'): continue
        u = url_of(f)
        title = text((re.search(r'<title>(.*?)</title>', h, re.S) or [None, ''])[1])
        desc = H.unescape((re.search(r'<meta name="description" content="([^"]*)"', h) or [None, ''])[1])
        h1 = text((re.search(r'<h1\b[^>]*>(.*?)</h1>', h, re.S) or [None, ''])[1])
        cta_m = re.search(r'<a\b[^>]*data-edit="cta"[^>]*>(.*?)</a>', h, re.S) or re.search(r'<a\b[^>]*href="([^"]*(?:apply\.html|contact\.html)[^"]*)"[^>]*class="[^"]*btn[^"]*"[^>]*>(.*?)</a>', h, re.S)
        cta = None
        if cta_m:
            tag = cta_m.group(0)
            href = (re.search(r'href="([^"]*)"', tag) or [None, ''])[1]
            cta = {'label': text(cta_m.group(cta_m.lastindex)), 'href': absu(href, f)}
            ctas.append({'url': u, 'label': cta['label'], 'href': cta['href'], 'bot': 'Conversion Analyst'})
        imgs = []
        for m in re.finditer(r'<img\b[^>]*>', h):
            src = (re.search(r'\bsrc="([^"]+)"', m.group(0)) or [None, ''])[1]
            alt = H.unescape((re.search(r'\balt="([^"]*)"', m.group(0)) or [None, ''])[1])
            if not src or src.startswith('data:') or src.startswith('http'): continue
            src = absu(src, f)
            if src.startswith('/images/'):
                slot = (re.search(r'\bdata-edit-img="([a-z0-9][a-z0-9-]{0,39})"', m.group(0)) or [None, None])[1]
                imgs.append({'src': src, 'alt': alt, **({'slot': slot} if slot else {})})
                images.setdefault(src, {'src': src, 'alt': alt, 'source': 'truexpanse.com', 'real': True, 'usedOn': []})
                if u not in images[src]['usedOn']: images[src]['usedOn'].append(u)
        for m in re.finditer(r'<form\b[^>]*name="([^"]+)"[^>]*data-netlify', h):
            forms.append({'name': m.group(1), 'url': u})
        # Forms that post into a Netlify form by script (e.g. /strategy-session's 2-step form -> coaching-application).
        for m in re.finditer(r"'form-name'\s*:\s*'([^']+)'", h):
            if not any(x['name'] == m.group(1) and x['url'] == u for x in forms):
                forms.append({'name': m.group(1), 'url': u})
        t = TYPE.get(f) or ('note' if f.startswith('blog/') else 'service' if f.startswith(('pages/', 'get-found/', 'autopilot/')) else 'page')
        pages.append({'url': u, 'type': t, 'title': title, 'description': desc, 'headline': h1, 'cta': cta, 'images': [i for n, i in enumerate(imgs) if i.get('slot') or sum(1 for j in imgs[:n] if not j.get('slot')) < 6],
                      'keywords': [k.strip() for k in H.unescape((re.search(r'<meta name="keywords" content="([^"]*)"', h) or [None, ''])[1]).split(',') if k.strip()][:8],
                      'source': f, 'review': None, 'noindex': noindex})
        if h1: headlines.append({'url': u, 'text': h1, 'source': f, 'bot': 'Copy Strategist'})

pages.sort(key=lambda p: (p['url'] != '/', p['type'] not in ('offer', 'service'), p['url']))
man = {
    'site': {'name': 'TrueXpanse', 'origin': ORIGIN, 'generated': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')},
    'pages': pages,
    'elements': {
        'headlines': headlines,
        'images': sorted(images.values(), key=lambda i: i['src']),
        'ctas': ctas,
        'hvco': [
            {'name': 'Free Strategy Session', 'url': '/apply.html', 'form': 'coaching-application', 'status': 'live', 'bot': 'Offer Builder'},
            {'name': 'The Business Growth Checklist', 'url': '/guides/business-growth-checklist.html', 'form': None, 'status': 'live', 'bot': 'Offer Builder'},
            {'name': 'Million-Dollar Math Calculator', 'url': '/million-dollar-math-calculator.html', 'form': None, 'status': 'live', 'bot': 'Offer Builder'},
        ],
        'seo': {'sitemap': '/sitemap.xml', 'llms': '/llms.txt', 'robots': '/robots.txt', 'bot': 'Site Keeper'},
        'keywords': [],
        'landingPages': [{'url': p['url'], 'headline': p['headline'], 'status': 'live', 'bot': 'Site Builder'} for p in pages if p['type'] in ('offer', 'service')],
    },
    'forms': forms,
    'liveChanges': [],
}
open(os.path.join(ROOT, 'site-manifest.json'), 'w', encoding='utf-8').write(json.dumps(man, indent=2, ensure_ascii=False))
print(f"site-manifest.json: {len(pages)} pages, {len(headlines)} headlines, {len(ctas)} buttons, {len(images)} images, {len(forms)} forms")
