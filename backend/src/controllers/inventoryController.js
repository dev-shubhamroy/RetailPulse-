import { createProposalBody, decisionBody, listProposalsQuery } from '../validators/inventory.js';
import { idParam } from '../validators/products.js';
import * as repo from '../repositories/inventoryRepository.js';

export async function create(req, res) {
  const body = createProposalBody.parse(req.body);
  res.status(201).json({ data: await repo.createProposal(body) });
}

export async function list(req, res) {
  const { status } = listProposalsQuery.parse(req.query);
  res.json({ data: await repo.listProposals(status) });
}

export async function audit(req, res) {
  res.json({ data: await repo.listAudit() });
}

export const decide = (decision) => async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = decisionBody.parse(req.body ?? {});
  res.json({ data: await repo.decideProposal(id, decision, body) });
};
