import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { categories, markets, prices, products } from '../data'
import Chip from '../components/Chip'
import GradeProdutos from '../components/GradeProdutos'
import IconeComida from '../components/IconeComida'
import { emojiDaCategoria } from '../emoji'
import NaoEncontrada from './NaoEncontrada'
import type { Price, Product } from '../types'
import { brl, mediaValores, precosDoProduto } from '../utils'

export default function Categoria() {
  const { slug } = useParams()
  const categoria = categories.find((c) => c.slug === slug)
  const [ordem, setOrdem] = useState<'dif' | 'barato' | 'nome'>('dif')

  if (!categoria) return <NaoEncontrada />

  const produtosDaCat = products.filter((p) => p.categoryId === categoria.id)
  const ids = new Set(produtosDaCat.map((p) => p.id))

  // resumo por mercado: média dos preços que aquele mercado tem nessa categoria
  const resumo = markets
    .map((m) => {
      const valores = prices
        .filter((pr) => pr.marketId === m.id && ids.has(pr.productId) && pr.availability === 'IN_STOCK')
        .map((pr) => pr.price)
      return { mercado: m, media: mediaValores(valores), qtd: valores.length }
    })
    .filter((r) => r.media !== null)
    .sort((a, b) => (a.media ?? 0) - (b.media ?? 0))

  const mediaGeral = mediaValores(resumo.map((r) => r.media ?? 0))

  // produto mais barato e mais caro da categoria (olhando mercado por mercado)
  let maisBarato: { produto: Product; preco: Price } | null = null
  let maisCaro: { produto: Product; preco: Price } | null = null
  for (const p of produtosDaCat) {
    const precos = precosDoProduto(p.id)
    if (precos.length === 0) continue
    if (!maisBarato || precos[0].price < maisBarato.preco.price) {
      maisBarato = { produto: p, preco: precos[0] }
    }
    if (!maisCaro || precos[precos.length - 1].price > maisCaro.preco.price) {
      maisCaro = { produto: p, preco: precos[precos.length - 1] }
    }
  }

  const comInfo = produtosDaCat.map((p) => {
    const precos = precosDoProduto(p.id)
    const min = precos.length > 0 ? precos[0].price : null
    const max = precos.length > 0 ? precos[precos.length - 1].price : null
    return {
      produto: p,
      min,
      difPct: min !== null && max !== null && min > 0 ? ((max - min) / min) * 100 : 0,
    }
  })

  const ordenados = [...comInfo]
  if (ordem === 'dif') {
    ordenados.sort((a, b) => b.difPct - a.difPct)
  } else if (ordem === 'barato') {
    ordenados.sort((a, b) => (a.min ?? Infinity) - (b.min ?? Infinity))
  } else {
    ordenados.sort((a, b) => a.produto.name.localeCompare(b.produto.name))
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400">
        <Link to="/" className="hover:text-marca-700">início</Link>
        {' / '}
        <Link to="/categorias" className="hover:text-marca-700">categorias</Link>
        {' / '}
        <span className="text-gray-600">{categoria.name}</span>
      </p>

      <div className="flex items-center gap-4">
        <IconeComida emoji={emojiDaCategoria(categoria.id)} tamanho="lg" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Preços de {categoria.name.toLowerCase()} em Cascavel</h1>
          <p className="mt-1 text-sm text-gray-500">{categoria.description}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <th className="px-4 py-2.5">mercado</th>
              <th className="px-4 py-2.5">média da categoria</th>
              <th className="px-4 py-2.5">produtos analisados</th>
              <th className="px-4 py-2.5 text-right">vs média geral</th>
            </tr>
          </thead>
          <tbody>
            {resumo.map((r) => {
              const difPct =
                mediaGeral !== null && r.media !== null && mediaGeral > 0
                  ? ((r.media - mediaGeral) / mediaGeral) * 100
                  : 0
              return (
                <tr key={r.mercado.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-gray-800">
                    <Link to={`/mercado/${r.mercado.slug}`} className="hover:text-marca-700">
                      {r.mercado.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-gray-900">{brl(r.media ?? 0)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.qtd}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${difPct > 0 ? 'text-amber-600' : 'text-marca-700'}`}>
                    {difPct > 0 ? '+' : ''}
                    {difPct.toFixed(1).replace('.', ',')}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
          média geral: {mediaGeral !== null ? brl(mediaGeral) : '—'} · não é ranking, cada mercado trabalha com
          uma quantidade diferente de produtos · preços coletados nos sites dos mercados
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {maisBarato && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-marca-700">produto mais barato</p>
            <Link to={`/produto/${maisBarato.produto.id}`} className="text-sm font-bold text-gray-900 hover:text-marca-700">
              {maisBarato.produto.name}
            </Link>
            <p className="text-xs text-gray-500">{brl(maisBarato.preco.price)}</p>
          </div>
        )}
        {maisCaro && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-amber-600">produto mais caro</p>
            <Link to={`/produto/${maisCaro.produto.id}`} className="text-sm font-bold text-gray-900 hover:text-marca-700">
              {maisCaro.produto.name}
            </Link>
            <p className="text-xs text-gray-500">{brl(maisCaro.preco.price)}</p>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900">Produtos</h2>
          <div className="flex gap-1.5">
            <Chip onClick={() => setOrdem('dif')} ativo={ordem === 'dif'}>
              maior diferença
            </Chip>
            <Chip onClick={() => setOrdem('barato')} ativo={ordem === 'barato'}>
              menor preço
            </Chip>
            <Chip onClick={() => setOrdem('nome')} ativo={ordem === 'nome'}>
              a-z
            </Chip>
          </div>
        </div>
        <GradeProdutos produtos={ordenados.map((info) => info.produto)} />
      </div>
    </div>
  )
}
