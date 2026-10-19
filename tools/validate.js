/* فحص سلامة المحتوى: كل مرجع يشير إلى مادة موجودة، وكل رابط داخلي صحيح. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const vm = require("vm");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["docs.js", "content-core.js", "topics-a.js", "topics-b.js", "topics-c.js", "tools.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, "data", f), "utf8").replace(/^window\.ENC = window\.ENC \|\| \{\};/m, "window.ENC = window.ENC || {}; var ENC = window.ENC;"), sandbox);
}
const DOCS = sandbox.window.ENC_DOCS, ENC = sandbox.window.ENC;
const byKey = {};
DOCS.forEach(d => { byKey[d.id] = {}; d.articles.forEach(a => byKey[d.id][a.key] = a); });
let errors = 0, refCount = 0;
function check(refs, where) {
    String(refs || "").trim().split(/\s+/).filter(Boolean).forEach(r => {
        refCount++;
        const m = r.match(/^(\w+):(\w+)$/);
        if (!m || !byKey[m[1]] || !byKey[m[1]][m[2]]) { console.log("مرجع مكسور:", r, "في", where); errors++; }
    });
}
const topicIds = new Set(ENC.topics.map(t => t.id));
const toolIds = new Set(ENC.tools.map(t => t.id));
const catIds = new Set(ENC.cats.map(c => c.id));
const seen = new Set();
ENC.topics.forEach(t => {
    if (seen.has(t.id)) { console.log("معرف مكرر:", t.id); errors++; } seen.add(t.id);
    if (!catIds.has(t.cat)) { console.log("باب غير معروف:", t.cat, t.id); errors++; }
    (t.blocks || []).forEach(b => {
        (b.items || []).forEach(it => { if (it[1]) check(it[1], t.id); else if (b.kind !== "gap") { console.log("بند بلا مرجع:", t.id, "—", it[0].slice(0, 50)); errors++; } });
        if (b.refs) check(b.refs, t.id + " (جدول)");
        (b.rows || []).forEach(r => r.forEach(c => { if (/^\w+:\w+(\s+\w+:\w+)*$/.test(c)) check(c, t.id + " (صف)"); }));
    });
    (t.related || []).forEach(r => { if (!topicIds.has(r)) { console.log("موضوع مرتبط غير موجود:", r, "في", t.id); errors++; } });
    (t.tools || []).forEach(r => { if (!toolIds.has(r)) { console.log("أداة غير موجودة:", r, "في", t.id); errors++; } });
});
ENC.roles.forEach(r => ENC.roleGroups.forEach(g => (r[g.k] || []).forEach(it => it[1] ? check(it[1], "role:" + r.id) : (console.log("بند منصب بلا مرجع:", r.id, it[0]), errors++))));
ENC.tools.forEach(t => check(t.refs, "tool:" + t.id));
Object.keys(ENC.checklists).forEach(id => { if (!toolIds.has(id)) { console.log("قائمة بلا أداة:", id); errors++; } ENC.checklists[id].groups.forEach(g => g.items.forEach(it => check(it[1], id))); });
ENC.deadlines.forEach(d => check(d.refs, "deadline:" + d.id));
ENC.agencyFees.forEach(f => check(f.refs, "fees:" + f.id));
console.log("موضوعات:", ENC.topics.length, "| مسؤوليات:", ENC.roles.length, "| أدوات:", ENC.tools.length, "| مراجع مفحوصة:", refCount, "| أخطاء:", errors);
process.exit(errors ? 1 : 0);
