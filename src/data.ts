import marketsJson from './data/markets.json'
import categoriesJson from './data/categories.json'
import productsJson from './data/products.json'
import pricesJson from './data/prices.json'
import type { Category, Market, Price, Product } from './types'

// a base tem milhares de linhas, então os arquivos usam chaves curtas (ver scripts/montar-base.mjs)
// e aqui elas viram as entidades que o resto do site usa
interface ProdutoCompacto {
  id: string
  n: string
  b: string | null
  q: number
  u: Product['quantityUnit']
  t: string
  c: string
  s: string | null
}

interface PrecoCompacto {
  p: string
  m: string
  v: number
  a: 0 | 1
  d: string
  l: string | null
  k: string | null
  n?: string
}

const sitesDosMercados: Record<string, string> = {
  muffato: 'https://www.supermuffato.com.br',
  festval: 'https://www.festval.com',
}
const nomesDasFontes: Record<string, string> = {
  muffato: 'site do Muffato',
  festval: 'site do Festval',
  atacadao: 'site do Atacadão',
  irani: 'loja online do Irani',
  puppo: 'encarte do Puppo',
}

export const markets = marketsJson as Market[]
export const categories = categoriesJson as Category[]

export const products: Product[] = (productsJson as ProdutoCompacto[]).map((p) => ({
  id: p.id,
  name: p.n,
  brand: p.b ?? '',
  ean: null,
  unit: p.t,
  quantity: p.q,
  quantityUnit: p.u,
  categoryId: p.c,
  subcategory: p.s,
}))

export const prices: Price[] = (pricesJson as PrecoCompacto[]).map((p) => ({
  id: `${p.m}--${p.p}`,
  productId: p.p,
  marketId: p.m,
  price: p.v,
  priceType: 'ONLINE',
  collectedAt: p.d,
  source: nomesDasFontes[p.m] ?? `site do ${p.m}`,
  sourceUrl: p.l ? (p.l.startsWith('http') ? p.l : (sitesDosMercados[p.m] ?? '') + p.l) : null,
  availability: p.a ? 'IN_STOCK' : 'OUT_OF_STOCK',
  marketOriginalCategory: p.k,
  marketEan: null,
  marketProductName: p.n ?? null,
  marketBrand: null,
}))

// preços de cada produto, pra não varrer a lista inteira a cada consulta
export const pricesByProduct = new Map<string, Price[]>()
for (const p of prices) {
  const lista = pricesByProduct.get(p.productId)
  if (lista) lista.push(p)
  else pricesByProduct.set(p.productId, [p])
}
