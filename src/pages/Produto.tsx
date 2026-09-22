import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { categories, products } from '../data'
import AddToBasket from '../components/AddToBasket'
import NaoEncontrada from './NaoEncontrada'
import type { PriceType } from '../types'
import { acharMarket, brl, corDoPreco, dataHora, nomeDoPreco, precosDoProduto } from '../utils'

function chip(ativo: boolean) {
  return (
    'rounded-full px-3 py-1 text-xs font-semibold ' +
    (ativo ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
  )
}

export default function Produto() {
  const { id } = useParams()
  const produto = products.find((p) => p.id === id)
  // filtro por tipo de preço, porque preço online não é o mesmo preço da loja física
  const [tipo, setTipo] = useState<'todos' | PriceType>('todos')

  if (!produto) return <NaoEncontrada />

  const precos = precosDoProduto(produto.id, tipo === 'todos' ? undefined : tipo)
  const menor = precos.length > 0 ? precos[0].price : null
  const maior = precos.length > 0 ? precos[precos.length - 1].price : null
  const categoria = categories.find((c) => c.id === produto.categoryId)
  const relacionados = products
    .filter((p) => p.categoryId === produto.categoryId && p.id !== produto.id)
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400">
        <Link to="/" className="hover:text-green-700">início</Link>
        {' / '}
        <Link to="/categorias" className="hover:text-green-700">categorias</Link>
        {categoria && (
          <>
            {' / '}
            <Link to={`/categoria/${categoria.slug}`} className="hover:text-green-700">
              {categoria.name}
            </Link>
          </>
        )}
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{produto.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              marca: {produto.brand} · categoria: {categoria?.name} · embalagem: {produto.unit}
            </p>
          </div>
          <AddToBasket productId={produto.id} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-green-700">menor preço</p>
            <p className="text-lg font-bold text-green-700">{menor !== null ? brl(menor) : '—'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-gray-400">maior preço</p>
            <p className="text-lg font-bold text-gray-800">{maior !== null ? brl(maior) : '—'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-gray-400">diferença</p>
            <p className="text-lg font-bold text-gray-800">
              {menor !== null && maior !== null ? brl(maior - menor) : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-gray-400">mercados</p>
            <p className="text-lg font-bold text-gray-800">{precos.length}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900">Preço em cada supermercado</h2>
          <div className="flex gap-1.5">
            {(['todos', 'ONLINE', 'PHYSICAL'] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)} className={chip(tipo === t)}>
                {t === 'todos' ? 'todos os tipos' : nomeDoPreco(t)}
              </button>
            ))}
          </div>
        </div>

        {precos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            nenhum preço encontrado com esse filtro
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="px-4 py-2.5">mercado</th>
                  <th className="px-4 py-2.5">preço</th>
                  <th className="px-4 py-2.5">tipo</th>
                  <th className="px-4 py-2.5">coletado em</th>
                  <th className="px-4 py-2.5 text-right">diferença</th>
                </tr>
              </thead>
              <tbody>
                {precos.map((p) => {
                  const mercado = acharMarket(p.marketId)
                  const dif = menor !== null ? p.price - menor : 0
                  return (
                    <tr key={p.id} className={p.price === menor ? 'bg-green-50' : ''}>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">
                        {mercado ? (
                          <Link to={`/mercado/${mercado.slug}`} className="hover:text-green-700">
                            {mercado.name}
                          </Link>
                        ) : (
                          p.marketId
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-gray-900">{brl(p.price)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${corDoPreco(p.priceType)}`}>
                          {nomeDoPreco(p.priceType)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{dataHora(p.collectedAt)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {dif === 0 ? <span className="font-semibold text-green-700">menor preço</span> : `+${brl(dif)}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">
          fonte: site de cada supermercado · preços fictícios, só pra demonstrar · preço online não é o mesmo
          preço da loja física
        </p>
      </div>

      {relacionados.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-gray-900">outros produtos de {categoria?.name}</h2>
          <div className="flex flex-wrap gap-2">
            {relacionados.map((p) => (
              <Link
                key={p.id}
                to={`/produto/${p.id}`}
                className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:border-green-400"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
