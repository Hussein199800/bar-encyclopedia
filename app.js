"use strict";

/* =========================================================
   موسوعة نقابة المحامين — المنطق
   موقع ثابت بلا خادم: كل المحتوى في data/*.js، والتنقل بالروابط (#/...).
   التخزين المحلي لتفضيلات الواجهة فقط وبمفاتيح تبدأ بـ enc_
   (نفس النطاق قد يستضيف تطبيقات أخرى لصاحب الموقع؛ لا نلمس مفاتيحها).
========================================================= */

const DOCS = window.ENC_DOCS || [];
const ENC = window.ENC || {};
const DOC = {};
DOCS.forEach(function (d) {
    d.byKey = {};
    d.articles.forEach(function (a, i) { a.idx = i; a.doc = d.id; d.byKey[a.key] = a; });
    DOC[d.id] = d;
});

const TOPIC = {};
(ENC.topics || []).forEach(function (t) { TOPIC[t.id] = t; });
const ROLE = {};
(ENC.roles || []).forEach(function (r) { ROLE[r.id] = r; });
const TOOL = {};
(ENC.tools || []).forEach(function (t) { TOOL[t.id] = t; });
const CAT = {};
(ENC.cats || []).forEach(function (c) { CAT[c.id] = c; });

const NUMBER_LOCALE = "en-US";

/* =========================================================
   أدوات عامة
========================================================= */

function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function fmt(n) {
    return Number(n || 0).toLocaleString(NUMBER_LOCALE);
}

function store(key, value) {
    try {
        if (value === undefined) return localStorage.getItem("enc_" + key);
        localStorage.setItem("enc_" + key, value);
    } catch (e) {}
    return null;
}

function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
}

function docColor(id) {
    return "var(--doc-" + id + ")";
}

function dot(id) {
    return '<span class="doc-dot" style="background:' + docColor(id) + '"></span>';
}

/* تطبيع عربي للبحث: حذف التشكيل والتطويل وتوحيد الألف والياء والتاء المربوطة،
   والأرقام الهندية إلى غربية. */
function norm(s) {
    return String(s || "")
        .replace(/[ً-ْٰـ]/g, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
        .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 1776); })
        .toLowerCase();
}

const STOP = new Set(["في", "من", "على", "الى", "عن", "او", "و", "ما", "مع", "هل", "التي", "الذي", "هو", "هي", "ذلك", "هذا", "هذه", "كل", "اذا", "لا", "ان", "بين", "حتى", "عند", "بعد", "قبل", "غير"]);

/* تجذيع خفيف: حذف أدوات التعريف والعطف والجر الملتصقة واللواحق الشائعة. */
function stem(w) {
    if (/^\d+$/.test(w)) return w;
    let s = w;
    s = s.replace(/^(وبال|وال|بال|كال|فال|لل|ال)/, "");
    if (s.length > 4) s = s.replace(/^[وفبلك](?=..)/, "");
    if (s.length > 4) s = s.replace(/(ات|ون|ين|ان|يه|ها|هم|تها|ته)$/, "");
    if (s.length > 3) s = s.replace(/[هي]$/, "");
    return s;
}

function tokens(s) {
    return norm(s).split(/[^ء-يa-z0-9]+/).filter(function (w) {
        return w && !STOP.has(w) && (w.length > 1 || /\d/.test(w));
    }).map(stem).filter(Boolean);
}

/* تعبير لإبراز الكلمات في النص الأصلي مع مرونة الحروف المتشابهة */
function highlightRegex(terms) {
    const parts = terms.filter(function (t) { return t.length > 1; }).map(function (t) {
        return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/ا/g, "[اأإآٱ]")
            .replace(/ي/g, "[يىئ]")
            .replace(/ه/g, "[هة]")
            .replace(/و/g, "[وؤ]");
    });
    if (!parts.length) return null;
    return new RegExp("(" + parts.join("|") + ")", "g");
}

function highlight(text, terms) {
    const safe = esc(text);
    const re = highlightRegex(terms || []);
    return re ? safe.replace(re, "<mark>$1</mark>") : safe;
}

function unclearMarks(html) {
    return html.replace(/\[؟\]/g, '<span class="unclear" title="كلمة غير واضحة في الصورة الممسوحة — تحتاج مراجعة مقابل الأصل">[؟]</span>');
}

/* =========================================================
   المراجع: "law:9 internal:8" ← روابط
========================================================= */

function parseRefs(refs) {
    return String(refs || "").trim().split(/\s+/).filter(Boolean).map(function (r) {
        const m = r.match(/^(\w+):(\w+)$/);
        if (!m) return null;
        const d = DOC[m[1]];
        const a = d && d.byKey[m[2]];
        return { doc: m[1], key: m[2], article: a || null, raw: r };
    }).filter(Boolean);
}

function refLabel(ref) {
    const d = DOC[ref.doc];
    if (!d) return ref.raw;
    const a = ref.article;
    if (!a) return d.short + " " + ref.key;
    if (a.num && !a.key.startsWith("r")) return d.short + " م" + a.num;
    if (a.key.startsWith("r")) return d.short + " ق" + a.num;
    return d.short + ": " + a.label.split(":")[0].split("—")[0].trim();
}

function refsHTML(refs) {
    return parseRefs(refs).map(function (r) {
        return '<a class="ref" href="#/doc/' + r.doc + "/" + r.key + '" title="' + esc(r.article ? r.article.label + " — " + DOC[r.doc].title : "") + '">' +
            dot(r.doc) + esc(refLabel(r)) + "</a>";
    }).join("");
}

function articleUrl(a) {
    return "#/doc/" + a.doc + "/" + a.key;
}

/* فهرس عكسي: أين ذُكرت كل مادة (موضوعات ومسؤوليات وأدوات) */
const MENTIONS = {};

function addMention(refs, item) {
    parseRefs(refs).forEach(function (r) {
        const k = r.doc + ":" + r.key;
        (MENTIONS[k] = MENTIONS[k] || []);
        if (!MENTIONS[k].some(function (x) { return x.url === item.url; })) MENTIONS[k].push(item);
    });
}

function topicRefs(t) {
    const all = [];
    (t.blocks || []).forEach(function (b) {
        (b.items || []).forEach(function (it) { all.push(it[1]); });
        if (b.refs) all.push(b.refs);
        (b.rows || []).forEach(function (row) {
            row.forEach(function (cell) { if (/^\w+:\w+(\s+\w+:\w+)*$/.test(cell)) all.push(cell); });
        });
    });
    return all.join(" ");
}

function roleRefs(r) {
    const all = [];
    (ENC.roleGroups || []).forEach(function (g) {
        (r[g.k] || []).forEach(function (it) { all.push(it[1]); });
    });
    return all.join(" ");
}

(ENC.topics || []).forEach(function (t) {
    addMention(topicRefs(t), { url: "#/topic/" + t.id, title: t.title, icon: (CAT[t.cat] || {}).icon || "book", type: "موضوع" });
});
(ENC.roles || []).forEach(function (r) {
    addMention(roleRefs(r), { url: "#/role/" + r.id, title: r.title, icon: r.icon, type: "مسؤوليات" });
});
(ENC.tools || []).forEach(function (t) {
    addMention(t.refs, { url: "#/tool/" + t.id, title: t.title, icon: t.icon, type: "أداة" });
});
Object.keys(ENC.checklists || {}).forEach(function (id) {
    const t = TOOL[id];
    ENC.checklists[id].groups.forEach(function (g) {
        g.items.forEach(function (it) {
            addMention(it[1], { url: "#/tool/" + id, title: t ? t.title : id, icon: t ? t.icon : "checklist", type: "أداة" });
        });
    });
});

/* =========================================================
   فهرس البحث
========================================================= */

const INDEX = [];

function addIndex(entry) {
    entry.tTitle = tokens(entry.title);
    entry.tText = tokens(entry.text);
    entry.nTitle = norm(entry.title);
    entry.nText = norm(entry.text);
    INDEX.push(entry);
}

DOCS.forEach(function (d) {
    d.articles.forEach(function (a) {
        const context = [a.part, a.chapter, a.section].filter(Boolean).join(" — ");
        addIndex({
            type: "article", url: articleUrl(a), doc: d.id,
            title: a.label + " — " + d.short,
            label: a.label, context: context,
            text: a.paras.join(" ") + " " + context,
            raw: a.paras.join(" "),
            num: a.num, key: a.key, page: a.page, bookPage: a.bookPage
        });
    });
});

(ENC.topics || []).forEach(function (t) {
    const parts = [t.summary];
    (t.blocks || []).forEach(function (b) {
        parts.push(b.h);
        (b.items || []).forEach(function (it) { parts.push(it[0]); });
        (b.rows || []).forEach(function (r) { parts.push(r.join(" ")); });
    });
    addIndex({ type: "topic", url: "#/topic/" + t.id, cat: t.cat, title: t.title, text: parts.join(" "), raw: t.summary, icon: (CAT[t.cat] || {}).icon });
});

(ENC.roles || []).forEach(function (r) {
    const parts = [r.summary, r.group];
    (ENC.roleGroups || []).forEach(function (g) {
        (r[g.k] || []).forEach(function (it) { parts.push(it[0]); });
    });
    addIndex({ type: "role", url: "#/role/" + r.id, title: r.title + " — المسؤوليات والصلاحيات", text: parts.join(" "), raw: r.summary, icon: r.icon });
});

(ENC.tools || []).forEach(function (t) {
    addIndex({ type: "tool", url: "#/tool/" + t.id, title: t.title, text: t.desc, raw: t.desc, icon: t.icon });
});

const TYPE_NAMES = { article: "مادة", topic: "موضوع", role: "مسؤوليات", tool: "أداة" };
const TYPE_ICONS = { article: "file-text", topic: "bookmark", role: "id-badge-2", tool: "tool" };

/* «م 57» أو «المادة 57» أو «57» ← رقم مادة؛ ويمكن تقييده بوثيقة بذكر اسمها */
function parseQuery(q) {
    const n = norm(q);
    let num = null;
    const m = n.match(/(?:^|\s)(?:الماده|ماده|م\.?|القاعده|قاعده|ق\.?)\s*\/?\s*(\d+)/) || n.match(/^\s*(\d+)\s*$/);
    if (m) num = m[1];
    let docHint = null;
    const hints = { law: ["قانون", "المهنه"], internal: ["الداخلي"], fin: ["المالي"], coop: ["التعاون"], amb: ["الاسعاف"], tak: ["التكافل"], agn: ["الوكالات", "مرجع"] };
    Object.keys(hints).forEach(function (id) {
        if (hints[id].some(function (h) { return n.indexOf(h) !== -1; })) docHint = docHint || id;
    });
    const rest = num ? n.replace(/(?:الماده|ماده|م\.?|القاعده|قاعده|ق\.?)?\s*\/?\s*\d+/, " ") : n;
    return { num: num, docHint: docHint, terms: tokens(rest), phrase: norm(q).trim() };
}

function search(q, opts) {
    opts = opts || {};
    const pq = parseQuery(q);
    if (!pq.terms.length && !pq.num) return { results: [], pq: pq };
    const results = [];
    INDEX.forEach(function (e) {
        if (opts.type && e.type !== opts.type) return;
        if (opts.doc && e.doc !== opts.doc) return;
        if (opts.cat && e.cat !== opts.cat) return;
        let score = 0;
        if (pq.num) {
            if (e.type !== "article" || e.num !== pq.num) {
                if (!pq.terms.length) return;
            } else {
                score += 60;
                if (pq.docHint && e.doc === pq.docHint) score += 40;
                const isRule = e.key && String(e.key).startsWith("r");
                if (/قاعد/.test(pq.phrase)) score += isRule ? 50 : -20;
                else if (isRule) score -= 15;
            }
        }
        let matched = 0;
        pq.terms.forEach(function (t) {
            const inTitle = e.tTitle.some(function (w) { return w === t || w.startsWith(t); });
            const inText = e.tText.some(function (w) { return w === t || w.startsWith(t); });
            if (inTitle) score += 12;
            if (inText) score += 3;
            if (inTitle || inText) matched++;
        });
        if (pq.terms.length) {
            if (matched === 0 && !(pq.num && e.num === pq.num)) return;
            if (matched < pq.terms.length) score *= 0.35 * (matched / pq.terms.length);
            else score += 8;
            const phrase = pq.terms.length > 1 ? norm(q).replace(/\s+/g, " ").trim() : "";
            if (phrase && (e.nText.indexOf(phrase) !== -1 || e.nTitle.indexOf(phrase) !== -1)) score += 25;
            if (pq.docHint && e.doc === pq.docHint) score += 6;
        }
        if (e.type === "topic") score *= 1.25;
        if (e.type === "role") score *= 1.15;
        if (score > 0) results.push({ e: e, score: score });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return { results: results, pq: pq };
}

function snippet(raw, terms, len) {
    len = len || 220;
    const text = String(raw || "");
    const re = highlightRegex(terms || []);
    let start = 0;
    if (re) {
        const m = re.exec(text);
        if (m) start = Math.max(0, m.index - 70);
    }
    let s = text.slice(start, start + len);
    if (start > 0) s = "… " + s;
    if (start + len < text.length) s += " …";
    return unclearMarks(highlight(s, terms));
}

/* =========================================================
   القائمة الجانبية
========================================================= */

const NAV = [
    { href: "#/", icon: "home", t: "الرئيسية", s: "لوحة الموسوعة والبحث", match: /^#\/?$/ },
    { href: "#/docs", icon: "books", t: "الوثائق", s: "النصوص الكاملة السبعة", match: /^#\/docs|^#\/doc\// },
    { href: "#/topics", icon: "bookmarks", t: "الموسوعة القانونية", s: "الأبواب والموضوعات", match: /^#\/topics|^#\/topic\/|^#\/cat\// },
    { href: "#/roles", icon: "id-badge-2", t: "المسؤوليات والصلاحيات", s: "النقيب، الخازن، المتمرن…", match: /^#\/roles|^#\/role\// },
    { href: "#/cat/funds", icon: "heart-handshake", t: "الصناديق والمالية", s: "التعاون، الإسعاف، التكافل", match: /^#\/cat\/(funds|finance)/ },
    { href: "#/tools", icon: "tool", t: "الأدوات والنماذج", s: "حاسبات وقوائم تدقيق", match: /^#\/tools|^#\/tool\// },
    { href: "#/about", icon: "info-circle", t: "عن الموسوعة", s: "المصادر وجودة النصوص", match: /^#\/about/ }
];

function renderNav() {
    const h = location.hash || "#/";
    document.getElementById("mainNav").innerHTML = NAV.map(function (n) {
        const active = n.match.test(h) && !(n.href === "#/topics" && /^#\/cat\/(funds|finance)/.test(h));
        return '<a class="nav-link' + (active ? " active" : "") + '" href="' + n.href + '"' + (active ? ' aria-current="page"' : "") + '>' +
            '<i class="ti ti-' + n.icon + '" aria-hidden="true"></i><span><b>' + esc(n.t) + "</b><small>" + esc(n.s) + "</small></span></a>";
    }).join("");
}

function tocNodeHTML(d, node) {
    const label = (node.label ? node.label + " " : "") + node.title;
    const arts = node.articles.map(function (k) {
        const a = d.byKey[k];
        return '<a href="' + articleUrl(a) + '" data-k="' + d.id + ":" + k + '">' + esc(a.label) + "</a>";
    }).join("");
    const kids = node.children.map(function (c) { return tocNodeHTML(d, c); }).join("");
    return '<details><summary>' + esc(label) + '</summary><div class="tree-children">' + kids + arts + "</div></details>";
}

function renderTree() {
    const host = document.getElementById("docTree");
    host.innerHTML = DOCS.map(function (d) {
        return '<details data-doc="' + d.id + '"><summary>' + dot(d.id) + esc(d.short) + '</summary><div class="tree-children">' +
            '<a href="#/doc/' + d.id + '"><i class="ti ti-list" aria-hidden="true"></i> الفهرس الكامل</a>' +
            d.toc.map(function (n) { return tocNodeHTML(d, n); }).join("") + "</div></details>";
    }).join("");
}

function filterTree(q) {
    const terms = tokens(q);
    const host = document.getElementById("docTree");
    host.querySelectorAll("details").forEach(function (det) { det.hidden = false; if (!terms.length) det.open = false; });
    host.querySelectorAll("a").forEach(function (a) { a.hidden = false; });
    if (!terms.length) return;
    host.querySelectorAll("a[data-k]").forEach(function (a) {
        const k = a.dataset.k.split(":");
        const art = DOC[k[0]].byKey[k[1]];
        const hay = tokens(art.label + " " + art.paras.join(" ") + " " + (art.chapter || "") + " " + (art.part || ""));
        const ok = terms.every(function (t) { return hay.some(function (w) { return w.startsWith(t); }); });
        a.hidden = !ok;
    });
    host.querySelectorAll("details").forEach(function (det) {
        const visible = det.querySelectorAll("a[data-k]:not([hidden])").length;
        det.hidden = visible === 0;
        det.open = visible > 0;
    });
}

function markTreeActive(docId, key) {
    const host = document.getElementById("docTree");
    host.querySelectorAll("a.active").forEach(function (a) { a.classList.remove("active"); });
    if (!docId) return;
    const sel = key ? 'a[data-k="' + docId + ":" + key + '"]' : null;
    const a = sel && host.querySelector(sel);
    if (a) {
        a.classList.add("active");
        let p = a.parentElement;
        while (p && p !== host) {
            if (p.tagName === "DETAILS") p.open = true;
            p = p.parentElement;
        }
    } else {
        const det = host.querySelector('details[data-doc="' + docId + '"]');
        if (det) det.open = true;
    }
}

/* =========================================================
   أجزاء مشتركة للعرض
========================================================= */

function crumbs(list) {
    return '<nav class="crumbs" aria-label="مسار التنقل"><a href="#/">الرئيسية</a>' + list.map(function (c) {
        return '<i class="ti ti-chevron-left" aria-hidden="true"></i>' + (c[1] ? '<a href="' + c[1] + '">' + esc(c[0]) + "</a>" : "<span>" + esc(c[0]) + "</span>");
    }).join("") + "</nav>";
}

function pageTitle(icon, title, sub, actions) {
    return '<header class="page-title"><span class="page-icon"><i class="ti ti-' + icon + '" aria-hidden="true"></i></span>' +
        "<div><h1>" + esc(title) + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>" +
        (actions ? '<div class="title-actions">' + actions + "</div>" : "") + "</header>";
}

const PRINT_BTN = '<button type="button" class="btn small" data-act="print"><i class="ti ti-printer" aria-hidden="true"></i> طباعة</button>';

function itemsList(items, steps) {
    return '<ul class="block-list' + (steps ? " steps" : "") + '">' + items.map(function (it) {
        return "<li>" + esc(it[0]) + " " + refsHTML(it[1]) + "</li>";
    }).join("") + "</ul>";
}

function tableHTML(head, rows, opts) {
    opts = opts || {};
    return '<div class="table-wrap"><table class="data"' + (opts.sortable ? " data-sortable" : "") + "><thead><tr>" +
        head.map(function (h, i) { return "<th" + (opts.sortable ? ' data-sort="' + i + '"' : "") + (opts.numCols && opts.numCols.indexOf(i) !== -1 ? ' class="num"' : "") + ">" + esc(h) + "</th>"; }).join("") +
        "</tr></thead><tbody>" + rows.map(function (r) {
            return "<tr>" + r.map(function (c, i) {
                const isRef = typeof c === "string" && /^\w+:\w+(\s+\w+:\w+)*$/.test(c) && parseRefs(c).length;
                const cls = opts.numCols && opts.numCols.indexOf(i) !== -1 ? ' class="num"' : "";
                return "<td" + cls + ">" + (isRef ? refsHTML(c) : (opts.raw ? c : esc(c))) + "</td>";
            }).join("") + "</tr>";
        }).join("") + "</tbody>" + (opts.foot ? "<tfoot>" + opts.foot + "</tfoot>" : "") + "</table></div>";
}

function tile(url, icon, title, desc, meta, color) {
    return '<a class="tile" href="' + url + '"><span class="tile-icon"' + (color ? ' style="background:color-mix(in srgb, ' + color + ' 14%, transparent);color:' + color + '"' : "") + '><i class="ti ti-' + icon + '" aria-hidden="true"></i></span>' +
        "<span><b>" + esc(title) + "</b>" + (desc ? "<p>" + esc(desc) + "</p>" : "") + (meta ? '<span class="tile-meta">' + meta + "</span>" : "") + "</span></a>";
}

function qualityBadge(d) {
    return d.quality === "text"
        ? '<span class="quality text"><i class="ti ti-file-text" aria-hidden="true"></i> نص مستخرج من الملف</span>'
        : '<span class="quality transcribed"><i class="ti ti-scan" aria-hidden="true"></i> منسوخ من صور — بانتظار المراجعة</span>';
}

function sourceLink(d, page, label) {
    return '<a class="btn small" href="sources/' + d.file + (page ? "#page=" + page : "") + '" target="_blank" rel="noopener"><i class="ti ti-file-type-pdf" aria-hidden="true"></i> ' + esc(label || "الملف الأصلي") + "</a>";
}

/* =========================================================
   الصفحات
========================================================= */

function viewHome() {
    const nArticles = DOCS.reduce(function (s, d) { return s + d.articles.length; }, 0);
    const quick = ["registration-conditions", "agency-basics", "agency-fees", "appeals-map", "discipline-penalties", "coop-fund", "amb-fund", "tak-fund"];
    const transcribed = DOCS.filter(function (d) { return d.quality === "transcribed"; });
    const missing = DOCS.filter(function (d) { return d.missing.length; });
    return '<section class="hero">' +
        "<small>نقابة المحامين في الجمهورية العربية السورية وفروعها</small>" +
        "<h1>موسوعة النقابة القانونية والمالية</h1>" +
        "<p>النصوص الكاملة لقانون تنظيم المهنة والأنظمة الداخلية والمالية والصناديق ومرجع الوكالات، مع شرح مبسط لكل موضوع ودليل للمسؤوليات وأدوات حساب — وكل معلومة مربوطة بمادتها وصفحتها.</p>" +
        '<form class="hero-search" data-act="hero-search" role="search"><i class="ti ti-search" aria-hidden="true"></i>' +
        '<input type="search" name="q" placeholder="ما الذي تبحث عنه؟ مثلاً: شروط التسجيل، مهلة الطعن، طابع المرافعة" aria-label="بحث"></form>' +
        '<div class="hero-tags">' + ["شطب حكمي", "مدة التمرين", "أمين الصندوق", "معونة الوفاة", "م 57", "الوكالة العدلية", "رسم الانتساب"].map(function (t) {
            return '<a href="#/search?q=' + encodeURIComponent(t) + '">' + esc(t) + "</a>";
        }).join("") + "</div></section>" +
        '<div class="stats">' +
        '<div class="stat"><b>' + DOCS.length + "</b><span>وثائق رسمية كاملة</span></div>" +
        '<div class="stat"><b>' + fmt(nArticles) + "</b><span>مادة وقاعدة قابلة للبحث</span></div>" +
        '<div class="stat"><b>' + (ENC.topics || []).length + "</b><span>موضوعاً مشروحاً</span></div>" +
        '<div class="stat"><b>' + (ENC.tools || []).length + "</b><span>أداة وقائمة تدقيق</span></div></div>" +

        '<div class="section-head"><h2><i class="ti ti-bolt" aria-hidden="true"></i> الأكثر استخداماً</h2><a href="#/topics">كل الموضوعات</a></div>' +
        '<div class="grid cols-4">' + quick.map(function (id) {
            const t = TOPIC[id];
            return t ? tile("#/topic/" + id, CAT[t.cat].icon, t.title, "", '<span class="chip">' + esc(CAT[t.cat].title) + "</span>") : "";
        }).join("") + "</div>" +

        '<div class="section-head"><h2><i class="ti ti-books" aria-hidden="true"></i> تصفح بحسب الوثيقة</h2><a href="#/docs">الفهارس</a></div>' +
        '<div class="grid cols-3">' + DOCS.map(function (d) {
            return tile("#/doc/" + d.id, d.icon, d.title, d.articles.length + (d.id === "agn" ? " بنداً" : " مادة"), qualityBadge(d), docColor(d.id));
        }).join("") + "</div>" +

        '<div class="section-head"><h2><i class="ti ti-category" aria-hidden="true"></i> تصفح بحسب الموضوع</h2></div>' +
        '<div class="grid cols-4">' + (ENC.cats || []).map(function (c) {
            const n = (ENC.topics || []).filter(function (t) { return t.cat === c.id; }).length;
            return tile("#/cat/" + c.id, c.icon, c.title, c.desc, '<span class="chip">' + n + " موضوع</span>");
        }).join("") + "</div>" +

        '<div class="section-head"><h2><i class="ti ti-id-badge-2" aria-hidden="true"></i> تصفح بحسب المنصب</h2><a href="#/roles">الدليل الكامل</a></div>' +
        '<div class="grid cols-4">' + (ENC.roles || []).slice(0, 8).map(function (r) {
            return tile("#/role/" + r.id, r.icon, r.title, r.group);
        }).join("") + "</div>" +

        '<div class="section-head"><h2><i class="ti ti-heart-handshake" aria-hidden="true"></i> بحسب الصندوق</h2></div>' +
        '<div class="grid cols-3">' + ["coop-fund", "amb-fund", "tak-fund"].map(function (id) {
            const t = TOPIC[id];
            return tile("#/topic/" + id, "heart-handshake", t.title, t.summary.slice(0, 120) + "…", "", docColor(id.split("-")[0]));
        }).join("") + "</div>" +

        '<div class="grid cols-2" style="margin-top:22px">' +
        '<section class="card"><h2><i class="ti ti-sparkles" aria-hidden="true"></i> أحدث الإضافات</h2><ul class="block-list">' +
        (ENC.changelog || []).map(function (c) { return "<li><b>" + esc(c.date) + "</b> — " + esc(c.text) + "</li>"; }).join("") + "</ul></section>" +
        '<section class="card warn"><h3><i class="ti ti-alert-triangle" aria-hidden="true"></i> محتوى يحتاج إلى مراجعة</h3><ul class="block-list">' +
        transcribed.map(function (d) { return '<li><a href="#/doc/' + d.id + '">' + esc(d.title) + "</a>: منسوخ بصرياً من صور" + (d.unclear ? "، فيه " + d.unclear + " موضع غير واضح" : "") + ".</li>"; }).join("") +
        missing.map(function (d) { return '<li><a href="#/doc/' + d.id + '">' + esc(d.short) + "</a>: مواد غير موجودة في النسخة المرفقة (" + esc(d.missing.join("، ")) + ").</li>"; }).join("") +
        '<li><a href="#/topic/retirement-overview">التقاعد</a>: قانون تقاعد المحامين غير مرفق — لا توجد معادلة معاش.</li>' +
        "</ul></section></div>";
}

function viewDocs() {
    return crumbs([["الوثائق"]]) + pageTitle("books", "الوثائق الرسمية", "النصوص الكاملة كما وردت في الملفات المرفقة، مرتبة بالأبواب والفصول.") +
        '<div class="grid cols-2">' + DOCS.map(function (d) {
            return tile("#/doc/" + d.id, d.icon, d.title, d.issued, qualityBadge(d) + '<span class="chip">' + d.articles.length + " بنداً</span>", docColor(d.id));
        }).join("") + "</div>";
}

function articleCountLabel(d) {
    return d.id === "agn" ? "قاعدة وبنداً" : "مادة";
}

function tocPartHTML(d, node, depth) {
    const label = (node.label ? node.label + " — " : "") + node.title;
    const count = countArticles(node);
    const arts = node.articles.length ? '<div class="art-links">' + node.articles.map(function (k) {
        const a = d.byKey[k];
        const unclear = a.paras.some(function (p) { return p.indexOf("[؟]") !== -1; });
        const short = a.num ? a.num : a.label;
        return '<a href="' + articleUrl(a) + '"' + (unclear ? ' class="has-unclear" title="فيها موضع غير واضح"' : ' title="' + esc(a.label) + '"') + ">" + esc(short) + "</a>";
    }).join("") + missingIn(d, node) + "</div>" : "";
    if (depth === 0) {
        return '<details class="toc-part" open><summary>' + esc(label) + '<span class="count">' + count + "</span></summary>" +
            '<div class="toc-body">' + arts + node.children.map(function (c) { return tocPartHTML(d, c, 1); }).join("") + "</div></details>";
    }
    return '<p class="toc-chapter">' + esc(label) + " · <small>صفحة " + (node.page || "—") + "</small></p>" + arts +
        node.children.map(function (c) { return tocPartHTML(d, c, depth + 1); }).join("");
}

function countArticles(node) {
    return node.articles.length + node.children.reduce(function (s, c) { return s + countArticles(c); }, 0);
}

/* أرقام المواد الناقصة تظهر في موضعها من الفهرس */
function missingIn(d, node) {
    if (!d.missing.length || !node.articles.length) return "";
    const nums = node.articles.map(function (k) { return parseInt(d.byKey[k].num, 10); }).filter(function (n) { return !isNaN(n); });
    if (!nums.length) return "";
    const max = Math.max.apply(null, nums);
    const after = d.missing.filter(function (m) { return m > max && !d.byKey[String(m)] && (d.missing.indexOf(m - 1) !== -1 || m === max + 1); });
    return after.map(function (m) { return '<span class="missing" title="غير موجودة في النسخة المرفقة">' + m + "؟</span>"; }).join("");
}

function viewDoc(id) {
    const d = DOC[id];
    if (!d) return viewNotFound();
    const notes = [];
    if (d.quality === "transcribed") notes.push("هذه الوثيقة ملف مصور (صور ممسوحة). نُسخ نصها بصرياً صفحةً صفحة، وكل مادة تحمل رقم صفحتها. قارن أي رقم أو نسبة مهمة بالأصل قبل الاعتماد عليها.");
    if (d.unclear) notes.push("فيها " + d.unclear + " موضع غير واضح في الصورة، مميز بالعلامة [؟].");
    if (d.missing.length) notes.push("مواد غير موجودة في النسخة المرفقة: " + d.missing.join("، ") + ". لم نكتب لها أي نص.");
    if (id === "internal") notes.push("يحيل النظام الداخلي إلى أرقام مواد قانون المحاماة القديم رقم 39 لعام 1981 (الملغى بالمادة 113 من القانون 30 لعام 2010)، فقد لا تطابق أرقامه أرقام القانون النافذ. مثال: «المادة 119» في المادة 74 يقابلها حكم المادة 109 في القانون الحالي.");
    if (id === "fin") notes.push("الصفحتان 29 و30 في الملف مقلوبتان، والجدول رقم (1) (دليل الحسابات) منسوخ كما ورد، وبعض أرقامه في الصفحة الأخيرة مقطوعة.");
    return crumbs([["الوثائق", "#/docs"], [d.short]]) +
        pageTitle(d.icon, d.title, esc(d.issued), sourceLink(d, null, "فتح الملف الأصلي") + PRINT_BTN) +
        '<div class="doc-meta" style="margin:-8px 0 16px">' + qualityBadge(d) + '<span class="chip">' + d.articles.length + " " + articleCountLabel(d) + "</span>" +
        '<span class="chip">المصدر: sources/' + esc(d.file) + "</span></div>" +
        (notes.length ? '<div class="note-box" style="margin-bottom:16px"><ul class="block-list">' + notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul></div>" : "") +
        '<section class="card"><h2><i class="ti ti-list-tree" aria-hidden="true"></i> الفهرس: الأبواب والفصول والمواد</h2>' +
        d.toc.map(function (n) { return tocPartHTML(d, n, 0); }).join("") + "</section>";
}

function paraHTML(p, i, terms) {
    const sub = i > 0 && /^([أ-ي]{1,2}\s*[-.)]|\d+\s*[-.)]|\(\d+\)|[-•])/.test(p);
    return '<p class="' + (sub ? "sub" : "") + '">' + unclearMarks(terms ? highlight(p, terms) : esc(p)) + "</p>";
}

function viewArticle(id, key, q) {
    const d = DOC[id];
    if (!d) return viewNotFound();
    const a = d.byKey[key];
    if (!a) {
        const isMissing = /^\d+$/.test(key) && d.missing.indexOf(parseInt(key, 10)) !== -1;
        return crumbs([["الوثائق", "#/docs"], [d.short, "#/doc/" + id], ["المادة " + key]]) +
            pageTitle("file-alert", "المادة " + key + " — " + d.short, "") +
            '<div class="gap-box"><span class="kind-tag kind-gap">غير متوفرة</span><p>' +
            (isMissing ? "هذه المادة غير موجودة في النسخة المرفقة من الوثيقة، ولم نكتب لها أي نص. تحتاج إلى نسخة كاملة من الوثيقة." : "لا توجد مادة بهذا الرقم في الوثيقة.") +
            '</p></div><p style="margin-top:14px"><a class="btn" href="#/doc/' + id + '">العودة إلى الفهرس</a></p>';
    }
    const terms = q ? tokens(q) : null;
    const prev = d.articles[a.idx - 1];
    const next = d.articles[a.idx + 1];
    const mentions = MENTIONS[id + ":" + key] || [];
    const path = [a.part, a.chapter, a.section].filter(Boolean);
    const citation = d.title + "، " + a.label + (a.page ? "، صفحة " + a.page + " من الملف" : "") + (a.bookPage && a.bookPage !== a.page ? " (ص" + a.bookPage + " في الكتاب)" : "");
    return crumbs([["الوثائق", "#/docs"], [d.short, "#/doc/" + id]].concat(path.map(function (p) { return [p]; })).concat([[a.label]])) +
        pageTitle("file-text", a.label, esc(d.title), '<button type="button" class="btn small" data-act="copy-article" data-doc="' + id + '" data-key="' + esc(key) + '"><i class="ti ti-copy" aria-hidden="true"></i> نسخ مع المصدر</button>' + PRINT_BTN) +
        '<div class="article-view"><div>' +
        '<section class="card"><p style="margin-bottom:10px"><span class="kind-tag kind-verbatim"><i class="ti ti-quote" aria-hidden="true"></i> نص حرفي</span> ' +
        (d.quality === "transcribed" ? '<span class="kind-tag kind-gap">منسوخ من صورة</span>' : "") + "</p>" +
        '<div class="verbatim article-text">' + a.paras.map(function (p, i) { return paraHTML(p, i, terms); }).join("") + "</div>" +
        '<p class="result-src" style="margin-top:10px">المصدر: ' + esc(citation) + "</p></section>" +
        (mentions.length ? '<section class="card"><h2><i class="ti ti-link" aria-hidden="true"></i> مشروحة أو مستخدمة في</h2><div class="grid cols-2">' +
            mentions.map(function (m) { return tile(m.url, m.icon, m.title, m.type); }).join("") + "</div></section>" : "") +
        '<nav class="article-nav" aria-label="التنقل بين المواد">' +
        (prev ? '<a class="btn" href="' + articleUrl(prev) + '"><i class="ti ti-arrow-right" aria-hidden="true"></i> ' + esc(prev.label.slice(0, 40)) + "</a>" : "<span></span>") +
        (next ? '<a class="btn" href="' + articleUrl(next) + '">' + esc(next.label.slice(0, 40)) + ' <i class="ti ti-arrow-left" aria-hidden="true"></i></a>' : "<span></span>") +
        "</nav></div>" +
        '<aside class="side-box"><div class="card"><h3><i class="ti ti-info-circle" aria-hidden="true"></i> بيانات المادة</h3><table class="meta-table">' +
        "<tr><th>الوثيقة</th><td>" + dot(id) + " " + esc(d.short) + "</td></tr>" +
        (a.part ? "<tr><th>الباب</th><td>" + esc(a.part) + "</td></tr>" : "") +
        (a.chapter ? "<tr><th>الفصل</th><td>" + esc(a.chapter) + "</td></tr>" : "") +
        (a.section ? "<tr><th>القسم</th><td>" + esc(a.section) + "</td></tr>" : "") +
        "<tr><th>صفحة الملف</th><td>" + (a.page || "—") + "</td></tr>" +
        (a.bookPage && a.bookPage !== a.page ? "<tr><th>صفحة الكتاب</th><td>" + a.bookPage + "</td></tr>" : "") +
        "<tr><th>جودة النص</th><td>" + (d.quality === "text" ? "مستخرج آلياً" : "منسوخ بصرياً") + "</td></tr></table>" +
        '<p style="margin-top:12px">' + sourceLink(d, a.page, "عرض الصفحة في الأصل") + "</p></div></aside></div>";
}

function viewTopics(catId) {
    const cats = catId ? [CAT[catId]].filter(Boolean) : ENC.cats;
    if (catId && !cats.length) return viewNotFound();
    const extra = catId === "funds" ? ["finance"] : [];
    const head = catId ? crumbs([["الموسوعة القانونية", "#/topics"], [CAT[catId].title]]) + pageTitle(CAT[catId].icon, CAT[catId].title, esc(CAT[catId].desc))
        : crumbs([["الموسوعة القانونية"]]) + pageTitle("bookmarks", "الموسوعة القانونية", "أبواب وموضوعات مشروحة، كل بند فيها مربوط بمادته. اختر باباً أو ابحث.");
    return head + cats.concat(extra.map(function (e) { return CAT[e]; })).map(function (c) {
        const list = (ENC.topics || []).filter(function (t) { return t.cat === c.id; });
        return '<div class="section-head"><h2><i class="ti ti-' + c.icon + '" aria-hidden="true"></i> ' + esc(c.title) + "</h2>" +
            (catId ? "" : '<a href="#/cat/' + c.id + '">فتح الباب</a>') + "</div>" +
            '<div class="grid cols-3">' + list.map(function (t) {
                return tile("#/topic/" + t.id, c.icon, t.title, t.summary.length > 130 ? t.summary.slice(0, 130) + "…" : t.summary);
            }).join("") + "</div>";
    }).join("") + (catId === "funds" ? '<div class="section-head"><h2><i class="ti ti-tool" aria-hidden="true"></i> أدوات الصناديق</h2></div><div class="grid cols-3">' +
        ["coop-share", "amb-entry-fee", "tak-entry-fee", "tak-retirement-grant", "tak-loan", "checklist-amb-request"].map(function (id) {
            const t = TOOL[id]; return tile("#/tool/" + id, t.icon, t.title, t.desc);
        }).join("") + "</div>" : "");
}

function blockHTML(b, i) {
    const id = "b" + i;
    if (b.kind === "table") {
        return '<section class="card" id="' + id + '"><h3><i class="ti ti-table" aria-hidden="true"></i> ' + esc(b.h) + "</h3>" +
            tableHTML(b.head, b.rows, { sortable: b.rows.length > 4 }) + (b.refs ? '<p style="margin-top:8px">المصدر: ' + refsHTML(b.refs) + "</p>" : "") + "</section>";
    }
    const cls = b.kind === "warn" ? " warn" : b.kind === "gap" ? " gap" : "";
    const icon = b.kind === "steps" ? "list-numbers" : b.kind === "warn" ? "alert-triangle" : b.kind === "gap" ? "help-hexagon" : "list-details";
    return '<section class="card' + cls + '" id="' + id + '"><h3><i class="ti ti-' + icon + '" aria-hidden="true"></i> ' + esc(b.h) + "</h3>" +
        itemsList(b.items || [], b.kind === "steps") + "</section>";
}

function verbatimGroup(refs) {
    const seen = {};
    const list = parseRefs(refs).filter(function (r) {
        if (!r.article || seen[r.raw]) return false;
        seen[r.raw] = true;
        return true;
    });
    if (!list.length) return "";
    return '<section class="card verbatim-group" id="verbatim"><h3><i class="ti ti-quote" aria-hidden="true"></i> النص القانوني للمواد المذكورة <span class="kind-tag kind-verbatim">نص حرفي</span></h3>' +
        list.map(function (r) {
            const d = DOC[r.doc];
            return "<details><summary>" + dot(r.doc) + esc(r.article.label + " — " + d.short) + '</summary><div class="verbatim">' +
                r.article.paras.map(function (p, i) { return paraHTML(p, i); }).join("") +
                '<p class="result-src"><a href="' + articleUrl(r.article) + '">فتح المادة</a> · صفحة ' + (r.article.page || "—") + "</p></div></details>";
        }).join("") + "</section>";
}

function viewTopic(id) {
    const t = TOPIC[id];
    if (!t) return viewNotFound();
    const c = CAT[t.cat];
    const refs = topicRefs(t);
    const related = (t.related || []).map(function (r) { return TOPIC[r]; }).filter(Boolean);
    const tools = (t.tools || []).map(function (r) { return TOOL[r]; }).filter(Boolean);
    const docsUsed = Array.from(new Set(parseRefs(refs).map(function (r) { return r.doc; })));
    return crumbs([["الموسوعة القانونية", "#/topics"], [c.title, "#/cat/" + c.id], [t.title]]) +
        pageTitle(c.icon, t.title, esc(c.title), PRINT_BTN) +
        '<div class="topic-layout"><div>' +
        '<section class="card"><p style="margin-bottom:8px"><span class="kind-tag kind-explain"><i class="ti ti-bulb" aria-hidden="true"></i> شرح مبسط</span></p><p class="summary-box">' + esc(t.summary) + "</p></section>" +
        (t.blocks || []).map(blockHTML).join("") +
        (t.example ? '<section class="card" id="example"><h3><i class="ti ti-flask" aria-hidden="true"></i> مثال عملي</h3><div class="example-box"><span class="kind-tag kind-example">مثال افتراضي للتوضيح — ليس حكماً</span><p>' + esc(t.example) + "</p></div></section>" : "") +
        (t.gaps && t.gaps.length ? '<section class="card gap" id="gaps"><h3><i class="ti ti-help-hexagon" aria-hidden="true"></i> يحتاج إلى تحقق أو وثائق إضافية</h3><ul class="block-list">' + t.gaps.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") + "</ul></section>" : "") +
        verbatimGroup(refs) +
        (related.length ? '<div class="section-head"><h2><i class="ti ti-arrows-shuffle" aria-hidden="true"></i> موضوعات مرتبطة</h2></div><div class="grid cols-3">' +
            related.map(function (r) { return tile("#/topic/" + r.id, CAT[r.cat].icon, r.title, CAT[r.cat].title); }).join("") + "</div>" : "") +
        "</div>" +
        '<aside class="side-box"><div class="card"><h3><i class="ti ti-list" aria-hidden="true"></i> في هذه الصفحة</h3><ul class="side-list">' +
        (t.blocks || []).map(function (b, i) { return '<li><a href="#b' + i + '" data-act="jump">' + esc(b.h) + "</a></li>"; }).join("") +
        (t.example ? '<li><a href="#example" data-act="jump">مثال عملي</a></li>' : "") +
        '<li><a href="#verbatim" data-act="jump">النص القانوني</a></li></ul></div>' +
        '<div class="card"><h3><i class="ti ti-books" aria-hidden="true"></i> المصادر</h3><ul class="side-list">' +
        docsUsed.map(function (dId) { return '<li><a href="#/doc/' + dId + '">' + dot(dId) + " " + esc(DOC[dId].title) + "</a></li>"; }).join("") + "</ul></div>" +
        (tools.length ? '<div class="card"><h3><i class="ti ti-tool" aria-hidden="true"></i> أدوات</h3><ul class="side-list">' +
            tools.map(function (x) { return '<li><a href="#/tool/' + x.id + '"><i class="ti ti-' + x.icon + '" aria-hidden="true"></i> ' + esc(x.title) + "</a></li>"; }).join("") + "</ul></div>" : "") +
        "</aside></div>";
}

function viewRoles() {
    const groups = {};
    (ENC.roles || []).forEach(function (r) { (groups[r.group] = groups[r.group] || []).push(r); });
    return crumbs([["المسؤوليات والصلاحيات"]]) +
        pageTitle("id-badge-2", "دليل المسؤوليات والصلاحيات", "لكل منصب: الواجبات، الصلاحيات، المسموح والمحظور، الإجراءات، المدد، وجهة القرار أو الاعتراض — وكل بند بمادته.") +
        '<div class="note-box" style="margin-bottom:16px">لا يُنسب إلى منصب إلا ما له سند في الوثائق. ما لا نص عليه يظهر في خانة «يحتاج تحقق».</div>' +
        Object.keys(groups).map(function (g) {
            return '<div class="section-head"><h2><i class="ti ti-users" aria-hidden="true"></i> ' + esc(g) + '</h2></div><div class="grid cols-3">' +
                groups[g].map(function (r) { return tile("#/role/" + r.id, r.icon, r.title, r.summary.length > 120 ? r.summary.slice(0, 120) + "…" : r.summary); }).join("") + "</div>";
        }).join("");
}

function viewRole(id) {
    const r = ROLE[id];
    if (!r) return viewNotFound();
    const refs = roleRefs(r);
    const related = (ENC.topics || []).map(function (t) {
        const tr = parseRefs(topicRefs(t)).map(function (x) { return x.raw; });
        const rr = parseRefs(refs).map(function (x) { return x.raw; });
        const common = tr.filter(function (x) { return rr.indexOf(x) !== -1; }).length;
        return { t: t, common: common };
    }).filter(function (x) { return x.common >= 2; }).sort(function (a, b) { return b.common - a.common; }).slice(0, 6);
    return crumbs([["المسؤوليات والصلاحيات", "#/roles"], [r.title]]) +
        pageTitle(r.icon, r.title, esc(r.group), PRINT_BTN) +
        '<div class="topic-layout"><div>' +
        '<section class="card"><p style="margin-bottom:8px"><span class="kind-tag kind-explain">شرح مبسط</span></p><p class="summary-box">' + esc(r.summary) + "</p></section>" +
        (ENC.roleGroups || []).map(function (g, i) {
            const items = r[g.k] || [];
            if (!items.length) return "";
            return '<section class="card' + (g.k === "forbidden" ? " warn" : "") + '" id="g' + i + '"><h3><i class="ti ti-' + g.icon + '" aria-hidden="true"></i> ' + (i + 1) + ". " + esc(g.h) + "</h3>" + itemsList(items) + "</section>";
        }).join("") +
        (r.gaps && r.gaps.length ? '<section class="card gap"><h3><i class="ti ti-help-hexagon" aria-hidden="true"></i> يحتاج إلى تحقق</h3><ul class="block-list">' + r.gaps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>" : "") +
        verbatimGroup(refs) +
        (related.length ? '<div class="section-head"><h2><i class="ti ti-arrows-shuffle" aria-hidden="true"></i> موضوعات ذات صلة</h2></div><div class="grid cols-3">' +
            related.map(function (x) { return tile("#/topic/" + x.t.id, CAT[x.t.cat].icon, x.t.title, CAT[x.t.cat].title); }).join("") + "</div>" : "") +
        "</div>" +
        '<aside class="side-box"><div class="card"><h3><i class="ti ti-list" aria-hidden="true"></i> الأقسام</h3><ul class="side-list">' +
        (ENC.roleGroups || []).map(function (g, i) {
            const n = (r[g.k] || []).length;
            return n ? '<li><a href="#g' + i + '" data-act="jump">' + esc(g.h) + " (" + n + ")</a></li>" : '<li style="color:var(--text-3);font-size:var(--fs-sm)">' + esc(g.h) + " — لا نص</li>";
        }).join("") + "</ul></div>" +
        '<div class="card"><h3><i class="ti ti-users" aria-hidden="true"></i> مناصب أخرى</h3><ul class="side-list">' +
        (ENC.roles || []).filter(function (x) { return x.id !== id; }).map(function (x) { return '<li><a href="#/role/' + x.id + '">' + esc(x.title) + "</a></li>"; }).join("") +
        "</ul></div></aside></div>";
}

function viewTools() {
    const kinds = [["calc", "حاسبات", "calculator"], ["checklist", "قوائم تدقيق ونماذج", "checklist"], ["reference", "مراجع", "list-tree"]];
    return crumbs([["الأدوات والنماذج"]]) +
        pageTitle("tool", "الأدوات والنماذج التطبيقية", "تعمل فقط وفق أرقام وقواعد منصوص عليها، وتبين المدخلات وطريقة الحساب والمصدر. النتائج إرشادية ولا تحل محل الجهة المختصة.") +
        kinds.map(function (k) {
            const list = (ENC.tools || []).filter(function (t) { return t.kind === k[0]; });
            return '<div class="section-head"><h2><i class="ti ti-' + k[2] + '" aria-hidden="true"></i> ' + k[1] + '</h2></div><div class="grid cols-3">' +
                list.map(function (t) { return tile("#/tool/" + t.id, t.icon, t.title, t.desc); }).join("") + "</div>";
        }).join("") +
        '<section class="card gap" style="margin-top:22px"><h3><i class="ti ti-help-hexagon" aria-hidden="true"></i> أدوات لم تُبنَ عمداً</h3><ul class="block-list">' +
        "<li>حاسبة المعاش التقاعدي ونموذج التحقق من استحقاق التقاعد: معادلة المعاش وشروطه في قانون تقاعد المحامين غير المرفق. بناؤها الآن يعني اختلاق أرقام. " + refsHTML("law:9 amb:14") + "</li>" +
        "<li>نماذج طلبات الصناديق المطبوعة: الوثائق تحيل تفاصيلها إلى «القرارات التنظيمية» للمجالس، فاستبدلناها بقوائم تدقيق مستندة إلى النص. " + refsHTML("amb:22") + "</li></ul></section>";
}

const DISCLAIMER = '<div class="disclaimer"><i class="ti ti-alert-circle" aria-hidden="true"></i><span>نتيجة إرشادية وفق النص كما ورد في الوثائق المتاحة، ولا تمثل قراراً رسمياً ولا تغني عن الجهة المختصة. قد تكون المقادير معدلة بقرارات لاحقة أو بقرار الهيئة العامة لفرعك.</span></div>';

function viewTool(id) {
    const t = TOOL[id];
    if (!t) return viewNotFound();
    let body = "";
    if (ENC.checklists && ENC.checklists[id]) body = checklistHTML(id);
    else if (TOOL_VIEWS[id]) body = TOOL_VIEWS[id]();
    return crumbs([["الأدوات والنماذج", "#/tools"], [t.title]]) +
        pageTitle(t.icon, t.title, esc(t.desc), PRINT_BTN) + body +
        '<p style="margin-top:14px">المصدر: ' + refsHTML(t.refs) + "</p>";
}

function viewSearch(params) {
    const q = params.get("q") || "";
    const type = params.get("type") || "";
    const docF = params.get("doc") || "";
    const catF = params.get("cat") || "";
    const out = search(q, { type: type, doc: docF, cat: catF });
    const all = search(q, {});
    const counts = { article: 0, topic: 0, role: 0, tool: 0 };
    const docCounts = {};
    all.results.forEach(function (r) {
        counts[r.e.type]++;
        if (r.e.doc) docCounts[r.e.doc] = (docCounts[r.e.doc] || 0) + 1;
    });
    function link(k, v) {
        const p = new URLSearchParams(params.toString());
        if (v) p.set(k, v); else p.delete(k);
        return "#/search?" + p.toString();
    }
    const terms = out.pq.terms;
    const list = out.results.slice(0, 80);
    const relatedTopics = all.results.filter(function (r) { return r.e.type === "topic"; }).slice(0, 4);
    document.getElementById("q").value = q;
    return crumbs([["البحث"]]) +
        pageTitle("search", q ? "نتائج البحث: «" + q + "»" : "البحث", q ? out.results.length + " نتيجة" + (out.pq.num ? " · المادة " + out.pq.num : "") : "اكتب في مربع البحث أعلاه.") +
        '<div class="search-layout"><aside class="filters card">' +
        "<h3>النوع</h3><div class=\"chips\">" +
        '<a class="chip' + (!type ? " on" : "") + '" href="' + link("type", "") + '">الكل ' + all.results.length + "</a>" +
        Object.keys(counts).map(function (k) {
            return '<a class="chip' + (type === k ? " on" : "") + '" href="' + link("type", k) + '"><i class="ti ti-' + TYPE_ICONS[k] + '" aria-hidden="true"></i>' + TYPE_NAMES[k] + " " + counts[k] + "</a>";
        }).join("") + "</div>" +
        "<h3>الوثيقة</h3><div class=\"chips\">" +
        '<a class="chip' + (!docF ? " on" : "") + '" href="' + link("doc", "") + '">كل الوثائق</a>' +
        DOCS.map(function (d) {
            return '<a class="chip' + (docF === d.id ? " on" : "") + '" href="' + link("doc", d.id) + '">' + dot(d.id) + esc(d.short) + " " + (docCounts[d.id] || 0) + "</a>";
        }).join("") + "</div>" +
        "<h3>الباب (للموضوعات)</h3><div class=\"chips\">" +
        '<a class="chip' + (!catF ? " on" : "") + '" href="' + link("cat", "") + '">الكل</a>' +
        ENC.cats.map(function (c) { return '<a class="chip' + (catF === c.id ? " on" : "") + '" href="' + link("cat", c.id) + '">' + esc(c.title) + "</a>"; }).join("") +
        "</div></aside><div>" +
        (relatedTopics.length && !type ? '<div class="card" style="padding:14px 16px"><b style="font-size:var(--fs-sm);color:var(--text-2)">موضوعات مقترحة:</b> ' +
            relatedTopics.map(function (r) { return '<a class="chip" href="' + r.e.url + '">' + esc(r.e.title) + "</a>"; }).join(" ") + "</div>" : "") +
        (list.length ? list.map(function (r) {
            const e = r.e;
            const d = e.doc ? DOC[e.doc] : null;
            return '<a class="result" href="' + e.url + (e.type === "article" && q ? "?q=" + encodeURIComponent(q) : "") + '"><div class="result-head">' +
                '<span class="chip"><i class="ti ti-' + (e.icon || TYPE_ICONS[e.type]) + '" aria-hidden="true"></i>' + TYPE_NAMES[e.type] + "</span>" +
                "<b>" + highlight(e.type === "article" ? e.label : e.title, terms) + "</b>" +
                (d ? '<span class="chip">' + dot(d.id) + esc(d.short) + "</span>" : "") + "</div>" +
                "<p>" + snippet(e.raw, terms) + "</p>" +
                (e.type === "article" ? '<p class="result-src">' + esc(d.title) + (e.context ? " · " + esc(e.context) : "") + " · صفحة " + (e.page || "—") + "</p>" : "") +
                "</a>";
        }).join("") + (out.results.length > 80 ? '<p class="result-src">تظهر أول 80 نتيجة — ضيّق البحث بالمرشحات.</p>' : "")
            : '<div class="empty"><i class="ti ti-zoom-question" aria-hidden="true"></i>' + (q ? "لا نتائج. جرّب كلمة أقصر، أو رقم المادة مثل «م 57»." : "ابدأ بكتابة كلمة أو رقم مادة.") + "</div>") +
        "</div></div>";
}

function viewAbout() {
    const rows = DOCS.map(function (d) {
        const pages = Math.max.apply(null, d.articles.map(function (a) { return a.page || 0; }));
        return [d.title, d.quality === "text" ? "طبقة النص في PDF (استخراج آلي مع تصحيح ترتيب الحروف)" : "صور ممسوحة — نسخ بصري صفحةً صفحة",
            String(pages), String(d.articles.length), d.missing.length ? d.missing.join("، ") : "—", d.unclear ? String(d.unclear) : "—",
            d.quality === "text" ? "جاهز (أخطاء الطباعة الأصلية باقية)" : "بانتظار مراجعة بشرية"];
    });
    const gaps = [];
    (ENC.topics || []).forEach(function (t) { (t.gaps || []).forEach(function (g) { gaps.push([t.title, g, "#/topic/" + t.id]); }); });
    (ENC.roles || []).forEach(function (r) { (r.gaps || []).forEach(function (g) { gaps.push([r.title, g, "#/role/" + r.id]); }); });
    return crumbs([["عن الموسوعة"]]) +
        pageTitle("info-circle", "عن الموسوعة: المصادر والمنهج والحدود", "") +
        '<section class="card"><h2><i class="ti ti-report-analytics" aria-hidden="true"></i> تقرير الملفات وجودة استخراج النصوص</h2>' +
        tableHTML(["الوثيقة", "طريقة الاستخراج", "الصفحات", "البنود", "مواد ناقصة", "مواضع غير واضحة", "الحالة"], rows) + "</section>" +
        '<section class="card"><h2><i class="ti ti-scale" aria-hidden="true"></i> قواعد التحرير</h2><ul class="block-list">' +
        "<li><b>لا اختلاق:</b> لا مادة ولا نسبة ولا رسم ولا شرط إلا من الوثائق السبع. كل بند في الشروح والأدلة يحمل رقم مادته.</li>" +
        '<li><b>ثلاثة أنواع من المحتوى بألوان مختلفة:</b> <span class="kind-tag kind-verbatim">نص حرفي</span> كما ورد، <span class="kind-tag kind-explain">شرح مبسط</span> بتصرف مع الإحالة، <span class="kind-tag kind-example">مثال افتراضي</span> للتوضيح فقط.</li>' +
        '<li><b>الغموض يُعلن:</b> الكلمات غير الواضحة في الصور تُعلَّم بـ [؟]، والتناقضات (مثل مجاميع رسوم لا تطابق بنودها) تُعرض كما هي مع التنبيه.</li>' +
        "<li><b>النص الأصلي متاح:</b> كل مادة ترتبط بصفحتها في ملف PDF الأصلي.</li></ul></section>" +
        '<section class="card gap"><h3><i class="ti ti-help-hexagon" aria-hidden="true"></i> ما ينقص ويحتاج إلى وثائق إضافية</h3><ul class="block-list">' +
        "<li><b>قانون تقاعد المحامين</b> (ونظام مؤسسة خزانة التقاعد): شرط لقسم التقاعد وأي حاسبة معاش.</li>" +
        "<li>المواد 32، 33، 54–63 من النظام الداخلي (فصول مجلس النقابة ومحاضرات التمرين).</li>" +
        "<li>«القرارات التنظيمية» للصناديق، وقرارات الموازنات التي تحدد الرسوم السنوية الفعلية.</li>" +
        "<li>أي تعديلات صدرت بعد 2014 على الأنظمة، وبعد 2010 على القانون.</li>" +
        gaps.map(function (g) { return '<li><a href="' + g[2] + '">' + esc(g[0]) + "</a>: " + esc(g[1]) + "</li>"; }).join("") + "</ul></section>" +
        '<section class="card"><h2><i class="ti ti-device-desktop" aria-hidden="true"></i> الحدود التقنية</h2><ul class="block-list">' +
        "<li>موقع ثابت يعمل في المتصفح بلا خادم ولا حسابات؛ المحتوى للقراءة فقط ولا يخزن بيانات المستخدمين.</li>" +
        "<li>يحفظ المتصفح محلياً تفضيلات الواجهة فقط (الوضع الليلي، علامات قوائم التدقيق) بمفاتيح تبدأ بـ enc_.</li>" +
        "<li>لتصحيح نص أو إضافة وثيقة: تعدل ملفات النسخ في tools/ ثم يعاد توليد data/docs.js.</li></ul></section>";
}

function viewNotFound() {
    return pageTitle("map-off", "الصفحة غير موجودة", "") + '<p><a class="btn" href="#/">الرئيسية</a></p>';
}

/* =========================================================
   الأدوات
========================================================= */

function checklistHTML(id) {
    const cl = ENC.checklists[id];
    let saved = {};
    try { saved = JSON.parse(store("ui_check_" + id) || "{}"); } catch (e) {}
    let n = 0;
    const total = cl.groups.reduce(function (s, g) { return s + g.items.length; }, 0);
    const done = Object.keys(saved).filter(function (k) { return saved[k]; }).length;
    return '<section class="card"><p>' + esc(cl.intro) + "</p>" +
        '<div class="progress" aria-hidden="true"><span id="clProgress" style="width:' + Math.round(done / total * 100) + '%"></span></div>' +
        '<p class="result-src" id="clCount">' + done + " من " + total + ' بنداً</p>' +
        '<div class="no-print" style="margin:8px 0 4px"><button type="button" class="btn small" data-act="cl-reset" data-id="' + id + '"><i class="ti ti-refresh" aria-hidden="true"></i> مسح العلامات</button></div></section>' +
        cl.groups.map(function (g) {
            return '<section class="card"><h3><i class="ti ti-checklist" aria-hidden="true"></i> ' + esc(g.h) + '</h3><ul class="checklist">' +
                g.items.map(function (it) {
                    const k = "i" + (n++);
                    return '<li><label><input type="checkbox" data-cl="' + id + '" data-k="' + k + '"' + (saved[k] ? " checked" : "") + "><span>" + esc(it[0]) + " " + refsHTML(it[1]) + "</span></label></li>";
                }).join("") + "</ul></section>";
        }).join("") + DISCLAIMER;
}

function dateInput(id, label, value, hint) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input type="date" id="' + id + '" value="' + (value || "") + '">' + (hint ? "<small>" + hint + "</small>" : "") + "</div>";
}

function numInput(id, label, value, hint, attrs) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input type="text" inputmode="numeric" data-num id="' + id + '" value="' + (value == null ? "" : value) + '"' + (attrs || "") + ">" + (hint ? "<small>" + hint + "</small>" : "") + "</div>";
}

function num(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = norm(el.value).replace(/[,\s٬]/g, "");
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}

function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function parseDate(s) {
    if (!s) return null;
    const p = s.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
}

function fmtDate(d) {
    if (!d) return "—";
    return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
}

function addPeriod(d, n, unit) {
    const x = new Date(d.getTime());
    if (unit === "d") x.setDate(x.getDate() + n);
    else if (unit === "m") x.setMonth(x.getMonth() + n);
    else if (unit === "y") x.setFullYear(x.getFullYear() + n);
    else if (unit === "h") x.setHours(x.getHours() + n);
    return x;
}

/* العمر بالسنوات الكاملة وفق قيد الأحوال المدنية (اليوم المجهول = 1 كانون الثاني) */
function ageAt(birth, at) {
    let a = at.getFullYear() - birth.getFullYear();
    if (at.getMonth() < birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())) a--;
    return a;
}

const UNIT_NAMES = { d: "يوماً", m: "شهراً", y: "سنة", h: "ساعة" };

const TOOL_VIEWS = {
    "agency-fees-calc": function () {
        return '<section class="card no-print-inputs"><div class="form-row">' +
            '<div class="field"><label for="afType">نوع المعاملة</label><select id="afType">' +
            ENC.agencyFees.map(function (f) { return '<option value="' + f.id + '">' + esc(f.title) + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label for="afPlace">مكان التنظيم</label><select id="afPlace"><option value="main">المكتب الرئيسي</option><option value="outside">خارج المكتب الرئيسي (مندوبون)</option></select><small>متاح للوكالات الأصلية الصلحية والبدائية والجنائية والشرعية.</small></div>' +
            numInput("afPersons", "أشخاص إضافيون بعد الأول", 0, "كل شخص أو تركة أو موكل بالوكالة العدلية أو قاصر بالوصاية أو ولد بالولاية: +100 ل.س طابع مرافعة") +
            '<div class="field"><label><input type="checkbox" id="afTravel"> انتقال المندوب (سجن، نظارة، مخفر، مشفى، منزل)</label><small>+200 ل.س رسم للمندوب، مع أجرة واسطة النقل (غير محسوبة).</small></div>' +
            '</div></section><div id="afOut"></div>' + DISCLAIMER;
    },
    "deadlines": function () {
        const groups = {};
        ENC.deadlines.forEach(function (d) { (groups[d.group] = groups[d.group] || []).push(d); });
        return '<section class="card"><div class="form-row">' +
            '<div class="field" style="grid-column:1/-1"><label for="dlType">الإجراء</label><select id="dlType">' +
            Object.keys(groups).map(function (g) {
                return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (d) { return '<option value="' + d.id + '">' + esc(d.title) + "</option>"; }).join("") + "</optgroup>";
            }).join("") + "</select></div>" +
            dateInput("dlFrom", "تاريخ البدء (التبليغ، الإعلان، الحدث…)", todayISO()) +
            "</div></section><div id=\"dlOut\"></div>" +
            '<section class="card"><h3><i class="ti ti-table" aria-hidden="true"></i> جدول المهل المنصوص عليها</h3>' +
            '<div class="table-tools"><input type="search" data-filter-table="dlTable" placeholder="تصفية الجدول…" aria-label="تصفية جدول المهل"></div>' +
            '<div id="dlTable">' + tableHTML(["الإجراء", "المهلة", "تبدأ", "المرجع"], ENC.deadlines.map(function (d) {
                return [d.title, d.n + " " + UNIT_NAMES[d.unit], d.from, d.refs];
            }), { sortable: true }) + "</div></section>" +
            '<div class="disclaimer"><i class="ti ti-alert-circle" aria-hidden="true"></i><span>الحساب بالأيام التقويمية. لا تذكر الوثائق قواعد العطل ولا امتداد المهلة إذا صادف آخرها عطلة؛ يرجع في ذلك إلى قانون أصول المحاكمات. النتيجة إرشادية.</span></div>';
    },
    "coop-share": function () {
        return '<section class="card"><div class="form-row">' +
            dateInput("csBirth", "تاريخ الولادة (قيد الأحوال المدنية)", "", "إذا كان اليوم مجهولاً فأدخل 1/1 من سنة الولادة") +
            dateInput("csStart", "تاريخ الانتساب أو بدء الممارسة", "") +
            dateInput("csMasters", "تاريخ قرار الانتقال إلى جدول الأساتذة (إن وجد)", "", "يلزم فقط لمن انتسب قبل الثلاثين") +
            dateInput("csAt", "تاريخ التحقق", todayISO()) +
            "</div></section><div id=\"csOut\"></div>" +
            '<section class="card"><h3><i class="ti ti-checklist" aria-hidden="true"></i> شروط أخرى يجب توافرها (المادة 8/ب)</h3><ul class="block-list">' +
            "<li>مسدد لالتزاماته المالية تجاه الفرع والنقابة وخزانة التقاعد والصناديق. " + refsHTML("coop:8") + "</li>" +
            "<li>عامل في المهنة بصورة فعلية (إلا لقوة قاهرة أو مرض)، ويعتمد على موارد المهنة بشكل رئيسي. " + refsHTML("coop:8") + "</li>" +
            "<li>لم يغب عن منطقة الفرع أو عمله أكثر من ثلاثة أشهر في السنة (لا تحسب الخدمة الإلزامية والاحتياطية). " + refsHTML("coop:8 coop:11") + "</li>" +
            "<li>له مكتب مستقل ومعتمد من مجلس الفرع، ولا يستفيد من صندوق تعاوني آخر. " + refsHTML("coop:8 coop:10") + "</li></ul></section>" + DISCLAIMER;
    },
    "amb-entry-fee": function () {
        return entryFeeForm("amb") + DISCLAIMER;
    },
    "tak-entry-fee": function () {
        return entryFeeForm("tak") + DISCLAIMER;
    },
    "tak-retirement-grant": function () {
        return '<section class="card"><div class="form-row">' +
            '<div class="field"><label for="trCase">الحالة</label><select id="trCase"><option value="retire">الإحالة إلى التقاعد</option><option value="unlist">ترقين القيد (غير مشمول بالتقاعد، لسبب غير مسلكي)</option></select></div>' +
            numInput("trYears", "سنوات الخدمة كمحامٍ (كاملة)", 10) +
            numInput("trMember", "سنوات الاشتراك في صندوق التكافل", 5, "تلزم لحالة ترقين القيد") +
            "</div></section><div id=\"trOut\"></div>" + DISCLAIMER;
    },
    "tak-loan": function () {
        const purposes = [["surgery-in", "عملية جراحية داخل القطر", 25000], ["surgery-out", "عملية جراحية خارج القطر", 50000], ["marriage", "الزواج", 20000], ["office", "تأسيس مكتب أو تجهيزه", 25000], ["conference", "المؤتمرات العلمية والمهنية", 15000], ["research", "طباعة البحوث الحقوقية (للأستاذ)", 25000]];
        return '<section class="card"><div class="form-row">' +
            '<div class="field"><label for="tlPurpose">غاية القرض</label><select id="tlPurpose">' +
            purposes.map(function (p) { return '<option value="' + p[2] + '">' + esc(p[1]) + " — حتى " + fmt(p[2]) + " ل.س</option>"; }).join("") + "</select></div>" +
            numInput("tlAmount", "المبلغ المطلوب (ل.س)", 25000) +
            numInput("tlMonths", "عدد الأقساط الشهرية", 24, "الحد الأقصى 24 قسطاً (سنتان ميلاديتان)") +
            numInput("tlLate", "عدد الأقساط المتأخرة (للتوضيح)", 0, "فائدة 9٪ على الأقساط المتأخرة؛ ثلاثة أقساط متأخرة تجعل الباقي مستحقاً") +
            "</div></section><div id=\"tlOut\"></div>" +
            '<section class="card"><h3><i class="ti ti-checklist" aria-hidden="true"></i> شروط المنح</h3><ul class="block-list">' +
            "<li>مضي عام على الاشتراك وبراءة الذمة تجاه الصندوق. " + refsHTML("tak:26") + "</li>" +
            "<li>لا قرض جديد مع قرض قائم. " + refsHTML("tak:6") + "</li>" +
            "<li>كفيلان متضامنان من الأعضاء وتفويض باقتطاع الأقساط من وارداتهم في صندوق التعاون والوكالات. " + refsHTML("tak:24") + "</li>" +
            "<li>لا قرض خلال مدة منع مسلكي أو مع التأخر عن ثلاثة اشتراكات في السنة. " + refsHTML("tak:27") + "</li>" +
            "<li>للهيئة العامة للفرع تعديل المقادير في مطلع كل عام. " + refsHTML("tak:20") + "</li></ul></section>" + DISCLAIMER;
    },
    "accounts-browser": function () {
        const rows = chartRows();
        return '<section class="card"><div class="table-tools"><input type="search" data-filter-table="acTable" placeholder="ابحث برقم الحساب أو اسمه…" aria-label="تصفية دليل الحسابات"></div>' +
            '<div id="acTable">' + tableHTML(["الرقم", "الحساب", "يتبع", "المستوى"], rows, { sortable: true }) + "</div>" +
            '<p class="result-src" style="margin-top:8px">منسوخ من الجدول رقم (1) الملحق بالنظام المالي. بعض الأرقام في الصفحة الأخيرة مقطوعة في الصورة، وبعض الأرقام مكررة كما في الأصل (مثل 510).</p></section>';
    }
};

function entryFeeForm(fund) {
    return '<section class="card"><div class="form-row">' +
        dateInput("efBirth", "تاريخ الولادة (قيد الأحوال المدنية)", "", "اليوم المجهول يحسب من 1 كانون الثاني لسنة الولادة") +
        dateInput("efJoin", "تاريخ الانتساب", todayISO()) +
        numInput("efAge", "أو أدخل العمر مباشرة (سنوات كاملة)", "", "يُستخدم إذا لم يُدخل تاريخ الولادة") +
        '</div><input type="hidden" id="efFund" value="' + fund + '"></section><div id="efOut"></div>';
}

/* دليل الحسابات من فقرات الجدول (fin:t1) */
function chartRows() {
    const a = DOC.fin && DOC.fin.byKey.t1;
    if (!a) return [];
    const rows = [];
    let top = "";
    a.paras.forEach(function (p) {
        const t = p.replace(/\[؟\][^—]*/g, "").trim();
        const m = t.match(/^(\d+)-\s*([^:]+?)(?::\s*(.*))?$/);
        if (!m) {
            /* سطر يكمل حسابات الزمرة السابقة */
            t.split(/\s+—\s+/).forEach(function (seg) {
                const s = seg.match(/^(\d{3})\s+(.+?)\.?$/);
                if (s) rows.push([s[1], s[2], top, "فرعي"]);
            });
            return;
        }
        const code = m[1], name = m[2].trim().replace(/^\(|\)$/g, "");
        if (code.length === 1) { top = code + " " + name; rows.push([code, name.replace(/^ال/, "ال"), "", "زمرة"]); }
        const parent = code.length === 1 ? "" : top;
        if (code.length === 2) rows.push([code, name, parent, "رئيسي"]);
        if (m[3]) {
            m[3].split(/\s+—\s+/).forEach(function (seg) {
                const s = seg.trim().match(/^(\d{2,3})-?\s+(.+?)\.?$/);
                if (s) rows.push([s[1], s[2].replace(/\.$/, ""), code.length === 2 ? code + " " + name : top, s[1].length === 3 ? "فرعي" : "رئيسي"]);
            });
        }
    });
    return rows;
}

function computeTool(id) {
    if (id === "agency-fees-calc") {
        const f = ENC.agencyFees.find(function (x) { return x.id === document.getElementById("afType").value; });
        const placeSel = document.getElementById("afPlace");
        placeSel.disabled = !f.outside;
        if (!f.outside) placeSel.value = "main";
        const outside = f.outside && placeSel.value === "outside";
        const personsEl = document.getElementById("afPersons");
        personsEl.disabled = !f.persons;
        const persons = f.persons ? Math.max(0, Math.floor(num("afPersons"))) : 0;
        const travelEl = document.getElementById("afTravel");
        travelEl.disabled = !outside;
        const travel = outside && travelEl.checked;
        const rows = [];
        let total = 0;
        f.items.forEach(function (it) {
            let amt = it[1];
            let name = it[0];
            if (it[2] === "pleading" && outside) { amt = 300; name += " — خارج المكتب الرئيسي"; }
            rows.push([name, fmt(amt)]);
            total += amt;
        });
        if (persons) { rows.push(["طابع مرافعة إضافي × " + persons, fmt(100 * persons)]); total += 100 * persons; }
        if (outside) { rows.push(["مبلغ نقدي (50 للمندوب + 25 للفرع + 25 للمجلس)", "100"]); total += 100; }
        if (travel) { rows.push(["رسم انتقال المندوب (دون أجرة النقل)", "200"]); total += 200; }
        const stated = f.stated ? (outside ? f.stated.outside : f.stated.main) : null;
        const base = total - (persons ? 100 * persons : 0) - (travel ? 200 : 0);
        const mismatch = stated != null && base !== stated;
        document.getElementById("afOut").innerHTML =
            '<div class="result-panel"><small>المجموع المحسوب من البنود</small><b>' + fmt(total) + " ل.س</b>" +
            "<p>" + (stated != null ? "التكلفة المعلنة في المرجع: " + fmt(stated) + " ل.س" + (persons || travel ? " (قبل الإضافات)" : "") : "لا يذكر المرجع مجموعاً لهذا النوع.") + "</p></div>" +
            (mismatch ? '<div class="gap-box" style="margin-bottom:14px"><span class="kind-tag kind-gap">يحتاج تحقق</span><p class="mismatch">مجموع البنود الأساسية (' + fmt(base) + ") لا يطابق التكلفة المعلنة (" + fmt(stated) + "). الفرق " + fmt(Math.abs(base - stated)) + " ل.س. " +
                esc(f.statedNote || "تحقق من الجدول الأصلي أو من تعليمات الفرع.") + "</p></div>" : "") +
            '<section class="card"><h3><i class="ti ti-receipt" aria-hidden="true"></i> البنود</h3>' +
            tableHTML(["البند", "المبلغ (ل.س)"], rows, { numCols: [1], foot: '<tr><td>المجموع</td><td class="num">' + fmt(total) + "</td></tr>" }) +
            '<p style="margin-top:8px">المصدر: ' + refsHTML(f.refs) + "</p></section>";
        return;
    }
    if (id === "deadlines") {
        const d = ENC.deadlines.find(function (x) { return x.id === document.getElementById("dlType").value; });
        const from = parseDate(document.getElementById("dlFrom").value);
        let html = "";
        if (from) {
            const end = addPeriod(from, d.n, d.unit);
            html = '<div class="result-panel neutral"><small>آخر يوم في المهلة (تقريبي)</small><b>' + fmtDate(end) + "</b><p>" +
                esc(d.n + " " + UNIT_NAMES[d.unit] + " — " + d.from) + "</p></div>";
            if (d.unit === "h") html = '<div class="result-panel neutral"><small>تنتهي المهلة بعد</small><b>48 ساعة</b><p>من ساعة الإعلان؛ أي في ' + fmtDate(end) + " في الساعة نفسها.</p></div>";
        }
        document.getElementById("dlOut").innerHTML = html + '<section class="card"><h3><i class="ti ti-quote" aria-hidden="true"></i> سند المهلة</h3>' + itemsList([[d.title + ": " + d.n + " " + UNIT_NAMES[d.unit] + "، " + d.from + ".", d.refs]]) + "</section>";
        return;
    }
    if (id === "coop-share") {
        const birth = parseDate(document.getElementById("csBirth").value);
        const start = parseDate(document.getElementById("csStart").value);
        const masters = parseDate(document.getElementById("csMasters").value);
        const at = parseDate(document.getElementById("csAt").value) || new Date();
        const out = document.getElementById("csOut");
        if (!birth || !start) { out.innerHTML = '<div class="empty"><i class="ti ti-calendar" aria-hidden="true"></i>أدخل تاريخ الولادة وتاريخ الانتساب.</div>'; return; }
        const age = ageAt(birth, start);
        let half, full, rule;
        if (age < 30) {
            half = addPeriod(start, 1, "y");
            full = masters;
            rule = "انتسب قبل إتمام الثلاثين (" + age + " سنة): نصف حصة بعد انقضاء عام على الممارسة، وحصة كاملة اعتباراً من قرار الانتقال إلى جدول الأساتذة.";
        } else if (age < 40) {
            half = addPeriod(start, 3, "y");
            full = addPeriod(start, 4, "y");
            rule = "انتسب بعد الثلاثين وقبل إتمام الأربعين (" + age + " سنة): نصف حصة بعد ثلاث سنوات، وكاملة بعد أربع سنوات من الانتساب.";
        } else {
            half = addPeriod(start, 5, "y");
            full = addPeriod(start, 6, "y");
            rule = "انتسب بعد الأربعين (" + age + " سنة): نصف حصة بعد خمس سنوات، وكاملة بعد ست سنوات من الانتساب.";
        }
        let status = "لا يستحق بعد";
        if (full && at >= full) status = "حصة كاملة";
        else if (at > half) status = "نصف حصة";
        out.innerHTML = '<div class="result-panel"><small>الاستحقاق في ' + fmtDate(at) + "</small><b>" + status + "</b><p>" +
            "نصف الحصة بعد: " + fmtDate(half) + " · الحصة الكاملة: " + (full ? fmtDate(full) : (age < 30 ? "من تاريخ قرار الانتقال إلى الأساتذة (أدخله)" : "—")) + "</p></div>" +
            '<section class="card"><h3><i class="ti ti-math-function" aria-hidden="true"></i> طريقة الحساب</h3>' + itemsList([[rule, "coop:8"], ["العمر محسوب عند الانتساب بالسنوات الكاملة من قيد الأحوال المدنية.", "internal:8 fin:9"]]) + "</section>";
        return;
    }
    if (id === "amb-entry-fee" || id === "tak-entry-fee") {
        const fund = document.getElementById("efFund").value;
        const birth = parseDate(document.getElementById("efBirth").value);
        const join = parseDate(document.getElementById("efJoin").value) || new Date();
        let age = birth ? ageAt(birth, join) : Math.floor(num("efAge"));
        const out = document.getElementById("efOut");
        if (!age) { out.innerHTML = '<div class="empty"><i class="ti ti-calendar" aria-hidden="true"></i>أدخل تاريخ الولادة أو العمر.</div>'; return; }
        const p = fund === "amb" ? { base: 10000, a: 1000, b: 3000, ref: "amb:9" } : { base: 1000, a: 300, b: 500, ref: "tak:7" };
        const over30 = Math.max(0, age - 30), over40 = Math.max(0, age - 40);
        const tiered = p.base + Math.min(over30, 10) * p.a + over40 * p.b;
        const cumulative = p.base + over30 * p.a + over40 * p.b;
        out.innerHTML = '<div class="result-panel"><small>العمر عند الانتساب: ' + age + " سنة</small><b>" + fmt(tiered) + (tiered !== cumulative ? " – " + fmt(cumulative) : "") + " ل.س</b>" +
            "<p>" + (tiered !== cumulative ? "يتوقف المبلغ على تفسير النص (انظر أدناه)." : "التفسيران يعطيان المبلغ نفسه لهذا العمر.") + "</p></div>" +
            '<section class="card"><h3><i class="ti ti-math-function" aria-hidden="true"></i> طريقة الحساب</h3>' +
            tableHTML(["البند", "التفسير الأول (شرائح)", "التفسير الثاني (تراكمي)"], [
                ["الرسم الأساسي", fmt(p.base), fmt(p.base)],
                ["السنوات فوق الثلاثين × " + fmt(p.a), Math.min(over30, 10) + " × " + fmt(p.a) + " = " + fmt(Math.min(over30, 10) * p.a), over30 + " × " + fmt(p.a) + " = " + fmt(over30 * p.a)],
                ["السنوات فوق الأربعين × " + fmt(p.b), over40 + " × " + fmt(p.b) + " = " + fmt(over40 * p.b), over40 + " × " + fmt(p.b) + " = " + fmt(over40 * p.b)],
                ["المجموع", fmt(tiered), fmt(cumulative)]
            ]) +
            '<div class="gap-box" style="margin-top:12px"><span class="kind-tag kind-gap">غموض في النص</span><p>ينص النظام على إضافة ' + fmt(p.a) + " عن كل سنة تزيد عن الثلاثين و" + fmt(p.b) + " عن كل سنة تزيد عن الأربعين، دون أن يحدد هل تحسب السنوات فوق الأربعين بالمبلغين معاً (تراكمي) أم بالمبلغ الثاني وحده (شرائح). التفسير المعتمد لدى الصندوق هو الحكم.</p></div>" +
            '<p style="margin-top:10px">المصدر: ' + refsHTML(p.ref + " internal:8") + "</p>" +
            (fund === "tak" ? '<p class="result-src">الإضافات تخص المحامي المنتسب بعد نفاذ النظام (2001/1/2).</p>' : "") + "</section>";
        return;
    }
    if (id === "tak-retirement-grant") {
        const kind = document.getElementById("trCase").value;
        const years = Math.max(0, Math.floor(num("trYears")));
        const member = Math.max(0, Math.floor(num("trMember")));
        const raw = years * 3000;
        const grant = Math.min(raw, 50000);
        const eligible = kind === "retire" || (member >= 2 && years >= 5);
        document.getElementById("trOut").innerHTML =
            '<div class="result-panel' + (eligible ? "" : " neutral") + '"><small>' + (eligible ? "المعونة المستحقة" : "غير مستحقة وفق المدخلات") + "</small><b>" + (eligible ? fmt(grant) + " ل.س" : "—") + "</b><p>" +
            years + " × 3,000 = " + fmt(raw) + (raw > 50000 ? " ← الحد الأقصى 50,000" : "") + "</p></div>" +
            '<section class="card"><h3><i class="ti ti-math-function" aria-hidden="true"></i> طريقة الحساب والشروط</h3>' + itemsList([
                ["معونة دفعة واحدة: 3,000 ل.س عن كل سنة من سنوات الخدمة كمحام، بحد أقصى 50,000 ل.س.", "tak:18"],
                ["تعطى للمحال إلى التقاعد، وللمحامي غير المشمول بالتقاعد عند ترقين قيده لأي سبب عدا الأسباب المسلكية.", "tak:5"],
                ["شرط الترقين: مضي سنتين على الاشتراك في الصندوق، وألا تقل الممارسة عن خمس سنوات" + (kind === "unlist" ? (eligible ? " — متوافر." : " — غير متوافر في المدخلات.") : "."), "tak:5"],
                ["يقتطع منها المتبقي من أي قرض للصندوق.", "tak:25"],
                ["للهيئة العامة للفرع تعديل المقادير في مطلع كل عام.", "tak:20"]
            ]) + "</section>";
        return;
    }
    if (id === "tak-loan") {
        const max = num("tlPurpose") || parseInt(document.getElementById("tlPurpose").value, 10);
        let amount = num("tlAmount");
        const capped = amount > max;
        amount = Math.min(amount, max);
        let months = Math.floor(num("tlMonths")) || 1;
        const tooLong = months > 24;
        months = Math.min(Math.max(months, 1), 24);
        const inst = Math.ceil(amount / months);
        const late = Math.max(0, Math.floor(num("tlLate")));
        const lateInterest = Math.round(Math.min(late, months) * inst * 0.09);
        document.getElementById("tlOut").innerHTML =
            '<div class="result-panel"><small>القسط الشهري التقريبي</small><b>' + fmt(inst) + " ل.س</b><p>" +
            fmt(amount) + " ل.س على " + months + " قسطاً، ورسم إداري مقطوع 100 ل.س." + (late ? " فائدة التأخير على " + late + " قسط: " + fmt(lateInterest) + " ل.س." : "") + "</p></div>" +
            (capped || tooLong || late >= 3 ? '<div class="gap-box" style="margin-bottom:14px"><ul class="block-list">' +
                (capped ? "<li>المبلغ المطلوب يتجاوز الحد الأقصى لهذه الغاية؛ حُسب على " + fmt(max) + " ل.س. " + refsHTML("tak:19") + "</li>" : "") +
                (tooLong ? "<li>مدة التسديد لا تتجاوز سنتين ميلاديتين؛ حُسبت على 24 قسطاً. " + refsHTML("tak:22") + "</li>" : "") +
                (late >= 3 ? "<li>التأخر عن ثلاثة أقساط متتالية أو متفرقة يجعل كامل السندات المتبقية مستحقة الأداء مع فائدة 9٪، وتلاحق اللجنة المقترض وكفيليه. " + refsHTML("tak:24") + "</li>" : "") +
                "</ul></div>" : "") +
            '<section class="card"><h3><i class="ti ti-math-function" aria-hidden="true"></i> طريقة الحساب</h3>' + itemsList([
                ["القسط = المبلغ ÷ عدد الأقساط (مقرّب لأعلى ليرة)؛ والأقساط الفعلية تحددها لجنة الصندوق.", "tak:22"],
                ["رسم إداري 100 ل.س عن كل قرض.", "tak:21"],
                ["فائدة التأخير 9٪ عن الأقساط المتأخرة (محسوبة هنا على قيمة القسط مرة واحدة للتوضيح؛ لا يحدد النص طريقة احتسابها الزمنية).", "tak:24"]
            ]) + "</section>";
        return;
    }
}

/* =========================================================
   الجداول القابلة للفرز والتصفية
========================================================= */

function enhanceTables(root) {
    root.querySelectorAll("table.data[data-sortable] th[data-sort]").forEach(function (th) {
        th.tabIndex = 0;
        th.setAttribute("role", "button");
        th.setAttribute("aria-label", "فرز حسب " + th.textContent);
        const doSort = function () {
            const table = th.closest("table");
            const i = parseInt(th.dataset.sort, 10);
            const asc = !th.classList.contains("sorted-asc");
            table.querySelectorAll("th").forEach(function (x) { x.classList.remove("sorted-asc", "sorted-desc"); });
            th.classList.add(asc ? "sorted-asc" : "sorted-desc");
            const body = table.tBodies[0];
            const rows = Array.from(body.rows);
            rows.sort(function (a, b) {
                const x = a.cells[i].textContent.trim(), y = b.cells[i].textContent.trim();
                const nx = parseFloat(x.replace(/[^\d.]/g, "")), ny = parseFloat(y.replace(/[^\d.]/g, ""));
                const cmp = !isNaN(nx) && !isNaN(ny) && /^\d/.test(x) && /^\d/.test(y) ? nx - ny : x.localeCompare(y, "ar");
                return asc ? cmp : -cmp;
            });
            rows.forEach(function (r) { body.appendChild(r); });
        };
        th.addEventListener("click", doSort);
        th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doSort(); } });
    });
    root.querySelectorAll("[data-filter-table]").forEach(function (inp) {
        inp.addEventListener("input", function () {
            const terms = tokens(inp.value);
            const host = document.getElementById(inp.dataset.filterTable);
            host.querySelectorAll("tbody tr").forEach(function (tr) {
                const hay = norm(tr.textContent);
                tr.hidden = terms.length > 0 && !terms.every(function (t) { return hay.indexOf(t) !== -1 || tokens(tr.textContent).some(function (w) { return w.startsWith(t); }); });
            });
        });
    });
}

/* =========================================================
   التوجيه
========================================================= */

function route() {
    const h = location.hash || "#/";
    const [pathPart, queryPart] = h.slice(1).split("?");
    const parts = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(queryPart || "");
    const main = document.getElementById("main");
    let html, title = "موسوعة نقابة المحامين", treeDoc = null, treeKey = null, toolId = null;

    if (!parts.length) html = viewHome();
    else if (parts[0] === "docs") { html = viewDocs(); title = "الوثائق"; }
    else if (parts[0] === "doc" && parts[1] && parts[2]) {
        html = viewArticle(parts[1], parts[2], params.get("q"));
        treeDoc = parts[1]; treeKey = parts[2];
        const a = DOC[parts[1]] && DOC[parts[1]].byKey[parts[2]];
        title = a ? a.label + " — " + DOC[parts[1]].short : title;
    } else if (parts[0] === "doc" && parts[1]) { html = viewDoc(parts[1]); treeDoc = parts[1]; title = DOC[parts[1]] ? DOC[parts[1]].short : title; }
    else if (parts[0] === "topics") { html = viewTopics(); title = "الموسوعة القانونية"; }
    else if (parts[0] === "cat" && parts[1]) { html = viewTopics(parts[1]); title = CAT[parts[1]] ? CAT[parts[1]].title : title; }
    else if (parts[0] === "topic" && parts[1]) { html = viewTopic(parts[1]); title = TOPIC[parts[1]] ? TOPIC[parts[1]].title : title; }
    else if (parts[0] === "roles") { html = viewRoles(); title = "المسؤوليات والصلاحيات"; }
    else if (parts[0] === "role" && parts[1]) { html = viewRole(parts[1]); title = ROLE[parts[1]] ? ROLE[parts[1]].title : title; }
    else if (parts[0] === "tools") { html = viewTools(); title = "الأدوات"; }
    else if (parts[0] === "tool" && parts[1]) { html = viewTool(parts[1]); toolId = parts[1]; title = TOOL[parts[1]] ? TOOL[parts[1]].title : title; }
    else if (parts[0] === "search") { html = viewSearch(params); title = "بحث: " + (params.get("q") || ""); }
    else if (parts[0] === "about") { html = viewAbout(); title = "عن الموسوعة"; }
    else html = viewNotFound();

    main.innerHTML = html;
    main.style.animation = "none";
    void main.offsetWidth;
    main.style.animation = "";
    document.title = title + (title.indexOf("موسوعة") === -1 ? " · موسوعة نقابة المحامين" : "");
    renderNav();
    markTreeActive(treeDoc, treeKey);
    enhanceTables(main);
    if (toolId && TOOL_VIEWS[toolId] && !(ENC.checklists || {})[toolId]) {
        main.querySelectorAll("input, select").forEach(function (el) {
            if (el.dataset.filterTable) return;
            el.addEventListener("input", function () { computeTool(toolId); });
            el.addEventListener("change", function () { computeTool(toolId); });
        });
        computeTool(toolId);
    }
    if (parts[0] !== "search") document.getElementById("q").value = "";
    document.body.classList.remove("menu-open");
    window.scrollTo(0, 0);
    if (route.didInit) main.focus({ preventScroll: true });
    route.didInit = true;
}

/* =========================================================
   الأحداث
========================================================= */

function goSearch(q) {
    q = (q || "").trim();
    if (!q) return;
    location.hash = "#/search?q=" + encodeURIComponent(q);
}

let suggestFocus = -1;

function renderSuggest() {
    const q = document.getElementById("q").value;
    const box = document.getElementById("suggest");
    if (!q.trim()) { box.hidden = true; return; }
    const res = search(q).results.slice(0, 8);
    const terms = parseQuery(q).terms;
    suggestFocus = -1;
    box.innerHTML = res.map(function (r) {
        const e = r.e;
        return '<a role="option" href="' + e.url + (e.type === "article" ? "?q=" + encodeURIComponent(q) : "") + '"><i class="ti ti-' + (e.icon || TYPE_ICONS[e.type]) + '" aria-hidden="true"></i><span>' +
            highlight(e.type === "article" ? e.label + " — " + DOC[e.doc].short : e.title, terms) + "<small>" + TYPE_NAMES[e.type] + (e.type === "article" ? " · ص" + (e.page || "—") : "") + "</small></span></a>";
    }).join("") + '<a class="suggest-all" href="#/search?q=' + encodeURIComponent(q) + '">كل النتائج لـ «' + esc(q) + "»</a>";
    box.hidden = false;
}

document.addEventListener("DOMContentLoaded", init);
if (document.readyState !== "loading") init();

function init() {
    if (init.done) return;
    init.done = true;
    renderTree();
    const qEl = document.getElementById("q");
    const box = document.getElementById("suggest");

    document.getElementById("globalSearch").addEventListener("submit", function (e) {
        e.preventDefault();
        box.hidden = true;
        goSearch(qEl.value);
    });
    qEl.addEventListener("input", renderSuggest);
    qEl.addEventListener("keydown", function (e) {
        const links = box.querySelectorAll("a");
        if (box.hidden || !links.length) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            suggestFocus = (suggestFocus + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
            links.forEach(function (a, i) { a.classList.toggle("focused", i === suggestFocus); });
        } else if (e.key === "Enter" && suggestFocus >= 0) {
            e.preventDefault();
            box.hidden = true;
            location.hash = links[suggestFocus].getAttribute("href");
        } else if (e.key === "Escape") {
            box.hidden = true;
        }
    });
    document.addEventListener("click", function (e) {
        if (!e.target.closest("#globalSearch")) box.hidden = true;
        const act = e.target.closest("[data-act]");
        if (!act) return;
        const a = act.dataset.act;
        if (a === "print") window.print();
        if (a === "jump") {
            e.preventDefault();
            const el = document.querySelector(act.getAttribute("href"));
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (a === "copy-article") {
            const d = DOC[act.dataset.doc], art = d.byKey[act.dataset.key];
            const text = art.label + "\n" + art.paras.join("\n") + "\n\n— " + d.title + (art.page ? "، صفحة " + art.page : "");
            (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast("نُسخ نص المادة مع مصدرها"); }, function () { toast("تعذر النسخ — حدد النص يدوياً"); });
        }
        if (a === "cl-reset") {
            store("ui_check_" + act.dataset.id, "{}");
            route();
        }
    });
    document.addEventListener("submit", function (e) {
        if (e.target.dataset.act === "hero-search") {
            e.preventDefault();
            goSearch(e.target.q.value);
        }
    });
    document.addEventListener("change", function (e) {
        const cb = e.target.closest("input[data-cl]");
        if (!cb) return;
        let saved = {};
        try { saved = JSON.parse(store("ui_check_" + cb.dataset.cl) || "{}"); } catch (err) {}
        saved[cb.dataset.k] = cb.checked;
        store("ui_check_" + cb.dataset.cl, JSON.stringify(saved));
        const all = document.querySelectorAll('input[data-cl="' + cb.dataset.cl + '"]');
        const done = Array.from(all).filter(function (x) { return x.checked; }).length;
        document.getElementById("clProgress").style.width = Math.round(done / all.length * 100) + "%";
        document.getElementById("clCount").textContent = done + " من " + all.length + " بنداً";
    });
    document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
            e.preventDefault();
            qEl.focus();
            qEl.select();
        } else if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
            e.preventDefault();
            qEl.focus();
        }
    });
    document.getElementById("treeFilter").addEventListener("input", function () { filterTree(this.value); });
    document.getElementById("menuToggle").addEventListener("click", function () { document.body.classList.add("menu-open"); });
    document.getElementById("menuClose").addEventListener("click", function () { document.body.classList.remove("menu-open"); });
    document.getElementById("navOverlay").addEventListener("click", function () { document.body.classList.remove("menu-open"); });
    const themeBtn = document.getElementById("themeToggle");
    function syncThemeIcon() {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        themeBtn.innerHTML = '<i class="ti ti-' + (dark ? "sun" : "moon") + '" aria-hidden="true"></i>';
        themeBtn.setAttribute("aria-label", dark ? "الوضع النهاري" : "الوضع الليلي");
    }
    themeBtn.addEventListener("click", function () {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        store("ui_theme", next);
        syncThemeIcon();
    });
    syncThemeIcon();
    window.addEventListener("hashchange", route);
    route();
}
