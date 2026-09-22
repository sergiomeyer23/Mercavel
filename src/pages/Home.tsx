import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { categories, markets, prices, products } from '../data'
import ProductCard from '../components/ProductCard'
import { brl, mediaValores } from '../utils'

const destaques = [
  'arroz-tipo1-5kg',
  'leite-uht-integral-1l',
  'cafe-torrado-500g',
  'detergente-neutro-500ml',
  'refrigerante-cola-2l',
  'file-peito-frango-kg',
  'papel-higienico-12un',
  'banana-prata-kg',
]

export default function Home() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')

  function procurar(e: FormEvent) {
    e.preventDefault()
    if (busca.trim()) {
      navigate('/busca?q=' + encodeURIComponent(busca.trim()))
    }
  }

  // média de preço por categoria (pra colocar no gráfico de barras)
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

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-green-700 px-6 py-10 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-200">
          protótipo · preços fictícios · Cascavel/PR
        </p>
        <h1 className="mt-2 max-w-2xl text-2xl font-bold sm:text-3xl">
          Compare os preços dos supermercados de Cascavel
        </h1>
        <p className="mt-2 max-w-xl text-green-100">
          Descubra onde sua compra custa menos. Pesquise um produto e veja o preço em cada mercado, com a data
          da coleta.
        </p>
        <form onSubmit={procurar} className="mt-5 flex max-w-xl gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="ex: arroz, leite, detergente..."
            className="flex-1 rounded-lg border-0 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          <button type="submit" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-green-700">
            Buscar
          </button>
        </form>
        <p className="mt-3 text-xs text-green-200">
          {markets.length} mercados · {products.length} produtos · {prices.length} preços coletados
        </p>
      </section>

      <p className="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
        obs: os produtos e preços aqui são fictícios, coloquei só pra ter conteúdo na tela. depois entram dados
        reais, coletados nos sites dos mercados.
      </p>

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Categorias</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.slice(0, 8).map((cat) => {
            const qtd = products.filter((p) => p.categoryId === cat.id).length
            return (
              <Link
                key={cat.id}
                to={`/categoria/${cat.slug}`}
                className="rounded-xl border border-gray-200 bg-white p-4 hover:border-green-400"
              >
                <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                <p className="text-xs text-gray-400">{qtd} produtos</p>
              </Link>
            )
          })}
        </div>
        <Link to="/categorias" className="mt-2 inline-block text-sm font-semibold text-green-700 hover:underline">
          ver todas as categorias →
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Produtos em destaque</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {destaques
            .map((id) => products.find((p) => p.id === id))
            .map((p) => (p ? <ProductCard key={p.id} produto={p} /> : null))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Supermercados monitorados</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => (
            <Link
              key={m.id}
              to={`/mercado/${m.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-green-400"
            >
              <p className="text-sm font-semibold text-gray-800">{m.name}</p>
              <p className="text-xs text-gray-400">
                {m.city}/{m.state} · {m.onlineShoppingAvailable ? 'tem site próprio' : 'só loja física'}
              </p>
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
                  className="h-2 rounded-full bg-green-500"
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
