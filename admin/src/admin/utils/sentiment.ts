/**
 * Lightweight rule-based sentiment classifier.
 *
 * Works entirely client-side — no external API, no model download.
 * Classifies text as "positive" | "neutral" | "negative" using scored
 * keyword lists drawn from common English + Philippine-English expressions.
 *
 * Score interpretation:
 *   sum > THRESHOLD  → positive
 *   sum < -THRESHOLD → negative
 *   otherwise        → neutral
 */

export type Sentiment = "positive" | "neutral" | "negative";

export interface SentimentResult {
  sentiment: Sentiment;
  /** Raw numeric score (positive = good, negative = bad). */
  score: number;
  /** Number of tokens matched in each direction. */
  positiveHits: number;
  negativeHits: number;
}

// ─── Word lists ────────────────────────────────────────────────────────────────

const POSITIVE_WORDS: Record<string, number> = {
  // English — strong
  excellent: 3,
  outstanding: 3,
  amazing: 3,
  incredible: 3,
  fantastic: 3,
  superb: 3,
  wonderful: 3,
  exceptional: 3,
  brilliant: 3,
  spectacular: 3,
  // English — moderate
  great: 2,
  good: 2,
  awesome: 2,
  love: 2,
  loved: 2,
  beautiful: 2,
  impressed: 2,
  impressive: 2,
  perfect: 2,
  enjoy: 2,
  enjoyed: 2,
  happy: 2,
  delighted: 2,
  satisfied: 2,
  recommend: 2,
  recommended: 2,
  helpful: 2,
  informative: 2,
  educational: 2,
  interesting: 2,
  fascinating: 2,
  engaging: 2,
  welcoming: 2,
  friendly: 2,
  clean: 2,
  organized: 2,
  // English — mild
  nice: 1,
  okay: 1,
  fine: 1,
  decent: 1,
  liked: 1,
  fun: 1,
  cool: 1,
  pleasant: 1,
  worth: 1,
  worthwhile: 1,
  learned: 1,
  learn: 1,
  appreciate: 1,
  appreciated: 1,
  convenient: 1,
  accessible: 1,
  accommodating: 1,
  "well-maintained": 2,
  // Filipino / Taglish
  maganda: 2,
  ganda: 2,
  magaling: 2,
  astig: 2,
  galing: 2,
  masaya: 2,
  sulit: 2,
  swabe: 1,
  ayos: 1,
  okey: 1,
  "nag-enjoy": 2,
  "natutuwa": 2,
  "natuwa": 2,
  "gustong-gusto": 3,
  "gusto": 1,
  "magandang": 2,
  "napakaganda": 3,
  "napaka-ganda": 3,
  // Cebuano
  nindot: 2,
  maayo: 2,
  gwapa: 1,
  pogi: 1,
  kuyaw: 2,
  bongga: 2,
  tarong: 1,
  // Ilocano
  naragsak: 2,
  naimbag: 2,
  nasayaat: 2,
  nalaing: 2,
  nayon: 1,
};

const NEGATIVE_WORDS: Record<string, number> = {
  // English — strong
  terrible: -3,
  horrible: -3,
  awful: -3,
  dreadful: -3,
  disgusting: -3,
  appalling: -3,
  atrocious: -3,
  // English — moderate
  bad: -2,
  poor: -2,
  disappointing: -2,
  disappointed: -2,
  worst: -2,
  broken: -2,
  rude: -2,
  dirty: -2,
  crowded: -2,
  boring: -2,
  useless: -2,
  unhelpful: -2,
  disorganized: -2,
  overpriced: -2,
  expensive: -2,
  slow: -2,
  outdated: -2,
  uncomfortable: -2,
  misleading: -2,
  // English — mild
  okay: 0, // override positive; handled as neutral
  mediocre: -1,
  average: -1,
  lacking: -1,
  missing: -1,
  confusing: -1,
  unclear: -1,
  difficult: -1,
  messy: -1,
  noisy: -1,
  // Filipino / Taglish
  pangit: -2,
  masama: -2,
  mahal: -1,
  mainit: -1,
  makulit: -1,
  malungkot: -2,
  "hindi maganda": -2,
  "hindi magaling": -2,
  hindi: -1,
  wala: -1,
  "walang kwenta": -3,
  nakakabigo: -2,
  nakakairita: -2,
  "hindi sulit": -2,
  // Cebuano
  daotan: -2,
  "dili maayo": -2,
  "dili nindot": -2,
  makalagot: -2,
  // Ilocano
  narigat: -2,
  dakes: -2,
  "saan a naimbag": -3,
};

// Negation words that flip the sign of the next scored word
const NEGATORS = new Set([
  "not",
  "no",
  "never",
  "neither",
  "hardly",
  "barely",
  "scarcely",
  "without",
  "hindi",
  "wala",
  "dili",
  "saan",
]);

const THRESHOLD = 1;

// ─── Main function ─────────────────────────────────────────────────────────────

/**
 * Classify a piece of text.
 *
 * @param text - Raw comment or feedback text.
 * @returns SentimentResult
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text || !text.trim()) {
    return { sentiment: "neutral", score: 0, positiveHits: 0, negativeHits: 0 };
  }

  // Lowercase, remove punctuation except hyphens
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\- ]/g, " ");

  const tokens = cleaned.split(/\s+/).filter(Boolean);

  let score = 0;
  let positiveHits = 0;
  let negativeHits = 0;
  let negationActive = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (NEGATORS.has(token)) {
      negationActive = true;
      continue;
    }

    const posScore = POSITIVE_WORDS[token];
    const negScore = NEGATIVE_WORDS[token];

    if (posScore !== undefined && posScore !== 0) {
      const applied = negationActive ? -posScore : posScore;
      score += applied;
      if (applied > 0) positiveHits++;
      else negativeHits++;
      negationActive = false;
      continue;
    }

    if (negScore !== undefined && negScore !== 0) {
      const applied = negationActive ? -negScore : negScore;
      score += applied;
      if (applied < 0) negativeHits++;
      else positiveHits++;
      negationActive = false;
      continue;
    }

    // Any non-sentiment word resets short-distance negation after 2 tokens
    if (negationActive) {
      // allow negation to carry across one filler word then expire
      negationActive = false;
    }
  }

  const sentiment: Sentiment =
    score > THRESHOLD ? "positive" : score < -THRESHOLD ? "negative" : "neutral";

  return { sentiment, score, positiveHits, negativeHits };
}

/** Convenience: return only the label. */
export function getSentiment(text: string): Sentiment {
  return analyzeSentiment(text).sentiment;
}

/** Badge color mapping for use in UI components. */
export const SENTIMENT_STYLES: Record<
  Sentiment,
  { label: string; className: string }
> = {
  positive: {
    label: "Positive",
    className:
      "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
  },
  neutral: {
    label: "Neutral",
    className:
      "bg-muted/60 text-muted-foreground border-border",
  },
  negative: {
    label: "Negative",
    className:
      "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800",
  },
};
