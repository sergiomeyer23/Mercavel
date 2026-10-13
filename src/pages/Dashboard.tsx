import { Link } from 'react-router-dom'
import { categories, markets, prices, products } from '../data'
import type { Product } from '../types'
import { brl, dataHora, mediaValores, precosDoProduto } from '../utils'

export default function Dashboard() {
  let ultimaColeta = ''
  for (const p of prices) {
    if (p.collectedAt > ultimaColeta) ultimaColeta = p.collectedAt
  }

  // produto com a maior diferença de preço entre mercados
  let maiorDif: { produto: Product; dif: number } | null = null
  for (const p of products) {
    const precos = precosDoProduto(p.id)
    if (precos.length < 2) continue
    const dif = precos[precos.length - 1].price - precos[0].price
    if (!maiorDif || dif > maiorDif.dif) {
      maiorDif = { produto: p, dif }
    }
  }

  // média de preço por categoria
  const medias = categories
    .map((cat) => {
      const ids = products.filter((p) => p.categoryId === cat.id).map((p) => p.id)
      const valores = prices
        .filter((pr) => ids.includes(pr.productId) && pr.availability === 'IN_STOCK')
        .map((pr) => pr.price)
      return { cat, media: mediaValores(valores) }
    })
    .filter((m) => m.media !== null)
    .sort((a, b) => (b.media ?? 0) - (a.media ?? 0))
  const maiorMedia = medias[0]?.media ?? 1

  // quantos produtos cada mercado tem
  const porMercado = markets
    .map((m) => ({
      m,
      qtd: new Set(prices.filter((p) => p.marketId === m.id).map((p) => p.productId)).size,
    }))
    .sort((a, b) => b.qtd - a.qtd)
  const maiorQtd = porMercado[0]?.qtd ?? 1

  const online = prices.filter((p) => p.priceType === 'ONLINE').length
  const fisica = prices.filter((p) => p.priceType === 'PHYSICAL').length
  const outros = prices.length - online - fisica

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      números gerais dos preços coletados nos sites dos mercados

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase text-gray-400">mercados</p>
          <p className="text-2xl font-bold text-gray-900">{markets.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase text-gray-400">produtos</p>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase text-gray-400">categorias</p>
          <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase text-gray-400">preços</p>
          <p className="text-2xl font-bold text-gray-900">{prices.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase text-gray-400">coleta</p>
          <p className="text-sm font-bold text-gray-800">{dataHora(ultimaColeta)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-semibold uppercase text-amber-600">maior diferença</p>
          <p className="text-xl font-bold text-amber-700">{maiorDif ? brl(maiorDif.dif) : '—'}</p>
        </div>
      </div>

      {maiorDif && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-gray-400">maior diferença encontrada</p>
          <p className="mt-1 text-sm text-gray-600">
            <Link to={`/produto/${maiorDif.produto.id}`} className="font-bold text-gray-900 hover:text-marca-700">
              {maiorDif.produto.name}
            </Link>{' '}
            tem {brl(maiorDif.dif)} de diferença entre o mercado mais barato e o mais caro
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900">Preço médio por categoria</h2>
          <div className="mt-2">
            {medias.slice(0, 8).map(({ cat, media }) => (
              <div key={cat.id} className="py-1.5">
                <div className="flex justify-between text-sm">
                  <Link to={`/categoria/${cat.slug}`} className="text-gray-700 hover:text-marca-700">
                    {cat.name}
                  </Link>
                  <span className="font-semibold text-gray-800">{brl(media ?? 0)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-marca-500"
                    style={{ width: `${Math.max(2, Math.round(((media ?? 0) / maiorMedia) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900">Produtos por mercado</h2>
          <div className="mt-2">
            {porMercado.map(({ m, qtd }) => (
              <div key={m.id} className="py-1.5">
                <div className="flex justify-between text-sm">
                  <Link to={`/mercado/${m.slug}`} className="text-gray-700 hover:text-marca-700">
                    {m.name}
                  </Link>
                  <span className="font-semibold text-gray-800">{qtd}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-marca-500"
                    style={{ width: `${Math.max(2, Math.round((qtd / maiorQtd) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900">De onde vêm os preços</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-gray-700">online (site do mercado)</span>
            <span className="font-semibold text-gray-800">{online}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-gray-700">loja física</span>
            <span className="font-semibold text-gray-800">{fisica}</span>
          </div>
          {outros > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-gray-700">outros tipos (app, clube, promoção...)</span>
              <span className="font-semibold text-gray-800">{outros}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
