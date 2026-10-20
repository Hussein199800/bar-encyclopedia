/*
 * The two cuts of the explainer video: narration (said by the voice and shown as
 * subtitles) and the on-screen action for each sentence. Every statement describes
 * what the encyclopedia really contains; numbers come from the data files.
 *
 * A sentence: { say, show?, act? }  — `show` overrides the subtitle text.
 * A scene:    { id, chapter?, enter?, sentences, tail? }
 */

const I = {
  files: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z"/><path d="M15 3v4h4"/><path d="M4 7v12a2 2 0 0 0 2 2h9"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3z"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 5.8"/></svg>',
  stamp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M9 3h6v5l3 4H6l3-4z"/><path d="M4 14h16v4H4zM6 21h12"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7.5-4.4-9-9.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 9 3.8C19.5 15.6 12 20 12 20z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>',
  gap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 3"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
  calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>',
  safe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="15" rx="2.5"/><circle cx="12" cy="11.5" r="3.5"/><path d="M6 19v2M18 19v2"/></svg>',
};

const MARK = '<svg class="mark" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="17" fill="#0e6150"/><g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M32 21C26.5 17 19 16.5 13 18.5V43.5C19 41.5 26.5 42 32 46Z"/><path d="M32 21C37.5 17 45 16.5 51 18.5V35"/><path d="M32 46C34.5 44.2 37.2 43.1 40 42.6"/><path d="M18 25.5C21.5 24.7 24.8 24.9 27.5 26" stroke-width="2"/><path d="M18 31.5C21.5 30.7 24.8 30.9 27.5 32" stroke-width="2"/><path d="M36.5 26C39.2 24.9 42.5 24.7 46 25.5" stroke-width="2"/></g><circle cx="47" cy="45.5" r="10.5" fill="#c9a24a" stroke="#0b4d40" stroke-width="3"/><text x="47" y="50" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" font-family="serif">§</text></svg>';

const tile = (icon, title, body, extra = '', cls = '') =>
  `<div class="tile ${cls}"><div class="ic">${I[icon]}</div><h3>${title}</h3>${body ? `<p>${body}</p>` : ''}${extra}</div>`;

const intro = (lead) =>
  `<div class="intro">${MARK}<p class="eyebrow">نقابة المحامين في الجمهورية العربية السورية وفروعها</p>` +
  `<h1 class="display">موسوعة النقابة<span class="accent">القانونية والمالية</span></h1><p class="lead">${lead}</p></div>`;

const closing = () =>
  `<div class="intro">${MARK}<h1 class="display">موسوعة النقابة<span class="accent">القانونية والمالية</span></h1>` +
  `<p class="lead">النصوص كاملة · مشروحة · مربوطة بمصادرها</p><div><span class="url-pill">hussein199800.github.io/bar-encyclopedia</span></div></div>`;

const examples = (hl) =>
  `<h2 class="h2"><small>أمثلة من العمل اليومي</small>كيف تختصر الموسوعة الطريق؟</h2><div class="tiles c3">` +
  tile('users', 'محامٍ يجهّز ملف قيد', 'موضوع «شروط التسجيل» وقائمة تدقيق ملف طلب القيد، بدل تتبّع ١١٤ مادة.', '<span class="tag">م9 · النظام الداخلي م8 وم12</span>', hl === 0 ? 'hl' : '') +
  tile('calc', 'مندوب الوكالات يحسب الرسوم', 'الحاسبة تجمع الطوابع والإيصالات بنداً بنداً، وتقارن المجموع بالرقم المعلن في المرجع.', '<span class="tag">مرجع الوكالات</span>', hl === 1 ? 'hl' : '') +
  tile('safe', 'خازن فرع جديد', 'مسؤولياته وصلاحياته والمحظور عليه في صفحة واحدة، بدل البحث بين النظامين الداخلي والمالي.', '<span class="tag">النظام الداخلي م76 · المالي م19</span>', hl === 2 ? 'hl' : '') +
  '</div>';

/* ---------------------------------------------------------------- full cut */

export const FULL = [
  {
    id: 'intro',
    enter: async (c) => { await c.card(intro('مرجع رقمي يجمع النصوص الرسمية ويشرحها ويربط كل معلومة بمادتها وصفحتها')); },
    sentences: [
      { say: 'موسوعة نقابة المحامين السورية.' },
      { say: 'مرجعٌ رقمي واحد يجمع قانونَ تنظيم مهنة المحاماة، وأنظمةَ النقابة وصناديقها، ويشرحها ببساطة، ويربط كلَّ معلومةٍ بمادتها وصفحتها.' },
    ],
  },
  {
    id: 'problem',
    chapter: ['١', 'لماذا الموسوعة؟'],
    enter: async (c) => {
      await c.card(`<h2 class="h2"><small>المشكلة التي تعالجها</small>النصوص موجودة… لكنها متفرّقة</h2><div class="tiles c3">` +
        tile('files', 'سبع وثائق منفصلة', 'القانون، والنظام الداخلي، والنظام المالي، وأنظمة ثلاثة صناديق، ومرجع الوكالات.') +
        tile('scan', 'ملفات لا يُبحث فيها', 'خمس من الوثائق السبع صور ممسوحة أو بخط تالف، لا يمكن البحث في نصها.') +
        tile('puzzle', 'إجابة موزّعة', 'السؤال الواحد قد تتوزع إجابته بين أكثر من وثيقة ومادة.') + '</div>');
    },
    sentences: [
      { say: 'النصوص التي يحتاجها المحامي ومجالسُ الفروع موزّعةٌ على سبع وثائق، خمسٌ منها ملفاتٌ لا يمكن البحث في نصها.' },
      { say: 'والسؤال الواحد، كشروط التسجيل، أو مهلة الطعن، أو رسوم الوكالة، قد تتوزع إجابته بين القانون والنظام الداخلي والنظام المالي.' },
      { say: 'فجاءت الموسوعة لتجمع هذه النصوص في مكانٍ واحد قابلٍ للبحث، دون أي نصٍّ من خارج الوثائق الرسمية.' },
    ],
  },
  {
    id: 'audience',
    chapter: ['٢', 'لمن صُمّمت؟'],
    enter: async (c) => {
      await c.card(`<h2 class="h2"><small>الجهات المستفيدة</small>مرجع واحد لكل من يعمل في المهنة</h2><div class="tiles c4">` +
        tile('scale', 'المحامون', 'الأساتذة والمتمرنون والمنتسبون حديثاً.') +
        tile('users', 'المجالس والقيادة', 'النقيب ورئيس الفرع وأمين السر والخازن.') +
        tile('stamp', 'موظفو الفروع', 'أمين الصندوق والمحاسبة ومندوب الوكالات.') +
        tile('heart', 'المنتسبون إلى الصناديق', 'التعاون والإسعاف والتكافل.') + '</div>');
    },
    sentences: [
      { say: 'تخدم الموسوعة المحامين الأساتذة والمتمرنين، وأعضاءَ مجالس النقابة والفروع، كالنقيب ورئيس الفرع وأمين السر والخازن.' },
      { say: 'وتخدم موظفي الفروع ومندوبي الوكالات، والمنتسبين إلى صناديق التعاون والإسعاف والتكافل.' },
      {
        say: 'وهي موقعٌ مفتوح للقراءة لا يحتاج إلى تسجيل دخول؛ أما الصلاحيات، فيشرحها دليلُ المسؤوليات لكل منصب، كما وردت في النصوص.',
        act: async (c) => {
          await c.card(`<h2 class="h2"><small>بلا حسابات ولا كلمات مرور</small>مفتوحة للقراءة للجميع</h2><div class="tiles c2">` +
            tile('link', 'الموقع للقراءة', 'لا تسجيل دخول ولا بيانات شخصية؛ يحفظ المتصفح تفضيلات العرض فقط.') +
            tile('users', 'الصلاحيات في دليل المسؤوليات', '١٥ منصباً: المسؤوليات، والصلاحيات، والمحظور، والمدد، وجهة القرار.') + '</div>');
        },
      },
    ],
  },
  {
    id: 'home',
    chapter: ['٣', 'الصفحة الرئيسية'],
    enter: async (c) => { await c.clearCard(); await c.showWin(true); },
    sentences: [
      { say: 'تبدأ الجولة من الصفحة الرئيسية.', act: async (c) => { await c.cursorTo('.hero-search input'); } },
      {
        say: 'في أعلاها صندوقُ بحثٍ واحد يشمل كلَّ المواد والموضوعات.',
        act: async (c) => { await c.point('.hero-search', 'بحث واحد في الوثائق السبع', 'below'); },
      },
      {
        say: 'وتحته أرقام الموسوعة: سبعُ وثائق، وأربعمئةٍ واثنتان وسبعون مادة، وستةٌ وخمسون موضوعاً مشروحاً، وأربعَ عشرةَ أداة.',
        show: 'وتحته أرقام الموسوعة: ٧ وثائق، و٤٧٢ مادة، و٥٦ موضوعاً مشروحاً، و١٤ أداة.',
        act: async (c) => { await c.point('.hero-facts', 'أرقام محسوبة من الوثائق نفسها', 'above'); },
      },
      {
        say: 'ومن هنا يمكن التصفح بحسب الوثيقة، أو بحسب الموضوع، أو بحسب المنصب.',
        act: async (c) => {
          await c.unpoint(); await c.scrollTo('.section-head:nth-of-type(2)', 120); await c.wait(900);
          await c.point('.grid.cols-3', 'تصفّح بحسب الوثيقة', 'above');
        },
      },
    ],
  },
  {
    id: 'search',
    chapter: ['٤', 'البحث الذكي'],
    enter: async (c) => { await c.site('#/'); await c.wait(400); },
    sentences: [
      {
        say: 'لنبحثْ مثلاً عن كلمة: شطب.',
        act: async (c) => { await c.typeIn('.hero-search input', 'شطب'); await c.press('Enter'); },
      },
      {
        say: 'فتظهر النتائج فوراً من المواد والموضوعات ودليل المسؤوليات، مع تلوين الكلمة المطابقة.',
        act: async (c) => { await c.wait(500); await c.point('.result', 'الكلمة ملوّنة في كل نتيجة', 'below'); },
      },
      {
        say: 'ويمكن تصفيتها بحسب النوع، أو الوثيقة، أو الباب.',
        act: async (c) => { await c.point('.filters', 'تصفية النتائج', 'right'); await c.wait(700); await c.clickText('.filters a.chip', 'مادة'); },
      },
      {
        say: 'والبحث يفهم العربية: يتجاهل التشكيل، واختلافَ الهمزات، والتاءَ المربوطة.',
        act: async (c) => { await c.unpoint(); await c.zoomOn('.result', 1.45); },
      },
    ],
  },
  {
    id: 'law',
    chapter: ['٥', 'قانون المهنة بتبويب لكل باب'],
    enter: async (c) => { await c.zoom(); await c.site('#/doc/law'); },
    sentences: [
      {
        say: 'وهذا قانونُ تنظيم مهنة المحاماة، رقم ثلاثين لعام ألفين وعشرة، بموادّه المئةِ والأربعَ عشرة.',
        show: 'وهذا قانون تنظيم مهنة المحاماة رقم ٣٠ لعام ٢٠١٠، بمواده الـ١١٤.',
        act: async (c) => { await c.point('.doc-facts', 'بطاقات تعرّف بالوثيقة', 'below'); },
      },
      {
        say: 'وتحت بطاقات التعريف، تبويبٌ لكلّ بابٍ من أبواب القانون.',
        act: async (c) => { await c.point('.doc-tabs', 'تبويب لكل باب', 'below'); },
      },
      {
        say: 'نختار الباب الرابع، في حقوق المحامين وواجباتهم، فتظهر موادّه بطاقاتٍ مرقّمة، ونفتح إحداها لقراءة نصها الحرفي.',
        act: async (c) => {
          await c.clickSel('.doc-tab[data-part="3"]'); await c.unpoint(); await c.wait(500);
          await c.clickSel('.part-panel:not([hidden]) .art-card summary');
          await c.wait(400); await c.scrollTo('.part-panel:not([hidden]) .art-card', 250);
        },
      },
      {
        say: 'ويمكن البحث داخل القانون وحده، فتبقى الموادّ المطابقة فقط، مع تلوين الكلمات.',
        act: async (c) => {
          await c.scrollTo('.doc-toolbar', 40); await c.wait(500);
          await c.typeIn('input[data-doc-filter]', 'الشطب'); await c.wait(600);
          await c.point('.doc-status', 'عدد المواد المطابقة', 'below');
        },
      },
    ],
  },
  {
    id: 'article',
    chapter: ['٦', 'صفحة المادة'],
    enter: async (c) => { await c.site('#/doc/law/9'); },
    sentences: [
      {
        say: 'ولكلّ مادةٍ صفحتُها الخاصة: النصُّ الحرفي، ومكانُه في الباب والفصل، ورقمُ صفحته في الملف الأصلي.',
        act: async (c) => { await c.point('.side-box .card', 'الباب والفصل وصفحة الأصل', 'right'); },
      },
      {
        say: 'وبزرٍّ واحد تُنسخ المادة مع مصدرها، أو تُفتح صفحتُها في الوثيقة الأصلية للتحقق.',
        act: async (c) => { await c.point('.title-actions', 'نسخ المادة مع مصدرها', 'below'); await c.cursorTo('[data-act="copy-article"]'); },
      },
    ],
  },
  {
    id: 'topic',
    chapter: ['٧', 'الموسوعة القانونية'],
    enter: async (c) => { await c.unpoint(); await c.site('#/topic/registration-conditions'); },
    sentences: [
      { say: 'أما الموسوعة القانونية، فتشرح الموضوعات بلغةٍ مبسّطة.', act: async (c) => { await c.point('.summary-box', 'شرح مبسّط', 'below'); } },
      {
        say: 'ففي موضوع شروط التسجيل في جدول المحامين، تُعرض الشروط الأحدَ عشر، وبجانب كلِّ شرطٍ رقمُ مادته، ومنه تنتقل إلى النص بنقرة.',
        act: async (c) => { await c.unpoint(); await c.scrollTo('#b0', 120); await c.wait(700); await c.point('#b0 .ref', 'رقم المادة: رابط إلى نصها', 'left'); },
      },
      {
        say: 'وتميّز الموسوعة بين ثلاثة أنواع من المحتوى: النصِّ الحرفي، والشرحِ المبسّط، والمثالِ الافتراضي.',
        act: async (c) => { await c.unpoint(); await c.scrollTo('#example', 140); await c.wait(700); await c.point('#example', 'مثال افتراضي مميَّز بإطار متقطع', 'above'); },
      },
    ],
  },
  {
    id: 'roles',
    chapter: ['٨', 'دليل المسؤوليات والصلاحيات'],
    enter: async (c) => { await c.unpoint(); await c.site('#/roles'); },
    sentences: [
      {
        say: 'ودليلُ المسؤوليات والصلاحيات يجمع ما يخصّ كلَّ منصبٍ من نصوصٍ متفرقة: من النقيب ورئيس الفرع، إلى الخازن وأمين الصندوق، إلى المحامي المتمرن ومندوب الوكالات.',
        act: async (c) => { await c.wait(600); await c.scrollTo('.section-head', 120); await c.wait(1400); await c.cursorTo('a[href="#/role/treasurer"]'); },
      },
      {
        say: 'ففي صفحة الخازن مثلاً: المسؤوليات، والصلاحيات، والأعمالُ المحظورة، والمدد، وجهةُ القرار، وكلُّ بندٍ مربوطٌ بمادته.',
        act: async (c) => { await c.clickSel('a[href="#/role/treasurer"]'); await c.wait(1100); await c.scrollTo('#g0', 110); await c.wait(500); await c.point('#g0', 'كل بند مربوط بمادته', 'above'); },
      },
    ],
  },
  {
    id: 'tools',
    chapter: ['٩', 'الأدوات والنماذج'],
    enter: async (c) => { await c.unpoint(); await c.site('#/tool/agency-fees-calc'); },
    sentences: [
      { say: 'وفي قسم الأدوات حاسباتٌ وقوائمُ تدقيق تعمل بالأرقام المنصوص عليها فقط.', act: async (c) => { await c.point('.card', 'المدخلات', 'below'); } },
      {
        say: 'حاسبةُ رسوم الوكالة القضائية تجمع الطوابع والإيصالات بحسب نوع الوكالة ومكان تنظيمها وعدد الأشخاص، وتقارن المجموعَ بالرقم المعلن في المرجع.',
        act: async (c) => {
          await c.unpoint(); await c.selectOpt('#afPlace', 'outside'); await c.fillNum('#afPersons', '2'); await c.wait(300); await c.clickSel('#afTravel');
          await c.wait(500); await c.point('#afOut .result-panel', 'المجموع يتحدّث فوراً', 'below');
        },
      },
      {
        say: 'وحاسبةُ المهل تعطي آخرَ يومٍ في المهلة المنصوص عليها، كمهلة الطعن في قرار مجلس الفرع.',
        act: async (c) => { await c.unpoint(); await c.site('#/tool/deadlines'); await c.selectOpt('#dlType', 'appeal-branch'); await c.wait(500); await c.point('#dlOut', 'آخر يوم في المهلة', 'below'); },
      },
      {
        say: 'وقوائمُ التدقيق تساعد على مراجعة ملفِّ طلب القيد بنداً بنداً قبل عرضه.',
        act: async (c) => {
          await c.unpoint(); await c.site('#/tool/checklist-registration');
          for (let i = 0; i < 3; i++) { await c.clickNth('input[data-cl]', i); await c.wait(250); }
          await c.point('#clProgress', 'تقدّم المراجعة يُحفظ على الجهاز', 'below');
        },
      },
    ],
  },
  {
    id: 'mobile',
    chapter: ['١٠', 'على الهاتف وفي الوضع الليلي'],
    enter: async (c) => {
      await c.unpoint(); await c.showWin(false); await c.phone('#/doc/law',
        '<h2>على الهاتف كما على الحاسوب</h2><p>التصميم نفسه، بتبويبات الأبواب وبطاقات المواد، ووضع ليلي مريح للقراءة.</p><ul><li>قائمة جانبية منسدلة</li><li>وضع نهاري وليلي</li><li>لا تمرير أفقي في أي صفحة</li></ul>');
    },
    sentences: [
      { say: 'والموسوعة مصمّمةٌ للهاتف كما للحاسوب.', act: async (c) => { await c.phoneScroll(520); } },
      { say: 'وفيها وضعٌ ليلي مريح للقراءة، بنقرةٍ من القائمة.', act: async (c) => { await c.phoneDark(); await c.phoneScroll(0); } },
    ],
  },
  {
    id: 'examples',
    chapter: ['١١', 'أمثلة واقعية'],
    enter: async (c) => { await c.phoneOff(); await c.card(examples(-1)); },
    sentences: [
      { say: 'مثالٌ أول: محامٍ يجهّز ملفَّ قيد؛ بدلَ البحث في مئةٍ وأربعَ عشرةَ مادة، يفتح موضوعَ شروط التسجيل وقائمةَ تدقيق الملف.', act: async (c) => { await c.hl(0); } },
      { say: 'مثالٌ ثانٍ: مندوب الوكالات يحسب رسوم الوكالة في ثوانٍ، ويرى كلَّ بندٍ ومصدره.', act: async (c) => { await c.hl(1); } },
      { say: 'مثالٌ ثالث: خازنُ فرعٍ جديد يجد مسؤولياته وصلاحياته مجموعةً في صفحةٍ واحدة، بدلَ تتبّعها بين النظام الداخلي والنظام المالي.', act: async (c) => { await c.hl(2); } },
    ],
  },
  {
    id: 'trust',
    chapter: ['١٢', 'الأمانة في النص'],
    enter: async (c) => {
      await c.card(`<h2 class="h2"><small>القاعدة الأولى: لا شيء من خارج الوثائق</small>كل معلومة تُعرف من أين جاءت</h2><div class="tiles c3">` +
        tile('link', 'مربوطة بمصدرها', 'كل بند يحمل رقم مادته وصفحتها في الملف الأصلي.') +
        tile('scan', 'المنسوخ مُعلَّم', 'الوثائق المنسوخة من صور تحمل شارة «بانتظار المراجعة»، والكلمة غير الواضحة علامة [؟].') +
        tile('gap', 'الناقص يظهر في موضعه', 'المواد غير الموجودة في النسخ المرفقة تظهر بإطار متقطع، دون أي نص.') + '</div>');
    },
    sentences: [
      { say: 'والأمانةُ في النص أساسُ الموسوعة: كلُّ معلومةٍ مربوطةٌ بمصدرها، والوثائقُ المنسوخة من صورٍ مُعلَّمٌ عليها بانتظار المراجعة، والموادُّ الناقصة في النسخ المرفقة تظهر في موضعها دون أي نص.' },
      { say: 'والمحتوى إرشادي، لا يغني عن الجهة المختصة.' },
    ],
  },
  {
    id: 'closing',
    enter: async (c) => { await c.chapter(); await c.card(closing()); },
    sentences: [
      { say: 'موسوعة نقابة المحامين: النصوصُ كاملة، مشروحة، ومربوطةٌ بمصادرها.' },
      { say: 'ابدؤوا الآن من الرابط الظاهر على الشاشة.' },
    ],
    tail: 2.2,
  },
];

/* ---------------------------------------------------------------- short cut */

export const SHORT = [
  {
    id: 's-intro',
    enter: async (c) => { await c.card(intro('سبع وثائق رسمية · ٤٧٢ مادة · ٥٦ موضوعاً مشروحاً · ١٤ أداة')); },
    sentences: [
      { say: 'موسوعة نقابة المحامين السورية: قانونُ المهنة وأنظمةُ النقابة وصناديقها، في مرجعٍ واحد.' },
    ],
  },
  {
    id: 's-search',
    chapter: ['١', 'ابحث في كل النصوص'],
    enter: async (c) => { await c.clearCard(); await c.showWin(true); },
    sentences: [
      {
        say: 'ابحثْ في سبعِ وثائقَ دفعةً واحدة، ببحثٍ يفهم العربية.',
        act: async (c) => { await c.typeIn('.hero-search input', 'شطب'); await c.press('Enter'); await c.wait(400); await c.point('.result', 'نتائج من المواد والموضوعات', 'below'); },
      },
    ],
  },
  {
    id: 's-law',
    chapter: ['٢', 'تبويب لكل باب'],
    enter: async (c) => { await c.unpoint(); await c.site('#/doc/law'); },
    sentences: [
      {
        say: 'تصفّحِ القانون باباً باباً، وافتح أيَّ مادةٍ على نصّها الحرفي.',
        act: async (c) => { await c.point('.doc-tabs', 'تبويب لكل باب', 'below'); await c.wait(600); await c.clickSel('.doc-tab[data-part="3"]'); await c.unpoint(); await c.clickSel('.part-panel:not([hidden]) .art-card summary'); },
      },
    ],
  },
  {
    id: 's-tools',
    chapter: ['٣', 'أدوات وأدلة'],
    enter: async (c) => { await c.site('#/tool/agency-fees-calc'); },
    sentences: [
      {
        say: 'واحسبْ رسوم الوكالة والمهل القانونية، واعرفْ مسؤوليات كل منصب، وكلُّ بندٍ مربوطٌ بمادته.',
        act: async (c) => { await c.fillNum('#afPersons', '2'); await c.wait(400); await c.point('#afOut .result-panel', 'المجموع مع مصدر كل بند', 'below'); },
      },
    ],
  },
  {
    id: 's-closing',
    enter: async (c) => { await c.unpoint(); await c.showWin(false); await c.chapter(); await c.card(closing()); },
    sentences: [{ say: 'موسوعة نقابة المحامين: ابدؤوا الآن.' }],
    tail: 2.2,
  },
];
