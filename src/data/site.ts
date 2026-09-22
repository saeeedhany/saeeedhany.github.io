export type Lang = 'ar' | 'en';

export const SITE = {
  name: { ar: 'سعيد هاني', en: 'Saeed Hany' },
  /** two-line wordmark, as in the reference's centred HERMES / AGENT */
  mark: { ar: ['سعيد', 'هاني'], en: ['SAEED', 'HANY'] },
  email: 'alsaeedalbasi0ny@gmail.com',
  social: [
    { label: 'GitHub', href: 'https://github.com/', glyph: 'gh' },
    { label: 'X', href: 'https://x.com/', glyph: 'x' },
    { label: 'Reddit', href: 'https://reddit.com/', glyph: 'r/' },
  ],
} as const;

export const NAV = [
  { href: { ar: '/ar/writing', en: '/writing' }, label: { ar: 'الكتابة', en: 'Writing' } },
  { href: { ar: '/ar/books', en: '/books' }, label: { ar: 'المكتبة', en: 'Library' } },
  { href: { ar: '/ar/about', en: '/about' }, label: { ar: 'عن', en: 'About' } },
] as const;

/**
 * The CV selector — the reference's three-tab OS switcher, doing real work.
 * The PDFs do not exist yet; `ready: false` renders the row in a disabled
 * state with a note rather than shipping a dead link.
 */
export const CVS = [
  { id: 'frontend', name: { ar: 'واجهات', en: 'Frontend' }, file: '/cv/saeed-frontend.pdf', ready: false },
  { id: 'seo', name: { ar: 'SEO', en: 'SEO' }, file: '/cv/saeed-seo.pdf', ready: false },
  { id: 'kernel', name: { ar: 'أنظمة', en: 'Kernel' }, file: '/cv/saeed-kernel.pdf', ready: false },
] as const;

/** The thesis, stated in someone else's words. Band 4. */
export const EPIGRAPH = {
  ar: {
    text:
      'فطالبُ الحقِّ ليس هو الناظرَ في كتب المتقدمين، المسترسلَ مع طبعه في حسن الظن بهم، ' +
      'بل طالبُ الحقِّ هو المتهمُ لظنه فيهم، المتوقفُ فيما يفهمه عنهم، ' +
      'المتبعُ الحجةَ والبرهانَ لا قولَ القائلِ الذي هو إنسان.',
    attr: 'ابن الهيثم — الشكوك على بطليموس',
  },
  en: {
    text:
      'The seeker of truth is not one who studies the writings of the ancients and, ' +
      'following his own disposition, puts his trust in them. The seeker of truth is one ' +
      'who suspects his own understanding of them, who suspends judgement on what he ' +
      'takes from them — who follows proof and demonstration, and not the word of a man ' +
      'who is, after all, only human.',
    attr: 'Ibn al-Haytham — Doubts on Ptolemy',
  },
} as const;

export const COPY = {
  ar: {
    dir: 'rtl',
    tagline: 'أبني لأفهم.',
    // No tashkeel in the hero: Kufi is an inscriptional script and monumental
    // Kufi historically omits vowel marks. At 76px the marks also crowd the
    // leading for no legibility gain — the words are unambiguous without them.
    heroLines: ['أبني', 'لأفهم', 'لا لأنتج'],
    lead: 'كتابةٌ عن أنظمة التشغيل، والعمارة الحاسوبية، ولغة C — وعن عادةِ التحقُّق بدلاً من التسليم.',
    cvLabel: 'السيرة الذاتية',
    cvPending: 'الملفات لم تُرفع بعد.',
    download: 'تحميل',
    writing: 'الكتابة',
    library: 'المكتبة',
    all: 'الكل',
    readAll: 'كل الكتابات',
    allBooks: 'كل الكتب',
    backHome: 'الرئيسية',
    otherLang: 'EN',
    otherLangHref: '/',
    notFound: 'لا يوجد شيء هنا',
    notFoundLead: 'الصفحة التي تبحث عنها غير موجودة.',
    categories: {
      technical: 'تقني',
      'non-fiction': 'غير روائي',
      fiction: 'روائي',
      garbage: 'قمامة',
    },
    status: { read: 'مقروء', reading: 'أقرأه الآن', want: 'أريده' },
    plateCredit: 'اللوحة',
  },
  en: {
    dir: 'ltr',
    tagline: 'I build to understand.',
    // Even line lengths (10/10/11 chars), matching the reference's
    // THE AGENT / THAT GROWS / WITH YOU rhythm. Uneven breaks strand a short
    // word on its own line and the slab stops reading as one block.
    heroLines: ['I BUILD TO', 'UNDERSTAND', 'NOT TO SHIP'],
    lead: 'Writing about operating systems, computer architecture, and C — and about the habit of verifying instead of deferring.',
    cvLabel: 'Curriculum vitae',
    cvPending: 'Files not uploaded yet.',
    download: 'Download',
    writing: 'Writing',
    library: 'The Library',
    all: 'All',
    readAll: 'All writing',
    allBooks: 'All books',
    backHome: 'Home',
    otherLang: 'AR',
    otherLangHref: '/ar',
    notFound: 'Nothing here',
    notFoundLead: "The page you're looking for doesn't exist.",
    categories: {
      technical: 'Technical',
      'non-fiction': 'Non-fiction',
      fiction: 'Fiction',
      garbage: 'Garbage',
    },
    status: { read: 'Read', reading: 'Reading', want: 'Want' },
    plateCredit: 'Plate',
  },
} as const;

/** Metadata is always Latin, so dates are always formatted ISO-ish. */
export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * URL prefix for a language. English is the default and owns the root; Arabic
 * lives under /ar. Like slugOf(), this must be the only place that decides it.
 */
export function baseFor(lang: Lang): string {
  return lang === 'en' ? '' : '/ar';
}

/**
 * Content ids carry the folder they were filed under — `ar/the-last-of-us`,
 * `technical/sicp`. That folder is metadata (language, category), never part
 * of the URL.
 *
 * Every href AND every getStaticPaths must derive its slug from this one
 * function. They were computed independently before, drifted apart, and every
 * single post and book link 404'd as a result.
 */
export function slugOf(id: string): string {
  return id.replace(/^[^/]+\//, '');
}

export const CATEGORY_ORDER = ['technical', 'non-fiction', 'fiction', 'garbage'] as const;
