/**
 * Local-dialect translation utility — purely client-side, no external API.
 *
 * Supported dialects:
 *   • Tagalog  (tl) — the base of Filipino, most widely understood
 *   • Cebuano  (ceb) — Visayas / Mindanao lingua franca
 *   • Ilocano  (ilo) — Northern Luzon
 *
 * Strategy: bidirectional word-substitution dictionaries.
 * Each entry maps an English phrase/word → a dialect equivalent.
 * The engine replaces the longest matching phrases first (greedy), then
 * single-word tokens, so "very good" beats "good" when present.
 *
 * This is intentionally a lightweight approximation — good enough for a
 * museum guide admin dashboard where admins want a quick sense of what a
 * comment says in a local dialect.  For production-grade translation a
 * cloud NMT service would be more accurate.
 */

export type DialectCode = "tl" | "ceb" | "ilo" | "hil";

export const DIALECT_META: Record<
  DialectCode,
  { name: string; nativeName: string; flag: string }
> = {
  tl: { name: "Tagalog", nativeName: "Tagalog", flag: "🇵🇭" },
  ceb: { name: "Bisaya", nativeName: "Bisaya", flag: "🇵🇭" },
  ilo: { name: "Ilocano", nativeName: "Ilokano", flag: "🇵🇭" },
  hil: { name: "Hiligaynon", nativeName: "Ilonggo", flag: "🇵🇭" },
};

// ─── Dictionaries ──────────────────────────────────────────────────────────────
// Format: [ ["english phrase", "dialect equivalent"], … ]
// Order matters — place longer phrases before shorter ones for greedy matching.

type Dict = [string, string][];

const TL_DICT: Dict = [
  // Greetings & courtesy
  ["good morning", "magandang umaga"],
  ["good afternoon", "magandang hapon"],
  ["good evening", "magandang gabi"],
  ["good night", "magandang gabi"],
  ["thank you very much", "maraming salamat"],
  ["thank you", "salamat"],
  ["you're welcome", "walang anuman"],
  ["excuse me", "mawalang-galang na"],
  ["i'm sorry", "paumanhin"],
  ["sorry", "sorry"],
  ["hello", "kumusta"],
  ["how are you", "kumusta ka"],
  ["goodbye", "paalam"],
  // Museum / artifact context
  ["the museum is", "ang museo ay"],
  ["museum", "museo"],
  ["artifact", "artefakto"],
  ["artifacts", "mga artefakto"],
  ["exhibit", "eksibisyon"],
  ["exhibition", "eksibisyon"],
  ["tour", "paglilibot"],
  ["guide", "gabay"],
  ["history", "kasaysayan"],
  ["historical", "pangkasaysayan"],
  ["culture", "kultura"],
  ["cultural", "pangkultura"],
  ["heritage", "pamana"],
  ["ancient", "sinaunang"],
  ["collection", "koleksyon"],
  ["display", "pagtatanghal"],
  // Sentiment
  ["very beautiful", "napakaganda"],
  ["very good", "napakagaling"],
  ["excellent", "kahanga-hanga"],
  ["outstanding", "natatangi"],
  ["amazing", "kamangha-mangha"],
  ["wonderful", "kahanga-hanga"],
  ["fantastic", "kahanga-hanga"],
  ["great", "magaling"],
  ["good", "maganda"],
  ["beautiful", "maganda"],
  ["interesting", "kawili-wili"],
  ["informative", "mapagbigay-kaalaman"],
  ["educational", "pangmapa-aralan"],
  ["enjoyable", "kasiya-siya"],
  ["enjoyed", "nasiyahan"],
  ["enjoy", "masisiyahan"],
  ["love", "mahal"],
  ["loved", "mahal"],
  ["impressive", "kahanga-hanga"],
  ["clean", "malinis"],
  ["organized", "maayos"],
  ["friendly", "magiliw"],
  ["helpful", "nakakatulong"],
  ["welcoming", "mapagtaganggap"],
  ["bad", "masama"],
  ["terrible", "kakila-kilabot"],
  ["poor", "mahirap"],
  ["boring", "nakakaantok"],
  ["dirty", "marumi"],
  ["crowded", "masiksik"],
  ["confusing", "nakakalito"],
  ["expensive", "mahal"],
  ["slow", "mabagal"],
  // Common verbs
  ["recommend", "irerekomenda"],
  ["visit", "bisitahin"],
  ["visited", "binisita"],
  ["see", "makita"],
  ["learn", "matuto"],
  ["learned", "natuto"],
  ["explore", "tuklasin"],
  ["explore", "tuklasin"],
  ["read", "basahin"],
  ["listen", "makinig"],
  ["watch", "manood"],
  // Nouns
  ["staff", "kawani"],
  ["entrance", "pasukan"],
  ["ticket", "tiket"],
  ["children", "mga bata"],
  ["family", "pamilya"],
  ["group", "grupo"],
  ["school", "paaralan"],
  ["students", "mga mag-aaral"],
  ["place", "lugar"],
  ["area", "lugar"],
  ["floor", "palapag"],
  ["room", "silid"],
  ["lighting", "ilaw"],
  ["signage", "karatula"],
  // Pronouns / connectors
  ["the", "ang"],
  ["a", "isang"],
  ["an", "isang"],
  ["is", "ay"],
  ["are", "ay"],
  ["was", "ay"],
  ["it", "ito"],
  ["this", "ito"],
  ["that", "iyon"],
  ["and", "at"],
  ["or", "o"],
  ["but", "pero"],
  ["for", "para sa"],
  ["of", "ng"],
  ["in", "sa"],
  ["at", "sa"],
  ["on", "sa"],
  ["with", "kasama"],
  ["not", "hindi"],
  ["no", "hindi"],
  ["very", "napaka"],
  ["really", "talaga"],
  ["so", "kaya"],
  ["also", "pati na rin"],
  ["more", "higit pa"],
  ["most", "pinaka"],
  ["some", "ilang"],
  ["all", "lahat"],
  ["many", "marami"],
  ["few", "kaunti"],
  ["i", "ako"],
  ["we", "kami"],
  ["my", "aking"],
  ["our", "aming"],
  ["you", "ikaw"],
  ["your", "iyong"],
  ["they", "sila"],
  ["their", "kanilang"],
  ["here", "dito"],
  ["there", "doon"],
  ["when", "kailan"],
  ["where", "saan"],
  ["why", "bakit"],
  ["how", "paano"],
  ["what", "ano"],
  ["who", "sino"],
  ["would", "magiging"],
  ["should", "dapat"],
  ["can", "maaari"],
  ["will", "magiging"],
  ["have", "mayroon"],
  ["has", "mayroon"],
  ["had", "nagkaroon"],
];

const CEB_DICT: Dict = [
  // Greetings & courtesy
  ["good morning", "maayong buntag"],
  ["good afternoon", "maayong hapon"],
  ["good evening", "maayong gabii"],
  ["good night", "maayong gabii"],
  ["thank you very much", "daghan kaayo salamat"],
  ["thank you", "salamat"],
  ["you're welcome", "walay sapayan"],
  ["excuse me", "dispensa"],
  ["i'm sorry", "pasaylo"],
  ["sorry", "sorry"],
  ["hello", "kumusta"],
  ["how are you", "kumusta ka"],
  ["goodbye", "amping"],
  // Museum / artifact context
  ["museum", "museo"],
  ["artifact", "artefakto"],
  ["artifacts", "mga artefakto"],
  ["exhibit", "eksibisyon"],
  ["exhibition", "eksibisyon"],
  ["tour", "paglibot"],
  ["guide", "giya"],
  ["history", "kasaysayan"],
  ["historical", "makasaysayan"],
  ["culture", "kultura"],
  ["cultural", "kultural"],
  ["heritage", "panulondon"],
  ["ancient", "karaan"],
  ["collection", "koleksyon"],
  // Sentiment
  ["very beautiful", "kaayo nindot"],
  ["very good", "kaayo maayo"],
  ["excellent", "maayo kaayo"],
  ["outstanding", "piling-pili"],
  ["amazing", "katingad-an"],
  ["wonderful", "kamangha-mangha"],
  ["fantastic", "nindot kaayo"],
  ["great", "maayo"],
  ["good", "maayo"],
  ["beautiful", "nindot"],
  ["interesting", "makapainteres"],
  ["informative", "makapag-imporma"],
  ["educational", "makapadugang og kahibalo"],
  ["enjoyable", "makalingaw"],
  ["enjoyed", "nalingawan"],
  ["enjoy", "maglingaw"],
  ["love", "higugma"],
  ["loved", "gihigugma"],
  ["impressive", "impresibo"],
  ["clean", "limpyo"],
  ["organized", "maayo"],
  ["friendly", "maaghop"],
  ["helpful", "makatabang"],
  ["welcoming", "maayong pagdawat"],
  ["bad", "daotan"],
  ["terrible", "makahadlok"],
  ["poor", "luya"],
  ["boring", "boring"],
  ["dirty", "hugaw"],
  ["crowded", "puno"],
  ["confusing", "makalibog"],
  ["expensive", "mahal"],
  ["slow", "hinay"],
  // Common verbs
  ["recommend", "irekomenda"],
  ["visit", "bisitahan"],
  ["visited", "gibisita"],
  ["see", "makita"],
  ["learn", "matun-an"],
  ["learned", "natun-an"],
  ["explore", "tuklasin"],
  // Nouns
  ["staff", "kawani"],
  ["entrance", "pultahan"],
  ["ticket", "tiket"],
  ["children", "mga bata"],
  ["family", "pamilya"],
  ["group", "grupo"],
  ["school", "eskwelahan"],
  ["students", "mga estudyante"],
  ["place", "lugar"],
  ["floor", "salog"],
  ["room", "kwarto"],
  // Connectors
  ["the", "ang"],
  ["a", "usa"],
  ["an", "usa"],
  ["is", "mao"],
  ["are", "mao"],
  ["it", "kini"],
  ["this", "kini"],
  ["that", "kana"],
  ["and", "ug"],
  ["or", "o"],
  ["but", "apan"],
  ["for", "para sa"],
  ["of", "sa"],
  ["in", "sa"],
  ["at", "sa"],
  ["on", "sa"],
  ["with", "uban"],
  ["not", "dili"],
  ["no", "dili"],
  ["very", "kaayo"],
  ["really", "gyud"],
  ["so", "mao nga"],
  ["also", "pati"],
  ["more", "pa"],
  ["most", "pinaka"],
  ["many", "daghan"],
  ["few", "gamay"],
  ["i", "ako"],
  ["we", "kami"],
  ["my", "akong"],
  ["our", "among"],
  ["you", "ikaw"],
  ["they", "sila"],
  ["here", "dinhi"],
  ["there", "didto"],
];

const ILO_DICT: Dict = [
  // Greetings & courtesy
  ["good morning", "naimbag a bigat"],
  ["good afternoon", "naimbag a malem"],
  ["good evening", "naimbag a rabii"],
  ["good night", "naimbag a rabii"],
  ["thank you very much", "agyamanak unay"],
  ["thank you", "agyamanak"],
  ["you're welcome", "haan a naragsak"],
  ["excuse me", "dispensam"],
  ["i'm sorry", "dispensam"],
  ["sorry", "sorry"],
  ["hello", "kumusta"],
  ["how are you", "kumusta ka"],
  ["goodbye", "nagsardeng"],
  // Museum / artifact context
  ["museum", "museo"],
  ["artifact", "artefakto"],
  ["artifacts", "dagiti artefakto"],
  ["exhibit", "eksibisyon"],
  ["exhibition", "eksibisyon"],
  ["tour", "paglibas"],
  ["guide", "mangisuro"],
  ["history", "pakasaritaan"],
  ["historical", "maipanggep iti pakasaritaan"],
  ["culture", "kultura"],
  ["cultural", "kultural"],
  ["heritage", "naibati"],
  ["ancient", "daan"],
  ["collection", "koleksyon"],
  // Sentiment
  ["very beautiful", "napintas unay"],
  ["very good", "nasayaat unay"],
  ["excellent", "nalaing unay"],
  ["outstanding", "natatangi"],
  ["amazing", "kamangha-mangha"],
  ["wonderful", "naimbag unay"],
  ["fantastic", "nalaing"],
  ["great", "nasayaat"],
  ["good", "nasayaat"],
  ["beautiful", "napintas"],
  ["interesting", "makainawa"],
  ["informative", "napno ti impormasyon"],
  ["educational", "makaisuro"],
  ["enjoyable", "naaragsak"],
  ["enjoyed", "naaragsak"],
  ["enjoy", "maragsakan"],
  ["love", "pagyaem"],
  ["loved", "pinagyaeman"],
  ["impressive", "impresibo"],
  ["clean", "nadalus"],
  ["organized", "naurnos"],
  ["friendly", "nasingpet"],
  ["helpful", "nakatulong"],
  ["welcoming", "namiminan"],
  ["bad", "dakes"],
  ["terrible", "nakarkaro"],
  ["poor", "nabannog"],
  ["boring", "boring"],
  ["dirty", "narugit"],
  ["crowded", "napuno"],
  ["confusing", "makalilong"],
  ["expensive", "nangina"],
  ["slow", "nalamiis"],
  // Common verbs
  ["recommend", "irekomenda"],
  ["visit", "bisitaen"],
  ["visited", "nabisita"],
  ["see", "makita"],
  ["learn", "masikog"],
  ["learned", "nasikogan"],
  ["explore", "mabirbirok"],
  // Nouns
  ["staff", "kawani"],
  ["entrance", "ruangan"],
  ["ticket", "tiket"],
  ["children", "dagiti anak"],
  ["family", "pamilia"],
  ["group", "grupo"],
  ["school", "eskuela"],
  ["students", "dagiti estudyante"],
  ["place", "lugar"],
  ["floor", "sagunay"],
  ["room", "kuarto"],
  // Connectors
  ["the", "ti"],
  ["a", "ti"],
  ["an", "ti"],
  ["is", "ket"],
  ["are", "ket"],
  ["it", "daytoy"],
  ["this", "daytoy"],
  ["that", "daydiay"],
  ["and", "ken"],
  ["or", "wenno"],
  ["but", "ngem"],
  ["for", "para"],
  ["of", "ti"],
  ["in", "iti"],
  ["at", "iti"],
  ["on", "iti"],
  ["with", "kadagiti"],
  ["not", "saan"],
  ["no", "saan"],
  ["very", "unay"],
  ["really", "talaga"],
  ["also", "met"],
  ["more", "pay"],
  ["many", "adu"],
  ["few", "bassit"],
  ["i", "siak"],
  ["we", "datayo"],
  ["my", "ti"],
  ["our", "ti"],
  ["you", "sika"],
  ["they", "isuda"],
  ["here", "ditoy"],
  ["there", "dita"],
];

const HIL_DICT: Dict = [
  // Greetings & courtesy
  ["good morning", "maayong aga"],
  ["good afternoon", "maayong hapon"],
  ["good evening", "maayong gab-i"],
  ["good night", "maayong gab-i"],
  ["thank you very much", "damo gid nga salamat"],
  ["thank you", "salamat"],
  ["you're welcome", "wala sing anuman"],
  ["excuse me", "dispensa na"],
  ["i'm sorry", "pasensya na"],
  ["sorry", "sorry"],
  ["hello", "kamusta"],
  ["how are you", "kamusta ka"],
  ["goodbye", "adios"],
  // Museum / artifact context
  ["museum", "museo"],
  ["artifact", "artefakto"],
  ["artifacts", "mga artefakto"],
  ["exhibit", "eksibisyon"],
  ["exhibition", "eksibisyon"],
  ["tour", "paglibot"],
  ["guide", "giya"],
  ["history", "kasaysayan"],
  ["historical", "makasaysayan"],
  ["culture", "kultura"],
  ["cultural", "kultural"],
  ["heritage", "manunubos"],
  ["ancient", "daan"],
  ["collection", "koleksyon"],
  // Sentiment
  ["very beautiful", "matahom gid"],
  ["very good", "maayo gid"],
  ["excellent", "maayo gid kaayo"],
  ["outstanding", "natatangi"],
  ["amazing", "katingad-an"],
  ["wonderful", "kamangha-mangha"],
  ["fantastic", "matahom gid"],
  ["great", "maayo"],
  ["good", "maayo"],
  ["beautiful", "matahom"],
  ["interesting", "makapainteres"],
  ["informative", "puno sing impormasyon"],
  ["educational", "makapadugang sang kaalaman"],
  ["enjoyable", "makalingaw"],
  ["enjoyed", "nalingawan"],
  ["enjoy", "maglingaw"],
  ["love", "gugma"],
  ["loved", "ginagugma"],
  ["impressive", "impresibo"],
  ["clean", "limpyo"],
  ["organized", "maayos"],
  ["friendly", "maabtik"],
  ["helpful", "makatabang"],
  ["welcoming", "mainugon"],
  ["bad", "malain"],
  ["terrible", "makahadlok"],
  ["poor", "luya"],
  ["boring", "boring"],
  ["dirty", "mahugaw"],
  ["crowded", "puno"],
  ["confusing", "nakakalibog"],
  ["expensive", "mahal"],
  ["slow", "hinay"],
  // Common verbs
  ["recommend", "irekomenda"],
  ["visit", "bisitahan"],
  ["visited", "ginbisita"],
  ["see", "makita"],
  ["learn", "matunan"],
  ["learned", "natunan"],
  ["explore", "tuklasin"],
  // Nouns
  ["staff", "kawani"],
  ["entrance", "puwertahan"],
  ["ticket", "tiket"],
  ["children", "mga bata"],
  ["family", "pamilya"],
  ["group", "grupo"],
  ["school", "eskwelahan"],
  ["students", "mga estudyante"],
  ["place", "lugar"],
  ["floor", "salog"],
  ["room", "kwarto"],
  // Connectors
  ["the", "ang"],
  ["a", "ang"],
  ["an", "ang"],
  ["is", "amo"],
  ["are", "amo"],
  ["it", "ini"],
  ["this", "ini"],
  ["that", "ina"],
  ["and", "kag"],
  ["or", "ukon"],
  ["but", "pero"],
  ["for", "para sa"],
  ["of", "sang"],
  ["in", "sa"],
  ["at", "sa"],
  ["on", "sa"],
  ["with", "kaupod"],
  ["not", "indi"],
  ["no", "indi"],
  ["very", "gid"],
  ["really", "talaga"],
  ["also", "man"],
  ["more", "pa"],
  ["many", "madamo"],
  ["few", "diutay"],
  ["i", "ako"],
  ["we", "kita"],
  ["my", "akon"],
  ["our", "aton"],
  ["you", "ikaw"],
  ["they", "sila"],
  ["here", "diri"],
  ["there", "didto"],
];

const DIALECT_DICTS: Record<DialectCode, Dict> = {
  tl: TL_DICT,
  ceb: CEB_DICT,
  ilo: ILO_DICT,
  hil: HIL_DICT,
};

// ─── Translation engine ────────────────────────────────────────────────────────

/**
 * Translate an English text string into a Philippine local dialect.
 *
 * @param text   - Source text (English).
 * @param target - Target dialect code.
 * @returns Translated string (may be partial — untranslated words are kept as-is).
 */
export function translate(text: string, target: DialectCode): string {
  if (!text || !text.trim()) return text;

  const dict = DIALECT_DICTS[target];

  // Sort by phrase length descending so multi-word entries take priority
  const sorted = [...dict].sort((a, b) => b[0].length - a[0].length);

  // Work on the lowercased version for matching, preserve a capitalization map
  const lower = text.toLowerCase();
  let result = lower;

  // Replace multi-word first, then single-word.
  // We use a placeholder trick to avoid re-matching already-translated text.
  const placeholders: string[] = [];

  for (const [eng, dialect] of sorted) {
    const escaped = eng.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(regex, () => {
      const idx = placeholders.length;
      placeholders.push(dialect);
      return `__DIALECT_PLACEHOLDER_${idx}__`;
    });
  }

  // Restore placeholders
  result = result.replace(
    /__DIALECT_PLACEHOLDER_(\d+)__/g,
    (_, idx) => placeholders[Number(idx)],
  );

  // Re-apply simple sentence capitalisation (first word after . ! ?)
  result = result.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_, sep, ch) => sep + ch.toUpperCase(),
  );

  return result;
}

/**
 * Detect whether a text is already primarily in a local dialect (heuristic).
 * Returns the most likely dialect code or null for English/unknown.
 */
export function detectDialect(text: string): DialectCode | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  const scores: Record<DialectCode, number> = { tl: 0, ceb: 0, ilo: 0, hil: 0 };

  // Sample dialect-specific marker words
  const markers: Record<DialectCode, string[]> = {
    tl: [
      "ang",
      "ng",
      "mga",
      "ay",
      "sa",
      "ko",
      "mo",
      "na",
      "hindi",
      "ito",
      "naman",
    ],
    ceb: [
      "ang",
      "og",
      "ug",
      "sa",
      "nindot",
      "maayo",
      "dili",
      "kini",
      "gyud",
      "kaayo",
    ],
    ilo: [
      "ti",
      "iti",
      "ken",
      "dagiti",
      "nasayaat",
      "agyamanak",
      "siak",
      "daytoy",
    ],
    hil: [
      "ang",
      "kag",
      "sang",
      "gid",
      "matahom",
      "maayo",
      "indi",
      "ini",
      "damo",
    ],
  };

  for (const [code, words] of Object.entries(markers) as [
    DialectCode,
    string[],
  ][]) {
    for (const w of words) {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = lower.match(new RegExp(`\\b${escaped}\\b`, "g"));
      if (matches) scores[code] += matches.length;
    }
  }

  const best = (Object.entries(scores) as [DialectCode, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return best[1] >= 2 ? best[0] : null;
}
