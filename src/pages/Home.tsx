import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { categories, markets, prices, products } from '../data'
import MarketLogo from '../components/MarketLogo'
import ProductCard from '../components/ProductCard'
import IconeComida from '../components/IconeComida'
import { emojiDaCategoria } from '../emoji'
import { acharProdutoComparavel, brl, caminhoDaBusca, mediaValores } from '../utils'

// itens do dia a dia que quase todo mundo compra; pega o primeiro de cada tipo que tem preço em 2+ mercados
const padroesDestaque = [
  /^arroz .*\b5 ?kg/i,
  /^leite .*integral.*\b1 ?l\b/i,
  /^caf[eé] .*\b500 ?g/i,
  /^detergente .*\b500 ?ml/i,
  /^refrigerante .*\b2 ?l\b/i,
  /^papel higi[eê]nico/i,
  /^feij[aã]o .*\b1 ?kg/i,
  /^a[cç][uú]car .*\b1 ?kg/i,
]

export default function Home() {
  const destaques = padroesDestaque.map((r) => acharProdutoComparavel(r)).filter((p) => p !== undefined)
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')

  function procurar(e: FormEvent) {
    e.preventDefault()
    if (busca.trim()) {
      navigate(caminhoDaBusca(busca))
    }
  }

  // média de preço por categoria (pra colocar no gráfico de barras)
  const medias = categories
    .map((cat) => {
      const ids = new Set(products.filter((p) => p.categoryId === cat.id).map((p) => p.id))
      const valores = prices
        .filter((pr) => ids.has(pr.productId) && pr.availability === 'IN_STOCK')
        .map((pr) => pr.price)
      return { cat, media: mediaValores(valores) }
    })
    .filter((m) => m.media !== null)
    .sort((a, b) => (b.media ?? 0) - (a.media ?? 0))
  const maiorMedia = medias[0]?.media ?? 1
  const idsComPrecos = new Set(prices.map((p) => p.marketId))
  const mercadosComPrecos = markets.filter((m) => idsComPrecos.has(m.id))

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-tinta-900 px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-marca-300">
          protótipo · preços coletados nos sites dos mercados · Cascavel/PR
        </p>
        <h1 className="mt-3 max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Onde sua compra custa menos em Cascavel
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-base text-gray-300">
          Pesquise um produto e veja o preço em cada mercado, com a data da coleta.
        </p>
        <form onSubmit={procurar} role="search" className="mt-6 flex max-w-xl gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar produto"
            placeholder="ex: arroz, leite, detergente..."
            className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-marca-300"
          />
          <button type="submit" className="rounded-xl bg-marca-500 px-6 py-3 text-base font-semibold text-tinta-900 hover:bg-marca-400">
            Buscar
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500">
          {markets.length} mercados · {mercadosComPrecos.length} com preços · {products.length} produtos ·{' '}
          {prices.length} preços coletados
        </p>
      </section>

      <p className="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
        os preços são coletados automaticamente nos sites dos mercados. nem todo produto tem preço
        em todo mercado, porque depende do que cada loja vende online.
      </p>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marca-200 bg-marca-50 p-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Está no mercado agora?</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Fotografe a etiqueta e ajude a manter o preço de loja física certo. É só uma demonstração por enquanto.
          </p>
        </div>
        <Link
          to="/contribuir"
          className="rounded-lg bg-marca-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-marca-700"
        >
          enviar um preço
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Categorias</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.slice(0, 8).map((cat) => {
            const qtd = products.filter((p) => p.categoryId === cat.id).length
            return (
              <Link
                key={cat.id}
                to={`/categoria/${cat.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-marca-300 hover:shadow-md"
              >
                <IconeComida emoji={emojiDaCategoria(cat.id)} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                  <p className="text-xs text-gray-500">{qtd} produtos</p>
                </div>
              </Link>
            )
          })}
        </div>
        <Link to="/categorias" className="mt-2 inline-block text-sm font-semibold text-marca-700 hover:underline">
          ver todas as categorias →
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Produtos em destaque</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {destaques.map((p) => (
            <ProductCard key={p.id} produto={p} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Supermercados monitorados</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => (
            <Link
              key={m.id}
              to={`/mercado/${m.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-marca-400"
            >
              <div className="flex items-center gap-2.5">
                <MarketLogo mercado={m} tamanho="md" />
                <p className="text-sm font-semibold text-gray-800">{m.name}</p>
              </div>
              <p className="text-xs text-gray-500">
                {m.city}/{m.state} · {m.onlineShoppingAvailable ? 'tem site próprio' : 'só loja física'}
              </p>
              {!idsComPrecos.has(m.id) && (
                <p className="mt-1 text-[11px] font-semibold text-amber-600">preços ainda não coletados</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Preço médio por categoria</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {medias.slice(0, 6).map(({ cat, media }) => (
            <div key={cat.id} className="py-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">{cat.name}</span>
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
      </section>
    </div>
  )
}
