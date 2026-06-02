const natural = require('natural');

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

const POSSIBLE_MATCH_THRESHOLD = 0.45;
const DUPLICATE_CONFIDENCE_THRESHOLD = 85;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has',
  'can', 'could', 'did', 'do', 'does', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'me', 'my', 'of',
  'on', 'or', 'our', 'please', 'should', 'that', 'the', 'their', 'there',
  'this', 'to', 'us', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'would',
  'with', 'you', 'your'
]);

const PHRASE_REPLACEMENTS = [
  [/no objection certificate/g, 'noc'],
  [/offer letter/g, 'offerletter'],
  [/start date/g, 'startdate'],
  [/due date/g, 'deadline'],
  [/last date/g, 'deadline'],
  [/cut off/g, 'deadline'],
  [/google doc/g, 'googledoc'],
  [/zoom meeting/g, 'zoomlink'],
  [/zoom link/g, 'zoomlink'],
  [/live session/g, 'livesession'],
  [/ai fundamentals/g, 'aifundamentals'],
  [/vicharanashala internship/g, 'vins'],
  [/summer research internship/g, 'summership']
];

const SYNONYMS = new Map([
  ['programme', 'program'],
  ['programmes', 'program'],
  ['programs', 'program'],
  ['internships', 'internship'],
  ['vicharanashala', 'vins'],
  ['payment', 'stipend'],
  ['paid', 'stipend'],
  ['salary', 'stipend'],
  ['money', 'stipend'],
  ['certification', 'certificate'],
  ['certificates', 'certificate'],
  ['holiday', 'leave'],
  ['holidays', 'leave'],
  ['absence', 'leave'],
  ['exemption', 'leave'],
  ['relaxation', 'leave'],
  ['break', 'leave'],
  ['begin', 'start'],
  ['begins', 'start'],
  ['joining', 'start'],
  ['join', 'start'],
  ['commence', 'start'],
  ['duration', 'length'],
  ['long', 'length'],
  ['deadline', 'deadline'],
  ['cutoff', 'deadline'],
  ['submit', 'upload'],
  ['submitted', 'upload'],
  ['submission', 'upload'],
  ['send', 'upload'],
  ['sent', 'upload'],
  ['mentor', 'mentor'],
  ['supervisor', 'mentor'],
  ['guide', 'mentor'],
  ['laptop', 'laptop'],
  ['computer', 'laptop'],
  ['pc', 'laptop'],
  ['recorded', 'recording'],
  ['recordings', 'recording'],
  ['whatsapp', 'whatsapp'],
  ['mail', 'email'],
  ['gmail', 'email'],
  ['e-mail', 'email'],
  ['replying', 'reply'],
  ['put', 'write'],
  ['entered', 'write'],
  ['enter', 'write'],
  ['url', 'link'],
  ['acceptance', 'accept'],
  ['accepted', 'accept'],
  ['confirmation', 'confirm'],
  ['confirmed', 'confirm']
]);

const ENTITY_TERMS = new Set([
  'aifundamentals', 'certificate', 'class', 'deadline', 'email', 'exam',
  'github', 'googledoc', 'internship', 'leave', 'length', 'livesession',
  'mentor', 'noc', 'offerletter', 'rosetta', 'stipend', 'summership',
  'vibe', 'vins', 'vise', 'whatsapp', 'zoom', 'zoomlink'
]);

const INTENTS = [
  { name: 'definition', terms: ['what', 'meaning', 'explain', 'about'] },
  { name: 'timing', terms: ['when', 'date', 'start', 'deadline', 'length'] },
  { name: 'eligibility', terms: ['eligible', 'eligibility', 'allowed', 'can'] },
  { name: 'process', terms: ['how', 'upload', 'download', 'submit', 'get'] },
  { name: 'permission', terms: ['can', 'allowed', 'permit', 'permission'] },
  { name: 'status', terms: ['status', 'marked', 'selected', 'complete'] }
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBase(text) {
  let normalized = String(text || '')
    .toLowerCase()
    .replace(/^\s*\d+(?:\.\d+)*\s*/, ' ')
    .replace(/[']/g, '')
    .trim();

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(text) {
  return tokenizer
    .tokenize(normalizeBase(text))
    .map((token) => SYNONYMS.get(token) || token)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function getNgrams(text, size = 3) {
  const compact = text.replace(/\s+/g, ' ');
  if (compact.length <= size) return compact ? [compact] : [];

  const grams = [];
  for (let i = 0; i <= compact.length - size; i += 1) {
    grams.push(compact.slice(i, i + size));
  }
  return grams;
}

function countMap(items) {
  return items.reduce((acc, item) => {
    acc.set(item, (acc.get(item) || 0) + 1);
    return acc;
  }, new Map());
}

function cosineMap(a, b) {
  if (a.size === 0 || b.size === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const [key, value] of a) {
    magA += value * value;
    dot += value * (b.get(key) || 0);
  }

  for (const value of b.values()) {
    magB += value * value;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function diceScore(aItems, bItems) {
  const a = new Set(aItems);
  const b = new Set(bItems);
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }

  return (2 * intersection) / (a.size + b.size);
}

function overlapScore(aItems, bItems) {
  const a = new Set(aItems);
  const b = new Set(bItems);
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }

  return intersection / Math.min(a.size, b.size);
}

function softTokenScore(aTokens, bTokens) {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;

  const longer = aTokens.length >= bTokens.length ? aTokens : bTokens;
  const shorter = longer === aTokens ? bTokens : aTokens;
  let matches = 0;

  for (const token of shorter) {
    const best = longer.reduce((max, candidate) => {
      if (token === candidate) return 1;
      return Math.max(max, natural.JaroWinklerDistance(token, candidate));
    }, 0);

    if (best >= 0.88) matches += best;
  }

  return matches / longer.length;
}

function lcsScore(aTokens, bTokens) {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;

  const rows = aTokens.length + 1;
  const cols = bTokens.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      dp[i][j] = aTokens[i - 1] === bTokens[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[aTokens.length][bTokens.length] / Math.min(aTokens.length, bTokens.length);
}

function detectIntent(rawTokens, tokens) {
  const allTokens = new Set([...rawTokens, ...tokens]);
  let bestIntent = null;
  let bestHits = 0;

  for (const intent of INTENTS) {
    const hits = intent.terms.filter((term) => allTokens.has(term)).length;
    if (hits > bestHits) {
      bestIntent = intent.name;
      bestHits = hits;
    }
  }

  return bestIntent;
}

function buildProfile(text) {
  const rawTokens = tokenizer.tokenize(normalizeBase(text));
  const tokens = getTokens(text);
  const stems = tokens.map((token) => stemmer.stem(token));
  const canonicalText = tokens.join(' ');
  const stemText = stems.join(' ');
  const entities = tokens.filter((token) => ENTITY_TERMS.has(token));

  return {
    canonicalText,
    entities,
    intent: detectIntent(rawTokens, tokens),
    ngrams: countMap(getNgrams(canonicalText)),
    rawTokens,
    stemText,
    stems,
    tokens,
    tokenMap: countMap(stems)
  };
}

function confidenceFromScore(score) {
  if (score <= 0) return 0;
  if (score >= 0.99) return 99;

  return Math.round(100 * (1 - Math.pow(1 - score, 1.8)));
}

function compareQuestions(inputText, existingText) {
  const input = buildProfile(inputText);
  const existing = buildProfile(existingText);

  if (!input.canonicalText || !existing.canonicalText) {
    return {
      confidence: 0,
      isDuplicate: false,
      isPossibleMatch: false,
      reasons: [],
      score: 0
    };
  }

  if (input.canonicalText === existing.canonicalText || input.stemText === existing.stemText) {
    return {
      confidence: 99,
      isDuplicate: true,
      isPossibleMatch: true,
      reasons: ['Exact normalized match'],
      score: 1
    };
  }

  const tokenDice = diceScore(input.stems, existing.stems);
  const tokenOverlap = overlapScore(input.stems, existing.stems);
  const characterScore = cosineMap(input.ngrams, existing.ngrams);
  const tokenCosine = cosineMap(input.tokenMap, existing.tokenMap);
  const softScore = softTokenScore(input.tokens, existing.tokens);
  const sequenceScore = lcsScore(input.stems, existing.stems);

  const shorterText = input.stemText.length <= existing.stemText.length ? input.stemText : existing.stemText;
  const longerText = shorterText === input.stemText ? existing.stemText : input.stemText;
  const containmentScore = shorterText.length > 7 && longerText.includes(shorterText) ? 0.92 : 0;

  let score = Math.max(
    containmentScore,
    (tokenDice * 0.28)
      + (tokenOverlap * 0.18)
      + (characterScore * 0.18)
      + (tokenCosine * 0.16)
      + (softScore * 0.12)
      + (sequenceScore * 0.08)
  );

  const entityDice = diceScore(input.entities, existing.entities);
  const hasInputEntities = input.entities.length > 0;
  const hasExistingEntities = existing.entities.length > 0;

  if (entityDice > 0) score += 0.08 + (entityDice * 0.04);
  if (input.intent && input.intent === existing.intent) score += 0.04;
  if (hasInputEntities && hasExistingEntities && entityDice === 0) score -= 0.08;

  score = clamp(score);

  const reasons = [];
  if (containmentScore > 0) reasons.push('One question contains the other after cleanup');
  if (entityDice > 0) reasons.push('Same key topic');
  if (input.intent && input.intent === existing.intent) reasons.push('Same question intent');
  if (tokenOverlap >= 0.75) reasons.push('Strong keyword overlap');
  if (characterScore >= 0.65) reasons.push('Very similar wording');

  const confidence = confidenceFromScore(score);

  return {
    confidence,
    isDuplicate: confidence > DUPLICATE_CONFIDENCE_THRESHOLD,
    isPossibleMatch: score >= POSSIBLE_MATCH_THRESHOLD,
    reasons,
    score
  };
}

module.exports = {
  DUPLICATE_CONFIDENCE_THRESHOLD,
  POSSIBLE_MATCH_THRESHOLD,
  compareQuestions,
  confidenceFromScore
};
