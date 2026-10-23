import { z } from 'zod';
import { chatJson, AiUnavailableError } from './ollama.js';
import * as repo from '../repositories/productRepository.js';

// What the LLM (or the fallback parser) is allowed to ask for. Everything is re-validated here.
const criteriaSchema = z.object({
  category: z.string().trim().max(50).nullish(),
  keywords: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
  maxPrice: z.number().positive().max(10_000_000).nullish(),
  minPrice: z.number().nonnegative().max(10_000_000).nullish(),
  inStockOnly: z.boolean().default(false),
  storeCode: z.string().trim().max(30).nullish(),
});

const STOPWORDS = new Set(['find', 'me', 'a', 'an', 'the', 'under', 'below', 'above', 'over', 'less', 'than', 'more', 'which', 'are', 'is',
  'available', 'in', 'stock', 'for', 'with', 'good', 'best', 'show', 'i', 'want', 'need', 'looking', 'to', 'buy', 'any', 'of', 'at', 'store',
  'what', 'do', 'you', 'have', 'got', 'around', 'budget', 'rs', 'inr', 'please', 'can', 'get', 'my', 'and', 'on', 'only', 'some']);

const CATEGORY_ALIASES = { laptops: 'laptop', notebook: 'laptop', notebooks: 'laptop', headphone: 'headphones', earphones: 'earbuds',
  earphone: 'earbuds', earbud: 'earbuds', phone: 'smartphone', phones: 'smartphone', smartphones: 'smartphone', mobile: 'smartphone',
  mobiles: 'smartphone', tablets: 'tablet', watch: 'smartwatch', watches: 'smartwatch', smartwatches: 'smartwatch', speakers: 'speaker',
  monitors: 'monitor', cameras: 'camera', keyboard: 'accessory', mouse: 'accessory', accessories: 'accessory' };

export function parsePrice(text) {
  const m = text.toLowerCase().replace(/[,₹]/g, '').match(/(under|below|less than|upto|up to|within|max(?:imum)?|over|above|more than|around)?\s*(?:rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|lakh|lac)?\b/);
  if (!m || m[2] === undefined) return {};
  let n = parseFloat(m[2]);
  if (m[3] === 'k') n *= 1000;
  if (m[3] === 'lakh' || m[3] === 'lac') n *= 100000;
  if (n < 100) return {}; // ignore things like "14 inch"
  const op = m[1] ?? '';
  if (/over|above|more than/.test(op)) return { minPrice: n };
  return { maxPrice: n };
}

/** Deterministic interpretation used when Ollama is unavailable. */
export function fallbackCriteria(message, categories, stores) {
  const lower = message.toLowerCase();
  const words = lower.match(/[a-z0-9]+/g) ?? [];
  let category = null;
  for (const w of words) {
    const c = CATEGORY_ALIASES[w] ?? w;
    if (categories.includes(c)) { category = c; break; }
  }
  const storeCode = stores.find((s) => lower.includes(s.city.toLowerCase()) || lower.includes(s.code.toLowerCase()))?.code ?? null;
  const keywords = words.filter((w) => !STOPWORDS.has(w) && w.length > 2 && !/^\d+k?$/.test(w) && (CATEGORY_ALIASES[w] ?? w) !== category && w !== storeCode?.toLowerCase() && !stores.some((st) => st.city.toLowerCase() === w));
  return { category, keywords: keywords.slice(0, 5), inStockOnly: /in stock|available|availability/.test(lower), storeCode, ...parsePrice(message) };
}

async function interpret(message, categories, stores) {
  const system = `You convert a shopping request into search criteria. Reply with JSON only:
{"category": string|null, "keywords": string[], "maxPrice": number|null, "minPrice": number|null, "inStockOnly": boolean, "storeCode": string|null}
Prices are Indian rupees as plain numbers (70k = 70000). category must be one of: ${categories.join(', ')} (or null).
storeCode must be one of: ${stores.map((s) => `${s.code} (${s.city})`).join(', ')} (or null). Do not invent products or prices.`;
  return chatJson(system, message);
}

/** Deterministic relevance + availability ranking. Higher score is better. */
export function rank(products, criteria) {
  const kws = criteria.keywords.map((k) => k.toLowerCase());
  const scored = products.map((p) => {
    const hay = `${p.name} ${p.brand ?? ''} ${p.category ?? ''} ${p.description ?? ''}`.toLowerCase();
    const hits = kws.filter((k) => hay.includes(k)).length;
    let score = hits * 10 + (p.inStock ? 20 : 0) + Math.min(p.stockQuantity, 10) * 0.5;
    if (criteria.maxPrice) score += (p.price / criteria.maxPrice) * 5; // closer to budget = more capable
    return { ...p, score: Math.round(score * 10) / 10 };
  });
  return scored.sort((a, b) => b.score - a.score || a.price - b.price || a.id - b.id);
}

function templateReason(p, criteria) {
  const parts = [];
  if (p.inStock) parts.push(`${p.stockQuantity} in stock at ${p.storeName}`); else parts.push(`currently out of stock at ${p.storeName}`);
  if (criteria.maxPrice && p.price <= criteria.maxPrice) parts.push(`within your budget of ₹${criteria.maxPrice.toLocaleString('en-IN')}`);
  return `${parts.join(', ')}.`;
}

// Small local models drift: they restate prices, invent specs or contradict the ranking.
// Accept an LLM sentence only if it has no digits/currency/price/stock talk and is short.
const UNSAFE_WHY = /[\d₹$]|\b(rs|inr|rupees?|price[sd]?|cost|cheap|budget|stock|storage|available|under|below|over|above)\b/i;
const isSafeWhy = (t) => typeof t === 'string' && t.length >= 10 && t.length <= 200 && !UNSAFE_WHY.test(t);

// Returns Map<sku, sentence>. Products are numbered so a small model cannot get ids wrong;
// partial or unusable output is fine (callers keep the deterministic text).
async function explain(message, picks) {
  const uniq = [...new Map(picks.map((p) => [p.sku, p])).values()];
  const facts = uniq.map((p, i) => ({ n: i + 1, name: p.name, description: p.description }));
  const system = `You help shoppers. For each numbered product write one friendly sentence (max 18 words) explaining why it fits the shopper's request, based on its description. No prices, no stock, no digits.
Example output: {"reasons":[{"n":1,"why":"Its light, portable design suits people who travel often."}]}
Reply with JSON only, one entry per product.`;
  const out = await chatJson(system, JSON.stringify({ request: message, products: facts }));
  const { reasons } = z.object({ reasons: z.array(z.object({ n: z.number(), why: z.string() })).default([]) }).parse(out);
  const bySku = new Map();
  for (const r of reasons) {
    const p = uniq[r.n - 1];
    if (p && isSafeWhy(r.why) && !bySku.has(p.sku)) bySku.set(p.sku, r.why.trim());
  }
  return bySku;
}

export async function recommend(message) {
  const [categories, stores] = await Promise.all([repo.listCategories(), repo.listStores()]);
  const storeCodes = new Set(stores.map((s) => s.code));
  let source = 'ollama';
  let notice = null;
  let criteria;

  try {
    criteria = criteriaSchema.parse(await interpret(message, categories, stores));
    if (criteria.category && !categories.includes(criteria.category.toLowerCase())) criteria.category = null;
    if (criteria.storeCode && !storeCodes.has(criteria.storeCode)) criteria.storeCode = null;
  } catch (err) {
    if (!(err instanceof AiUnavailableError) && !(err instanceof z.ZodError)) throw err;
    source = 'fallback';
    notice = err instanceof AiUnavailableError ? err.message : 'The model returned unusable criteria.';
    criteria = criteriaSchema.parse(fallbackCriteria(message, categories, stores));
  }

  // Backend enforces all filters; the LLM never touches the database.
  const candidates = await repo.findCandidates({
    category: criteria.category ?? undefined,
    storeCode: criteria.storeCode ?? undefined,
    minPrice: criteria.minPrice ?? undefined,
    maxPrice: criteria.maxPrice ?? undefined,
    inStock: criteria.inStockOnly ? true : undefined,
  });
  const ranked = rank(candidates, criteria);
  // With keywords and no category, require at least one keyword hit so results are relevant.
  const relevant = !criteria.category && criteria.keywords.length
    ? ranked.filter((p) => criteria.keywords.some((k) => `${p.name} ${p.brand} ${p.category} ${p.description}`.toLowerCase().includes(k.toLowerCase())))
    : ranked;
  const picks = relevant.slice(0, 5);

  let summary = picks.length
    ? `Found ${relevant.length} matching listing(s); showing the top ${picks.length}.`
    : 'No products match those criteria. Try a higher budget or a different category.';
  const reasons = new Map(picks.map((p) => [p.id, templateReason(p, criteria)]));

  if (source === 'ollama' && picks.length) {
    try {
      const why = await explain(message, picks);
      for (const p of picks) {
        // Keep the deterministic facts (stock, store, budget) and prepend the vetted AI sentence.
        if (why.has(p.sku)) reasons.set(p.id, `${why.get(p.sku)} ${reasons.get(p.id)}`);
      }
    } catch (err) {
      if (!(err instanceof AiUnavailableError) && !(err instanceof z.ZodError)) throw err;
      notice = 'Search used the AI model, but the explanation step failed; showing standard descriptions.';
    }
  }

  return {
    source, notice, criteria, summary,
    products: picks.map((p) => ({ ...p, reason: reasons.get(p.id) })),
  };
}
