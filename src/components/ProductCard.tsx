import { Link } from 'react-router-dom'
import { categories } from '../data'
import type { Product } from '../types'
import { acharMarket, brl, nomeDoPreco, precosDoProduto } from '../utils'
import AddToBasket from './AddToBasket'

export default function ProductCard({ produto }: { produto: Product }) {
  const precos = precosDoProduto(produto.id)
  const maisBarato = precos[0]
  const maisCaro = precos[precos.length - 1]
  const categoria = categories.find((c) => c.id === produto.categoryId)

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4">
      <Link to={`/produto/${produto.id}`} className="text-sm font-semibold text-gray-900 hover:text-green-700">
        {produto.name}
      </Link>
      <p className="mt-0.5 text-xs text-gray-400">
        {produto.brand} · {categoria?.name} · {produto.unit}
      </p>

      <div className="mt-3 flex flex-1 items-end justify-between gap-2">
        <div>
          {maisBarato ? (
            <>
              <p className="text-lg font-bold text-green-700">{brl(maisBarato.price)}</p>
              <p className="text-[11px] text-gray-400">
                {acharMarket(maisBarato.marketId)?.shortName} · {nomeDoPreco(maisBarato.priceType)}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">sem preço</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link to={`/produto/${produto.id}`} className="text-xs font-semibold text-green-700 hover:underline">
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
