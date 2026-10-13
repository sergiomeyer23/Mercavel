import { Link } from 'react-router-dom'
import { categories, prices, products } from '../data'
import { brl, mediaValores } from '../utils'

export default function Categorias() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Categorias</h1>
      <p className="text-sm text-gray-500">
        cada produto tem uma categoria fixa aqui da plataforma, pra dar pra comparar mercados que organizam as
        prateleiras de jeitos diferentes
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const ids = products.filter((p) => p.categoryId === cat.id).map((p) => p.id)
          const valores = prices
            .filter((pr) => ids.includes(pr.productId) && pr.availability === 'IN_STOCK')
            .map((pr) => pr.price)
          const media = mediaValores(valores)
          return (
            <Link
              key={cat.id}
              to={`/categoria/${cat.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:border-marca-400"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">{cat.name}</h2>
                <span className="text-xs text-gray-400">{ids.length} produtos</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{cat.description}</p>
              <p className="mt-3 text-sm text-gray-600">
                preço médio: <span className="font-bold text-marca-700">{media !== null ? brl(media) : '—'}</span>
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
