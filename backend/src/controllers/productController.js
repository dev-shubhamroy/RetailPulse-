import { listProductsQuery, idParam } from '../validators/products.js';
import * as repo from '../repositories/productRepository.js';
import { HttpError } from '../utils/httpError.js';

export async function list(req, res) {
  const f = listProductsQuery.parse(req.query);
  const { items, total } = await repo.listProducts(f);
  res.json({ data: items, meta: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.max(1, Math.ceil(total / f.pageSize)) } });
}

export async function get(req, res) {
  const { id } = idParam.parse(req.params);
  const product = await repo.getProduct(id);
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({ data: product });
}

export async function filters(req, res) {
  res.json({ data: { stores: await repo.listStores(), categories: await repo.listCategories() } });
}
