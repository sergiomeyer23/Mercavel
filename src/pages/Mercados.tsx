import { Link } from 'react-router-dom'
import { markets, prices } from '../data'
import { dataHora } from '../utils'

export default function Mercados() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Supermercados monitorados</h1>
      <p className="text-sm text-gray-500">
        os preços fictícios do site ficam "coletados" nesses mercados, cada um com sua data de coleta
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => {
          const obs = prices.filter((p) => p.marketId === m.id)
          const qtdProdutos = new Set(obs.map((o) => o.productId)).size
          let ultima = ''
          for (const o of obs) {
            if (o.collectedAt > ultima) ultima = o.collectedAt
          }
          return (
            <Link
              key={m.id}
              to={`/mercado/${m.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:border-marca-400"
            >
              <h2 className="font-semibold text-gray-800">{m.name}</h2>
              <p className="text-xs text-gray-400">
                {m.city}/{m.state}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {qtdProdutos} produtos · {obs.length} preços
              </p>
              <p className="text-xs text-gray-400">última coleta: {ultima ? dataHora(ultima) : '—'}</p>
              <p className="mt-2 text-xs text-gray-500">
                {m.onlineShoppingAvailable ? '✓ tem site pra comprar online' : 'só loja física'}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
