"""استخراج نص عربي سليم من ملفات PDF النصية.
pdftotext يعكس ترتيب حروف الأربطة (لا، لم، في…) فيظهر «سجالت» بدل «سجلات».
هنا نقرأ كل حرف بموقعه (pdfplumber) ونرتب السطر من اليمين لليسار،
مع إبقاء نص الرباط كما هو (منطقي) وإعادة الأرقام واللاتيني إلى ترتيبها."""
import json, re, sys
import pdfplumber

LTR = re.compile(r'[0-9A-Za-z٠-٩]')

def line_text(chars):
    chars = sorted(chars, key=lambda c: -c['x1'])
    out, prev = [], None
    for c in chars:
        if prev is not None:
            gap = prev['x0'] - c['x1']
            if gap > max(1.2, c['size'] * 0.18) and c['text'] != ' ' and (out and out[-1] != ' '):
                out.append(' ')
        out.append(c['text'])
        prev = c
    # تجميع مقاطع الأرقام/اللاتيني (مع . / - : , ) وعكسها لأنها LTR
    s = out
    res, i = [], 0
    while i < len(s):
        if LTR.match(s[i]):
            j = i
            while j < len(s) and (LTR.match(s[j]) or (s[j] in './-:,%' and j + 1 < len(s) and LTR.match(s[j + 1]))):
                j += 1
            res.extend(reversed(s[i:j]))
            i = j
        else:
            res.append(s[i]); i += 1
    t = ''.join(res)
    # الأقواس تنعكس بصرياً في النص العربي
    t = t.translate(str.maketrans('()[]', ')(]['))
    t = re.sub(r'ـ+', '', t)          # تطويل
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def page_lines(page):
    chars = [c for c in page.chars if c['text'].strip() or c['text'] == ' ']
    rows = []
    for c in sorted(chars, key=lambda c: c['top']):
        mid = (c['top'] + c['bottom']) / 2
        for r in rows:
            if abs(r['mid'] - mid) < c['size'] * 0.45:
                r['chars'].append(c); break
        else:
            rows.append({'mid': mid, 'chars': [c]})
    rows.sort(key=lambda r: r['mid'])
    return [t for t in (line_text(r['chars']) for r in rows) if t]

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    with pdfplumber.open(src) as pdf:
        pages = [page_lines(p) for p in pdf.pages]
    json.dump(pages, open(dst, 'w'), ensure_ascii=False, indent=0)
    print(dst, len(pages), sum(len(l) for p in pages for l in p))
