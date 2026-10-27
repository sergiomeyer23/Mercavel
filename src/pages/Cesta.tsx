import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Chip from '../components/Chip'
import MarketLogo from '../components/MarketLogo'
import IconeComida from '../components/IconeComida'
import { emojiDoProduto } from '../emoji'
import { markets, products } from '../data'
import { cestaDoTexto, cestaParaTexto, useCesta } from '../context/BasketContext'
import type { PriceType } from '../types'
import { acharMarket, brl, precosDoProduto } from '../utils'

// cesta de exemplo pra não começar do zero. só entram produtos com preço em pelo
// menos 2 mercados, senão a comparação da demo não faz sentido
const candidatosModelo = [
  'arroz-tipo1-5kg',
  'feijao-carioca-1kg',
  'cafe-torrado-500g',
  'leite-uht-integral-1l',
  'detergente-neutro-500ml',
  'sabonete-85g',
  'file-peito-frango-kg',
  'refrigerante-cola-2l',
]

const cestaModelo = (() => {
  const comparaveis = (id: string) => precosDoProduto(id).length >= 2
  const fixos = candidatosModelo.filter(comparaveis)
  const extras = products.map((p) => p.id).filter((id) => !fixos.includes(id) && comparaveis(id))
  return [...fixos, ...extras].slice(0, 8)
})()

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

  // total da cesta em cada mercado. se o mercado não tiver algum item, não entra na disputa
  const resultados = markets
    .map((m) => {
      let total = 0
      let faltando = 0
      const faltantes: string[] = []
      for (const item of itens) {
        const obs = precosDoProduto(item.productId, tipo === 'todos' ? undefined : tipo).find(
          (o) => o.marketId === m.id,
        )
        if (obs) {
          total += obs.price * item.qtd
        } else {
          faltando += 1
          faltantes.push(products.find((p) => p.id === item.productId)?.name ?? item.productId)
        }
      }
      return { mercado: m, total, faltando, faltantes }
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
                      <IconeComida emoji={emojiDoProduto(produto.id, produto.categoryId)} tamanho="sm" />
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

      <p className="text-xs text-gray-400">
        obs: os totais comparam o mesmo tipo de preço entre os mercados (ex: online com online).
        preços coletados nos sites dos mercados.
      </p>
    </div>
  )
}
