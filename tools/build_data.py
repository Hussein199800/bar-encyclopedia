"""بناء قاعدة بيانات الموسوعة (data/docs.js) من النصوص المستخرجة.

المصادر:
- raw/law_items.json و raw/internal_items.json: من طبقة النص في ملفات PDF
  (extract_text.py ثم parse_text.py).
- transcribed/*.txt: نسخ بصري للملفات المصورة، بصيغة بسيطة:
    !title / !issued       عنوان الوثيقة وبيان صدورها
    @p <صفحة الملف> <صفحة الكتاب>
    # الباب | العنوان      ## الفصل | العنوان      ### القسم | العنوان
    = <رقم المادة>          =* <مفتاح> | <عنوان>   (فقرة غير مرقمة)
    [؟] = كلمة غير واضحة في الصورة
كل مادة تحمل رقم صفحتها؛ لا شيء هنا مكتوب من خارج الوثائق.
"""
import json, re, os

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, '..', 'data', 'docs.js')

DOCS = [
    dict(id='law', title='قانون تنظيم مهنة المحاماة', short='قانون المهنة', kind='law',
         issued='القانون رقم 30 لعام 2010 — صدر بتاريخ 1431/7/30 هـ الموافق 2010/7/11 م، بعد إقرار مجلس الشعب في 2010/6/28.',
         file='law-30-2010.pdf', quality='text', icon='scale'),
    dict(id='internal', title='النظام الداخلي لنقابة المحامين وفروعها', short='النظام الداخلي', kind='regulation',
         issued='الصادر بقرار المؤتمر العام رقم 22 تاريخ 1982/7/31، والمعدل بقرار المؤتمر العام رقم (4) تاريخ 1988/6/22، وقرار المؤتمر العام رقم (25) تاريخ 1992/6/29.',
         file='internal-regulation.pdf', quality='text', icon='building-bank'),
    dict(id='fin', src='fin', title='النظام المالي لنقابة المحامين وفروعها', short='النظام المالي', kind='regulation',
         file='financial-system.pdf', quality='transcribed', icon='coin'),
    dict(id='coop', src='coop', title='النظام الموحد لصناديق تعاون المحامين', short='صندوق التعاون', kind='fund',
         file='cooperation-funds.pdf', quality='transcribed', icon='users-group'),
    dict(id='amb', src='amb', title='نظام صندوق إسعاف المحامين', short='صندوق الإسعاف', kind='fund',
         file='ambulance-fund.pdf', quality='transcribed', icon='first-aid-kit'),
    dict(id='tak', src='tak', title='النظام الموحد لصندوق التكافل الاجتماعي للمحامين', short='صندوق التكافل', kind='fund',
         file='social-solidarity-fund.pdf', quality='transcribed', icon='heart-handshake'),
    dict(id='agn', src='agencies', title='المرجع القانوني للمندوبين بقواعد تنظيم الوكالات القضائية', short='مرجع الوكالات', kind='reference',
         file='agencies-reference.pdf', quality='transcribed', icon='file-certificate'),
]

PARA = re.compile(r'^([أ-ي]{1,2}\s*-|\d+\s*[-.)]|\(\d+\)|[-•]|\d+\))')

def node(label, title, page):
    return {'label': label.strip(), 'title': title.strip(), 'page': page}

def from_items(path):
    items = json.load(open(os.path.join(ROOT, 'raw', path)))
    arts = []
    for a in items:
        arts.append({
            'key': a['num'], 'num': a['num'], 'label': 'المادة ' + a['num'],
            'page': a['page'], 'bookPage': a['page'],
            'part': a['part'], 'chapter': a['chapter'], 'section': a.get('section'),
            'paras': a['paras'],
        })
    return arts

def from_transcribed(name):
    meta, arts = {}, []
    part = chap = sec = None
    cur = None
    page = book = None
    after_page = False
    for raw in open(os.path.join(ROOT, 'transcribed', name + '.txt'), encoding='utf-8'):
        line = raw.strip()
        if not line:
            continue
        if line.startswith('!title '):
            meta['title'] = line[7:]; continue
        if line.startswith('!issued '):
            meta['issued'] = line[8:]; continue
        m = re.match(r'^@p\s+(\d+)\s+(\d+)$', line)
        if m:
            page, book = int(m.group(1)), int(m.group(2)); after_page = True; continue
        m = re.match(r'^(#{1,3})\s+(.+?)\s*\|\s*(.+)$', line)
        if m:
            n = node(m.group(2), m.group(3), page)
            if len(m.group(1)) == 1: part, chap, sec = n, None, None
            elif len(m.group(1)) == 2: chap, sec = n, None
            else: sec = n
            cur = None; continue
        m = re.match(r'^=\s*(\d+)$', line)
        if m:
            cur = {'key': m.group(1), 'num': m.group(1), 'label': 'المادة ' + m.group(1),
                   'page': page, 'bookPage': book, 'part': part, 'chapter': chap, 'section': sec, 'paras': []}
            arts.append(cur); after_page = False; continue
        m = re.match(r'^=\*\s*(\w+)\s*\|\s*(.+)$', line)
        if m:
            cur = {'key': m.group(1), 'num': None, 'label': m.group(2),
                   'page': page, 'bookPage': book, 'part': part, 'chapter': chap, 'section': sec, 'paras': [], 'pages': [page]}
            arts.append(cur); after_page = False; continue
        if cur is None:
            raise SystemExit('سطر خارج أي مادة في %s: %s' % (name, line))
        # سطر يكمل جملة انقطعت عند نهاية الصفحة
        if after_page and cur['paras'] and not PARA.match(line):
            cur['paras'][-1] += ' ' + line
        else:
            cur['paras'].append(line)
        if 'pages' in cur and page not in cur['pages']:
            cur['pages'].append(page)
        after_page = False
    return meta, arts

def split_agency_rules(arts):
    """قواعد التنظيم (1–51) تُفصل كل قاعدة في بند مستقل ليسهل البحث والإحالة."""
    out = []
    for a in arts:
        if a['key'] != 'rules':
            out.append(a); continue
        intro, rules = [], []
        for p in a['paras']:
            m = re.match(r'^(\d+)-\s*(.*)$', p)
            if m and int(m.group(1)) == len(rules) + 1:
                rules.append({'n': m.group(1), 'paras': [m.group(2)]})
            elif rules:
                rules[-1]['paras'].append(p)
            else:
                intro.append(p)
        if intro:
            out.append(dict(a, paras=intro))
        for r in rules:
            out.append({'key': 'r' + r['n'], 'num': r['n'], 'label': 'القاعدة ' + r['n'],
                        'page': None, 'bookPage': None, 'part': a['part'], 'chapter': a['chapter'], 'section': None,
                        'paras': r['paras']})
    return out

def agency_rule_pages(arts):
    """صفحة كل قاعدة من مواضع @p في ملف النسخ."""
    pages, page, n = {}, None, 0
    for raw in open(os.path.join(ROOT, 'transcribed', 'agencies.txt'), encoding='utf-8'):
        m = re.match(r'^@p\s+(\d+)', raw.strip())
        if m: page = int(m.group(1)); continue
        m = re.match(r'^(\d+)-\s', raw.strip())
        if m and int(m.group(1)) == n + 1 and page and page >= 3:
            n += 1; pages[str(n)] = page
            if n == 51: break
    for a in arts:
        if a['key'].startswith('r') and a['num'] in pages:
            a['page'] = a['bookPage'] = pages[a['num']]

def toc_of(arts):
    toc, idx = [], {}
    for a in arts:
        path = []
        for lvl in ('part', 'chapter', 'section'):
            n = a.get(lvl)
            if not n: continue
            path.append((n['label'] + '|' + n['title'], n))
        parent = toc
        key = ''
        for k, n in path:
            key += '/' + k
            if key not in idx:
                item = {'label': n['label'], 'title': n['title'], 'page': n['page'], 'children': [], 'articles': []}
                idx[key] = item; parent.append(item)
            parent = idx[key]['children']
            last = idx[key]
        if path:
            last['articles'].append(a['key'])
        else:
            toc.append({'label': '', 'title': a['label'], 'page': a['page'], 'children': [], 'articles': [a['key']]})
    return toc

def strip_nodes(a):
    # الباب/الفصل يحفظان في الفهرس؛ المادة تحتفظ بالعناوين فقط لمسار التنقل
    for lvl in ('part', 'chapter', 'section'):
        n = a.get(lvl)
        a[lvl] = (n['label'] + ' ' + n['title']).strip() if n else None
    return a

out = []
for d in DOCS:
    if d['quality'] == 'text':
        arts = from_items(d['id'] + '_items.json')
    else:
        meta, arts = from_transcribed(d['src'])
        d['title'] = d.get('title') or meta.get('title')
        d['fullTitle'] = meta.get('title')
        d['issued'] = meta.get('issued', '')
        if d['id'] == 'agn':
            arts = split_agency_rules(arts)
            agency_rule_pages(arts)
    toc = toc_of(arts)
    nums = [int(a['num']) for a in arts if a['num'] and not a['key'].startswith('r')]
    missing = sorted(set(range(1, max(nums) + 1)) - set(nums)) if nums else []
    unclear = sum(p.count('[؟]') for a in arts for p in a['paras'])
    for a in arts:
        a.pop('pages', None)
        strip_nodes(a)
    rec = {k: d[k] for k in ('id', 'title', 'short', 'kind', 'issued', 'file', 'quality', 'icon')}
    rec.update(fullTitle=d.get('fullTitle') or d['title'], toc=toc, articles=arts, missing=missing, unclear=unclear)
    out.append(rec)
    print('%-9s %3d بنداً  ناقص=%s  غير-واضح=%d' % (d['id'], len(arts), missing, unclear))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('/* مولّد آلياً من tools/build_data.py — لا تعدّله يدوياً */\n')
    f.write('window.ENC_DOCS = ')
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
