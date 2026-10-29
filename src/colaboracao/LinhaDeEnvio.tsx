import { Link } from 'react-router-dom'
import { markets, products } from '../data'
import { brl, dataHora } from '../utils'
import { ROTULO_DO_STATUS } from './status'
import type { Envio } from './tipos'

interface Props {
  envio: Envio
  onDecidir?: (id: string, aprovar: boolean) => void
}

export default function LinhaDeEnvio({ envio, onDecidir }: Props) {
  const produto = products.find((p) => p.id === envio.produtoId)
  const mercado = markets.find((m) => m.id === envio.mercadoId)
  const status = ROTULO_DO_STATUS[envio.status]

  return (
    <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3">
      {envio.foto && <img src={envio.foto} alt="etiqueta" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <Link to={`/produto/${envio.produtoId}`} className="text-sm font-semibold text-gray-900 hover:text-marca-700">
          {produto?.name ?? envio.produtoId}
        </Link>
        <p className="text-xs text-gray-500">
          {mercado?.name ?? 'Outro mercado'} · <b className="text-gray-800">{brl(envio.preco)}</b> · {dataHora(envio.criadoEm)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cor}`}>{status.texto}</span>
          {envio.status === 'confirmado' && <span className="text-[11px] font-semibold text-marca-700">+{envio.pontos} pontos</span>}
          {envio.motivos.map((motivo) => (
            <span key={motivo} className="text-[11px] text-gray-400">{motivo}</span>
          ))}
        </div>
        {onDecidir && (
          <div className="mt-2 flex gap-2">
            <button onClick={() => onDecidir(envio.id, true)} className="rounded-lg bg-marca-600 px-3 py-1 text-xs font-semibold text-white hover:bg-marca-700">
              aprovar
            </button>
            <button onClick={() => onDecidir(envio.id, false)} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600">
              reprovar
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
