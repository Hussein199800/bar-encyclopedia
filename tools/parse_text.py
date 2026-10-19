"""تحويل أسطر الوثيقة (من extract_text.py) إلى بنية: أبواب ← فصول ← مواد.
كل مادة تحفظ رقم صفحتها في ملف PDF وفقراتها كما وردت حرفياً."""
import json, re, sys

HEAD = re.compile(r'^(الباب|الفصل)\s+(\S+(?:\s+(?:عشر|والعشرون|والثلاثون))?)\s*(.*)$')
ART = re.compile(r'^(?:المادة|مادة)\s*/?\s*(\d+)\s*/?\s*(?:مكرر[ةا]?)?\s*:?\s*$')
PARA_START = re.compile(r'^(\d+\s*[.\-)]|[أ-ي]\s*[.\-)]|[-•]|\(\d+\)|\([أ-ي]\))')

def clean(t):
    t = t.replace('\uf0d8', '•').replace('\uf0b7', '•').replace('\uf0a7', '•')
    t = re.sub(r' (اً|ً)(?=[\s.,،:؛]|$)', r'\1', t)
    t = re.sub(r'\s+([.,،:؛])', r'\1', t)
    return re.sub(r'\s+', ' ', t).strip()

def parse(pages, skip_until=None, stop_at=None):
    items, cur, part, chap, section = [], None, None, None, None
    pending_title = None   # بعد سطر «الباب الأول» يأتي عنوانه في السطر التالي
    started = skip_until is None
    for pno, lines in enumerate(pages, 1):
        for line in lines:
            line = line.strip()
            if not started:
                if line == skip_until[1] and pno >= skip_until[0]:
                    started = True
                else:
                    continue
            if stop_at and line.startswith(stop_at):
                return items
            m = ART.match(line)
            if m:
                cur = {'num': m.group(1), 'page': pno, 'part': part, 'chapter': chap, 'section': section, 'lines': []}
                items.append(cur)
                pending_title = None
                continue
            h = HEAD.match(line)
            if h and len(line) < 70 and not line.endswith('.'):
                label = h.group(1) + ' ' + h.group(2)
                rest = h.group(3).strip()
                node = {'label': label, 'title': rest, 'page': pno}
                if h.group(1) == 'الباب':
                    part, chap = node, None
                else:
                    chap = node
                section = None
                pending_title = None if rest else node
                cur = None
                continue
            if pending_title is not None:
                pending_title['title'] = line
                pending_title = None
                continue
            sec = re.match(r'^-\s*(القسم\s+\S+)\s*:\s*(.+)$', line)
            if sec:
                section = {'label': sec.group(1), 'title': sec.group(2), 'page': pno}
                cur = None
                continue
            if line == 'أحكام ختامية':
                chap, section = {'label': '', 'title': line, 'page': pno}, None
                continue
            if cur is not None:
                cur['lines'].append(line)
    return items

def to_paras(lines):
    paras = []
    for l in lines:
        if not paras or PARA_START.match(l):
            paras.append(l)
        else:
            paras[-1] += ' ' + l
    return [clean(p) for p in paras if clean(p)]

if __name__ == '__main__':
    src, dst, mode = sys.argv[1], sys.argv[2], sys.argv[3]
    pages = json.load(open(src))
    if mode == 'internal':
        items = parse(pages, skip_until=(2, 'الباب الأول'), stop_at='استمارة نموذج')
    else:
        items = parse(pages, skip_until=(1, 'الباب الأول'))
    for it in items:
        it['paras'] = to_paras(it.pop('lines'))
    json.dump(items, open(dst, 'w'), ensure_ascii=False, indent=1)
    nums = [int(i['num']) for i in items]
    missing = sorted(set(range(1, max(nums) + 1)) - set(nums))
    dup = sorted({n for n in nums if nums.count(n) > 1})
    print(dst, 'articles', len(items), 'max', max(nums), 'missing', missing, 'dup', dup)
    empty = [i['num'] for i in items if not i['paras']]
    print('empty', empty)
