import { Link } from 'react-router-dom'
import { markets } from '../data'
import { brl, dataHora } from '../utils'
import { repositorioLocal } from './repositorio'
import { ROTULO_DO_STATUS } from './status'

// preços de gôndola enviados pela comunidade. no modo demonstração só aparecem os deste navegador
export default function EnviosDoProduto({ produtoId }: { produtoId: string }) {
  const envios = repositorioLocal
    .listar()
    .filter((e) => e.produtoId === produtoId && e.status !== 'rejeitado')
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900">Preço de gôndola (enviado por pessoas)</h2>
        <Link to="/contribuir" className="text-xs font-semibold text-marca-700 hover:underline">
          enviar um preço →
        </Link>
      </div>
      {envios.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">
          Ninguém enviou o preço de loja física desse produto ainda. Os valores acima vêm dos sites dos mercados.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100">
          {envios.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="font-semibold text-gray-800">{markets.find((m) => m.id === e.mercadoId)?.name ?? 'Outro mercado'}</span>
              <span className="font-bold text-gray-900">{brl(e.preco)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROTULO_DO_STATUS[e.status].cor}`}>
                {ROTULO_DO_STATUS[e.status].texto}
              </span>
              <span className="text-xs text-gray-400">{dataHora(e.criadoEm)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-gray-400">Modo demonstração: só aparecem envios feitos neste navegador.</p>
    </div>
  )
}
