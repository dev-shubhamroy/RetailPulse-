import { z } from 'zod';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { chatJson, embed, toVectorLiteral, AiUnavailableError } from './ollama.js';

const TOP_K = 4;

async function vectorSearch(question) {
  const [vec] = await embed([question]);
  const { rows } = await pool.query(
    `SELECT c.id, p.title, p.version, p.category, c.section, c.content, (c.embedding <=> $1::vector)::float8 AS distance
     FROM policy_chunks c JOIN policies p ON p.id = c.policy_id
     WHERE c.embedding IS NOT NULL AND c.embedding_model = $2
     ORDER BY c.embedding <=> $1::vector LIMIT ${TOP_K}`,
    [toVectorLiteral(vec), env.OLLAMA_EMBED_MODEL],
  );
  return rows;
}

// Keyword fallback (Postgres full-text) when embeddings/Ollama are unavailable.
async function keywordSearch(question) {
  const terms = (question.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2);
  if (!terms.length) return [];
  const { rows } = await pool.query(
    `SELECT c.id, p.title, p.version, p.category, c.section, c.content,
            ts_rank(to_tsvector('english', p.title || ' ' || c.section || ' ' || c.content), q)::float8 AS rank
     FROM policy_chunks c JOIN policies p ON p.id = c.policy_id, to_tsquery('english', $1) q
     WHERE to_tsvector('english', p.title || ' ' || c.section || ' ' || c.content) @@ q
     ORDER BY rank DESC LIMIT ${TOP_K}`,
    [[...new Set(terms)].join(' | ')],
  );
  return rows;
}

const toCitation = (c) => ({
  chunkId: Number(c.id), policy: c.title, version: c.version, section: c.section, excerpt: c.content,
});

const answerSchema = z.object({
  answerable: z.boolean(),
  answer: z.string().max(1500),
  quote: z.string().max(600).default(''),
  usedPassages: z.array(z.number()).default([]),
});

const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();

async function generate(question, chunks) {
  const system = `You answer retail policy questions using ONLY the numbered passages provided.
Rules: answer in one or two complete sentences. Prefer the most specific rule that matches the question (for example a rule naming the exact product type) over a general one.
"quote" must be copied word-for-word from ONE passage and must contain the fact your answer relies on.
If the passages do not clearly answer the question, set answerable=false. Never use outside knowledge or invent numbers, dates or terms.
Reply with JSON only: {"answerable": boolean, "answer": string, "quote": string, "usedPassages": number[]} where usedPassages lists the ids of passages you relied on.`;
  const passages = chunks.map((c) => `[id ${c.id}] ${c.title} v${c.version}, ${c.section}: ${c.content}`).join('\n');
  return answerSchema.parse(await chatJson(system, `Passages:\n${passages}\n\nQuestion: ${question}`));
}

const NO_EVIDENCE = 'The available policies do not support a confident answer to that question. Please check with a store manager.';

export async function answerPolicyQuestion(question) {
  let chunks;
  let retrieval = 'vector';
  let notice = null;

  try {
    chunks = (await vectorSearch(question)).filter((c) => c.distance <= env.RAG_MAX_DISTANCE);
  } catch (err) {
    if (!(err instanceof AiUnavailableError)) throw err;
    retrieval = 'keyword';
    notice = `${err.message} Showing keyword-matched policy passages instead of an AI answer.`;
    chunks = await keywordSearch(question);
  }

  if (!chunks.length) {
    return { answered: false, answer: NO_EVIDENCE, citations: [], retrieval, notice };
  }

  if (retrieval === 'keyword') {
    return {
      answered: true, generated: false, retrieval, notice,
      answer: 'AI answer generation is unavailable. The most relevant policy passages are listed below.',
      citations: chunks.map(toCitation),
    };
  }

  try {
    const out = await generate(question, chunks);
    // Grounding check: the quote must appear verbatim in a retrieved passage; that passage is the citation.
    const cleanQuote = out.quote.replace(/^.*?\bv\d+(\.\d+)*,[^:]*:\s*/, '').replace(/^\d+\.\s[^:]{1,60}:\s*/, '').trim(); // tolerate a copied header/section label
    const q = norm(cleanQuote);
    const source = q.length >= 15 ? chunks.find((c) => norm(c.content).includes(q)) : null;
    if (!out.answerable || !source) {
      return { answered: false, answer: NO_EVIDENCE, citations: chunks.slice(0, 2).map(toCitation), retrieval, notice: out.answerable ? 'The AI answer could not be verified against the policy text, so it was withheld.' : 'Closest passages are shown for reference.' };
    }
    const used = [source, ...chunks.filter((c) => c !== source && out.usedPassages.includes(Number(c.id)))];
    return { answered: true, generated: true, retrieval, notice, answer: out.answer, quote: cleanQuote, citations: used.map(toCitation) };
  } catch (err) {
    if (!(err instanceof AiUnavailableError) && !(err instanceof z.ZodError)) throw err;
    return {
      answered: true, generated: false, retrieval, notice: 'AI answer generation failed; showing the retrieved policy passages.',
      answer: 'The most relevant policy passages are listed below.', citations: chunks.map(toCitation),
    };
  }
}

export async function listPolicies() {
  const { rows } = await pool.query(
    `SELECT p.slug, p.title, p.category, p.version, p.effective_date AS "effectiveDate",
            count(c.id)::int AS passages, count(c.embedding)::int AS embedded
     FROM policies p LEFT JOIN policy_chunks c ON c.policy_id = p.id GROUP BY p.id ORDER BY p.title`,
  );
  return rows;
}
