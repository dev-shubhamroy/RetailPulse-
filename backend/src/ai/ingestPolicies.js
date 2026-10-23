import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { embed, toVectorLiteral } from './ollama.js';

/** Embeds policy chunks that are missing an embedding or were embedded with another model. */
export async function ingestPolicies() {
  const { rows } = await pool.query(
    `SELECT c.id, p.title, c.section, c.content FROM policy_chunks c JOIN policies p ON p.id = c.policy_id
     WHERE c.embedding IS NULL OR c.embedding_model IS DISTINCT FROM $1 ORDER BY c.id`,
    [env.OLLAMA_EMBED_MODEL],
  );
  if (!rows.length) return { embedded: 0, total: 0 };

  const vectors = await embed(rows.map((r) => `${r.title} - ${r.section}\n${r.content}`));
  for (let i = 0; i < rows.length; i++) {
    if (vectors[i].length !== 768) {
      throw new Error(`Embedding model returned ${vectors[i].length} dimensions; schema expects 768.`);
    }
    await pool.query('UPDATE policy_chunks SET embedding = $1::vector, embedding_model = $2 WHERE id = $3', [
      toVectorLiteral(vectors[i]), env.OLLAMA_EMBED_MODEL, rows[i].id,
    ]);
  }
  return { embedded: rows.length, total: rows.length };
}

// CLI entry: `npm run ingest:policies`
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestPolicies()
    .then((r) => console.log(`Embedded ${r.embedded} policy passage(s) with ${env.OLLAMA_EMBED_MODEL}.`))
    .catch((err) => {
      console.error(`Policy ingestion failed: ${err.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
