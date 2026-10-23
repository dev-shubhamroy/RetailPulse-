import { messageBody } from '../validators/ai.js';
import { recommend } from '../ai/recommender.js';
import { answerPolicyQuestion, listPolicies } from '../ai/policyQa.js';
import { ingestPolicies } from '../ai/ingestPolicies.js';
import { AiUnavailableError } from '../ai/ollama.js';
import { HttpError } from '../utils/httpError.js';

export async function recommendProducts(req, res) {
  const { message } = messageBody.parse(req.body);
  res.json({ data: await recommend(message) });
}

export async function policyQuestion(req, res) {
  const { message } = messageBody.parse(req.body);
  res.json({ data: await answerPolicyQuestion(message) });
}

export async function policies(req, res) {
  res.json({ data: await listPolicies() });
}

export async function ingest(req, res) {
  try {
    res.json({ data: await ingestPolicies() });
  } catch (err) {
    if (err instanceof AiUnavailableError) throw new HttpError(503, err.message);
    throw err;
  }
}
