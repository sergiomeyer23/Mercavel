import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Chip from '../components/Chip'
import MarketLogo from '../components/MarketLogo'
import IconeComida from '../components/IconeComida'
import { emojiDoProduto } from '../emoji'
import { markets, products } from '../data'
import { cestaDoTexto, cestaParaTexto, useCesta } from '../context/BasketContext'
import type { Market, PriceType } from '../types'
import { acharMarket, acharProdutoComparavel, brl, precosDoProduto } from '../utils'
import {
  multiplicarPorEscalar,
  norma,
  produtoEscalar,
  similaridadeEntreMercados,
  vetorDePrecos,
  vetorDeQuantidades,
} from '../vetor'

// cesta de exemplo pra não começar do zero: itens básicos que têm preço em 2+ mercados
const padroesModelo = [
  /^arroz .*\b5 ?kg/i,
  /^feij[aã]o .*\b1 ?kg/i,
  /^caf[eé] .*\b500 ?g/i,
  /^leite .*integral.*\b1 ?l\b/i,
  /^a[cç][uú]car .*\b1 ?kg/i,
  /^[oó]leo .*soja/i,
  /^detergente .*\b500 ?ml/i,
  /^papel higi[eê]nico/i,
]

const cestaModelo = padroesModelo
  .map((r) => acharProdutoComparavel(r)?.id)
  .filter((id) => id !== undefined)

export default function Cesta() {
  const { itens, qtdItens, adicionar, remover, mudarQtd, limpar, substituir } = useCesta()
  const [tipo, setTipo] = useState<'todos' | PriceType>('todos')
  const [params, setParams] = useSearchParams()
  const [copiado, setCopiado] = useState(false)

  // abre uma cesta compartilhada (?c=id:qtd,id:qtd) e tira o parâmetro da URL
  const compartilhada = params.get('c')
  useEffect(() => {
    if (compartilhada === null) return
    const recebidos = cestaDoTexto(compartilhada).filter((i) => products.some((p) => p.id === i.productId))
    if (recebidos.length > 0) substituir(recebidos)
    setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compartilhada])

  async function copiarLink() {
    const url = `${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(cestaParaTexto(itens))}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      window.prompt('copie o link da sua cesta:', url)
    }
  }

  // a cesta é o vetor de quantidades q; cada mercado é um vetor de preços p
  // (um eixo por produto). O total do mercado é o produto escalar q·p.
  // se o mercado não tiver algum item, não entra na disputa
  const tipoFiltro = tipo === 'todos' ? undefined : tipo
  const q = vetorDeQuantidades(itens)
  const vetores = markets.map((m) => ({ mercado: m, ...vetorDePrecos(itens, m.id, tipoFiltro) }))
  const resultados = vetores
    .map((v) => {
      const faltantes = itens
        .filter((_, i) => !v.temItem[i])
        .map((item) => products.find((p) => p.id === item.productId)?.name ?? item.productId)
      return { mercado: v.mercado, total: produtoEscalar(q, v.precos), faltando: faltantes.length, faltantes }
    })
    .sort((a, b) => a.faltando - b.faltando || a.total - b.total)

  const completos = itens.length > 0 ? resultados.filter((r) => r.faltando === 0) : []
  const menor = completos.length > 0 ? completos[0].total : null
  const maior = completos.length > 0 ? completos[completos.length - 1].total : null

  const sugestoes = cestaModelo
    .filter((id) => !itens.some((i) => i.productId === id))
    .map((id) => products.find((p) => p.id === id))
    .filter((p) => p !== undefined)

  if (itens.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Compare sua cesta</h1>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-3xl">🧺</p>
          <p className="mt-2 font-semibold text-gray-700">sua cesta tá vazia</p>
          <p className="mt-1 text-sm text-gray-500">
            adiciona produtos pelo botão "+ cesta" nas listagens, ou usa a cesta de exemplo aqui embaixo
          </p>
          <button
            onClick={() => cestaModelo.forEach((id) => adicionar(id))}
            className="mt-4 rounded-lg bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700"
          >
            usar cesta de exemplo ({cestaModelo.length} itens)
          </button>
        </div>

        {sugestoes.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-bold text-gray-900">ou escolhe uns itens:</h2>
            <div className="flex flex-wrap gap-2">
              {sugestoes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => adicionar(p.id)}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-marca-400 hover:text-marca-700"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900">Compare sua cesta</h1>
        <div className="flex gap-1.5">
          {(['todos', 'ONLINE', 'PHYSICAL'] as const).map((t) => (
            <Chip key={t} onClick={() => setTipo(t)} ativo={tipo === t}>
              {t === 'todos' ? 'qualquer tipo' : t === 'ONLINE' ? 'só online' : 'só loja física'}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-900">Total em cada supermercado</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {itens.length} produtos · {qtdItens} itens
          </p>
          <ul className="mt-4 space-y-2">
            {resultados.map((r, i) => {
              const ehMenor = r.faltando === 0 && r.total === menor
              return (
                <li
                  key={r.mercado.id}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    ehMenor ? 'border-marca-300 bg-marca-50' : 'border-gray-200'
                  }`}
                >
                  <span className="w-5 text-center text-sm font-bold text-gray-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/mercado/${r.mercado.slug}`}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-marca-700"
                    >
                      <MarketLogo mercado={r.mercado} tamanho="sm" />
                      {r.mercado.name}
                    </Link>
                    <p className="text-[11px] text-gray-400">
                      {r.faltando > 0
                        ? `faltam ${r.faltando} de ${itens.length} produtos: ${r.faltantes.join(', ')}`
                        : 'cesta completa'}
                    </p>
                  </div>
                  <div className="text-right">
                    {r.faltando === 0 ? (
                      <>
                        <p className={`font-bold ${ehMenor ? 'text-marca-700' : 'text-gray-900'}`}>{brl(r.total)}</p>
                        {menor !== null && r.total > menor && (
                          <p className="text-[11px] text-gray-400">+{brl(r.total - menor)} que o menor</p>
                        )}
                      </>
                    ) : r.faltando < itens.length ? (
                      <>
                        <p className="font-bold text-gray-500">{brl(r.total)}</p>
                        <p className="text-[11px] text-gray-400">total parcial</p>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">sem preços</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-marca-600 p-5 text-white">
            <p className="text-xs font-semibold uppercase text-marca-200">cesta mais barata</p>
            <p className="mt-1 text-2xl font-bold">{menor !== null ? brl(menor) : '—'}</p>
            <p className="mt-1 text-sm text-marca-100">
              {completos.length > 0
                ? completos[0].mercado.name
                : 'nenhum mercado tem tudo (veja os totais parciais ao lado)'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase text-gray-400">diferença em reais</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {menor !== null && maior !== null ? brl(maior - menor) : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase text-gray-400">diferença em %</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {menor !== null && maior !== null && menor > 0
                ? `${(((maior - menor) / menor) * 100).toFixed(1).replace('.', ',')}%`
                : '—'}
            </p>
          </div>
          <button
            onClick={copiarLink}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:border-marca-400 hover:text-marca-700"
          >
            {copiado ? 'link copiado!' : 'copiar link da cesta'}
          </button>
          <button
            onClick={limpar}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-500 hover:border-red-300 hover:text-red-600"
          >
            limpar cesta
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <th className="px-4 py-2.5">produto</th>
              <th className="px-4 py-2.5">qtd</th>
              <th className="px-4 py-2.5">menor preço</th>
              <th className="px-4 py-2.5 text-right">subtotal</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const produto = products.find((p) => p.id === item.productId)
              if (!produto) return null
              const precos = precosDoProduto(item.productId, tipo === 'todos' ? undefined : tipo)
              const maisBarato = precos[0]
              const mercado = maisBarato ? acharMarket(maisBarato.marketId) : null
              return (
                <tr key={item.productId} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <IconeComida emoji={emojiDoProduto(produto.name, produto.subcategory, produto.categoryId)} tamanho="sm" />
                      <div>
                        <Link to={`/produto/${produto.id}`} className="font-semibold text-gray-800 hover:text-marca-700">
                          {produto.name}
                        </Link>
                        <p className="text-[11px] text-gray-400">
                          {mercado ? `menor no ${mercado.shortName}` : 'sem preço'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="inline-flex items-center rounded-lg border border-gray-300">
                      <button
                        onClick={() => mudarQtd(item.productId, item.qtd - 1)}
                        className="px-2.5 py-1 text-sm font-bold text-gray-500 hover:text-marca-700"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{item.qtd}</span>
                      <button
                        onClick={() => mudarQtd(item.productId, item.qtd + 1)}
                        className="px-2.5 py-1 text-sm font-bold text-gray-500 hover:text-marca-700"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{maisBarato ? brl(maisBarato.price) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                    {maisBarato ? brl(maisBarato.price * item.qtd) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => remover(item.productId)}
                      className="text-xs font-semibold text-gray-400 hover:text-red-600"
                    >
                      remover
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sugestoes.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-gray-900">adicionar mais coisas:</h2>
          <div className="flex flex-wrap gap-2">
            {sugestoes.map((p) => (
              <button
                key={p.id}
                onClick={() => adicionar(p.id)}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-marca-400 hover:text-marca-700"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <PainelVetorial
        nomes={itens.map((i) => products.find((p) => p.id === i.productId)?.name ?? i.productId)}
        q={q}
        vetores={vetores}
      />

      <p className="text-xs text-gray-400">
        obs: os totais comparam o mesmo tipo de preço entre os mercados (ex: online com online).
        preços coletados nos sites dos mercados.
      </p>
    </div>
  )
}

const fatores = [1, 2, 4]

interface PainelProps {
  nomes: string[]
  q: number[]
  vetores: { mercado: Market; precos: number[]; temItem: boolean[] }[]
}

// mostra a mesma conta da cesta em linguagem de vetores
function PainelVetorial({ nomes, q, vetores }: PainelProps) {
  const [k, setK] = useState(1)
  const kq = multiplicarPorEscalar(k, q)
  const completos = vetores.filter((v) => v.temItem.every(Boolean))
  const referencia = completos.length > 0 ? completos[0] : null
  const comparaveis = vetores.filter((v) => v.temItem.some(Boolean))

  return (
    <details className="rounded-xl border border-gray-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-bold text-gray-900">
        a matemática da cesta: vetores e produto escalar
      </summary>

      <div className="mt-4 space-y-5 text-sm text-gray-600">
        <p>
          cada produto da cesta é um eixo, perpendicular aos outros. Com {nomes.length} produtos, a cesta é uma
          flecha num espaço de {nomes.length} dimensões: o vetor de quantidades <b>q</b>. Cada mercado também é uma
          flecha nesse espaço: o vetor de preços <b>p</b>. O total que você paga é o produto escalar{' '}
          <b>q·p</b> = soma de quantidade × preço de cada eixo, um número só (um escalar).
        </p>

        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">multiplicar por um escalar k</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {fatores.map((f) => (
              <Chip key={f} onClick={() => setK(f)} ativo={k === f}>
                {f === 1 ? 'k = 1 (1 semana)' : `k = ${f} (${f} semanas)`}
              </Chip>
            ))}
          </div>
          <p className="mt-2 font-mono text-xs text-gray-700">
            k·q = [{kq.join(', ')}] · comprimento ‖k·q‖ = {norma(kq).toFixed(2).replace('.', ',')}
          </p>
          <p className="text-xs text-gray-400">
            multiplicar por k estica o vetor sem mudar a direção, então k·(q·p) = (k·q)·p: o total escala igual e o
            mercado mais barato continua o mesmo.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-1.5 pr-3">mercado</th>
                <th className="py-1.5 pr-3">vetor de preços p</th>
                <th className="py-1.5 text-right">k·(q·p)</th>
              </tr>
            </thead>
            <tbody>
              {vetores.map((v) => {
                const completo = v.temItem.every(Boolean)
                return (
                  <tr key={v.mercado.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 pr-3 font-semibold text-gray-700">{v.mercado.shortName}</td>
                    <td className="py-1.5 pr-3 font-mono text-gray-500">
                      [{v.precos.map((x, i) => (v.temItem[i] ? x.toFixed(2).replace('.', ',') : '—')).join(', ')}]
                    </td>
                    <td className="py-1.5 text-right font-semibold text-gray-700">
                      {v.temItem.some(Boolean) ? brl(produtoEscalar(kq, v.precos)) : '—'}
                      {!completo && v.temItem.some(Boolean) && <span className="text-gray-400"> (parcial)</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {referencia && comparaveis.length > 1 && (
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">
              parecido com {referencia.mercado.shortName} (cosseno do ângulo entre os vetores de preço)
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {comparaveis
                .filter((v) => v.mercado.id !== referencia.mercado.id)
                .map((v) => {
                  const cos = similaridadeEntreMercados(referencia, v)
                  return (
                    <li key={v.mercado.id} className="text-gray-600">
                      {v.mercado.shortName}:{' '}
                      <span className="font-mono font-semibold">
                        {cos === null ? '—' : cos.toFixed(3).replace('.', ',')}
                      </span>
                    </li>
                  )
                })}
            </ul>
            <p className="mt-1 text-xs text-gray-400">
              perto de 1 = as flechas apontam pro mesmo lado: os dois mercados são caros e baratos nos mesmos
              produtos. Só entram os produtos que os dois mercados têm.
            </p>
          </div>
        )}
      </div>
    </details>
  )
}
