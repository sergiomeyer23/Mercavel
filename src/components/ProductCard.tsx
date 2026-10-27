import { Link } from 'react-router-dom'
import { categories } from '../data'
import type { Product } from '../types'
import { acharMarket, brl, nomeDoPreco, precosDoProduto } from '../utils'
import AddToBasket from './AddToBasket'
import IconeComida from './IconeComida'
import { emojiDoProduto } from '../emoji'

export default function ProductCard({ produto }: { produto: Product }) {
  const precos = precosDoProduto(produto.id)
  const maisBarato = precos[0]
  const maisCaro = precos[precos.length - 1]
  const categoria = categories.find((c) => c.id === produto.categoryId)

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-marca-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <IconeComida emoji={emojiDoProduto(produto.id, produto.categoryId)} />
        <div className="min-w-0">
          <Link to={`/produto/${produto.id}`} className="text-sm font-semibold text-gray-900 hover:text-marca-700">
            {produto.name}
          </Link>
          <p className="mt-0.5 text-xs text-gray-400">
            {categoria?.name} · {produto.unit}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-1 items-end justify-between gap-2">
        <div>
          {maisBarato ? (
            <>
              <p className="text-lg font-bold text-marca-700">{brl(maisBarato.price)}</p>
              <p className="text-[11px] text-gray-400">
                {acharMarket(maisBarato.marketId)?.shortName} · {nomeDoPreco(maisBarato.priceType)}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">sem preço</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link to={`/produto/${produto.id}`} className="text-xs font-semibold text-marca-700 hover:underline">
            comparar ({precos.length})
          </Link>
          <AddToBasket productId={produto.id} />
        </div>
      </div>

      {maisBarato && maisCaro && maisCaro.price > maisBarato.price && (
        <p className="mt-2 border-t border-gray-100 pt-2 text-[11px] text-gray-400">
          diferença de {brl(maisCaro.price - maisBarato.price)} entre mercados
        </p>
      )}
    </div>
  )
}
