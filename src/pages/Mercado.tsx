import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { categories, markets, prices, products } from '../data'
import NaoEncontrada from './NaoEncontrada'
import { brl, corDoPreco, dataHora, mediaValores, nomeDoPreco } from '../utils'

function chip(ativo: boolean) {
  return (
    'rounded-full px-3 py-1 text-xs font-semibold ' +
    (ativo ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
  )
}

export default function Mercado() {
  const { slug } = useParams()
  const mercado = markets.find((m) => m.slug === slug)
  const [catFiltro, setCatFiltro] = useState('todas')

  if (!mercado) return <NaoEncontrada />

  const obs = prices.filter((p) => p.marketId === mercado.id)
  const idsProdutos = new Set(obs.map((o) => o.productId))
  const produtos = products.filter((p) => idsProdutos.has(p.id))

  let ultima = ''
  for (const o of obs) {
    if (o.collectedAt > ultima) ultima = o.collectedAt
  }

  // média de preço por categoria nesse mercado
  const porCategoria = categories
    .map((cat) => {
      const daCat = produtos.filter((p) => p.categoryId === cat.id).map((p) => p.id)
      const valores = obs
        .filter((o) => daCat.includes(o.productId) && o.availability === 'IN_STOCK')
        .map((o) => o.price)
      return { cat, media: mediaValores(valores), qtd: daCat.length }
    })
    .filter((r) => r.qtd > 0)

  const produtosFiltrados =
    catFiltro === 'todas' ? produtos : produtos.filter((p) => p.categoryId === catFiltro)

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400">
        <Link to="/" className="hover:text-green-700">início</Link>
        {' / '}
        <Link to="/mercados" className="hover:text-green-700">mercados</Link>
        {' / '}
        <span className="text-gray-600">{mercado.name}</span>
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-xl font-bold text-gray-900">{mercado.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {mercado.city}/{mercado.state}
          {mercado.website && (
            <>
              {' · '}
              <a href={mercado.website} target="_blank" rel="noreferrer" className="font-semibold text-green-700 hover:underline">
                site oficial ↗
              </a>
            </>
          )}
          {' · '}
          {mercado.onlineShoppingAvailable ? 'coleta no site do mercado' : 'coleta na loja física'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-gray-400">produtos</p>
            <p className="text-lg font-bold text-gray-800">{produtos.length}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-gray-400">preços coletados</p>
            <p className="text-lg font-bold text-gray-800">{obs.length}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-gray-400">última coleta</p>
            <p className="text-sm font-bold text-gray-800">{ultima ? dataHora(ultima) : '—'}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Categorias disponíveis</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[440px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-2.5">categoria</th>
                <th className="px-4 py-2.5">produtos</th>
                <th className="px-4 py-2.5">preço médio</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {porCategoria.map((r) => (
                <tr key={r.cat.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-gray-800">
                    <Link to={`/categoria/${r.cat.slug}`} className="hover:text-green-700">
                      {r.cat.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{r.qtd}</td>
                  <td className="px-4 py-2.5 font-bold text-gray-900">{r.media !== null ? brl(r.media) : '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setCatFiltro(r.cat.id)} className="text-xs font-semibold text-green-700 hover:underline">
                      filtrar ↓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900">Produtos</h2>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCatFiltro('todas')} className={chip(catFiltro === 'todas')}>
              todas
            </button>
            {porCategoria.map((r) => (
              <button key={r.cat.id} onClick={() => setCatFiltro(r.cat.id)} className={chip(catFiltro === r.cat.id)}>
                {r.cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-2.5">produto</th>
                <th className="px-4 py-2.5">categoria</th>
                <th className="px-4 py-2.5">categoria no mercado</th>
                <th className="px-4 py-2.5">preço</th>
                <th className="px-4 py-2.5">tipo</th>
                <th className="px-4 py-2.5">coletado</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((p) => {
                const o = obs.find((x) => x.productId === p.id)
                if (!o) return null
                const cat = categories.find((c) => c.id === p.categoryId)
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <Link to={`/produto/${p.id}`} className="font-semibold text-gray-800 hover:text-green-700">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{cat?.name}</td>
                    <td className="px-4 py-2.5 text-gray-400">{o.marketOriginalCategory ?? '—'}</td>
                    <td className="px-4 py-2.5 font-bold text-gray-900">{brl(o.price)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${corDoPreco(o.priceType)}`}>
                        {nomeDoPreco(o.priceType)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{dataHora(o.collectedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">preços fictícios, só pra demonstrar o site funcionando</p>
      </div>
    </div>
  )
}
