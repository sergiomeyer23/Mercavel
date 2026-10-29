import { useState } from 'react'
import { Link } from 'react-router-dom'
import LinhaDeEnvio from '../colaboracao/LinhaDeEnvio'
import { decidirRevisao, repositorioLocal, totalDePontos } from '../colaboracao/repositorio'

export default function MeusEnvios() {
  const usuario = repositorioLocal.usuarioId()
  const [envios, setEnvios] = useState(() => repositorioLocal.listar())
  const [modoRevisor, setModoRevisor] = useState(false)

  const meus = envios.filter((e) => e.usuarioId === usuario).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  const aguardandoRevisao = envios.filter((e) => e.status === 'revisao_manual' || e.status === 'em_analise')

  function salvar(novos: typeof envios) {
    repositorioLocal.salvar(novos)
    setEnvios(novos)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meus envios</h1>
          <p className="mt-1 text-sm text-gray-500">Preços de gôndola que você mandou. Pontos só contam quando o envio é confirmado.</p>
        </div>
        <div className="rounded-2xl bg-marca-600 px-5 py-3 text-white">
          <p className="text-[11px] font-semibold uppercase text-marca-200">seus pontos</p>
          <p className="text-3xl font-bold">{totalDePontos(envios, usuario)}</p>
        </div>
      </div>

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Modo demonstração: os envios ficam só neste navegador e os pontos ainda não têm troca por nada.
      </p>

      {meus.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Você ainda não enviou nenhum preço.</p>
          <Link to="/contribuir" className="mt-3 inline-block text-sm font-semibold text-marca-700 hover:underline">
            enviar o primeiro →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {meus.map((e) => (
            <LinhaDeEnvio key={e.id} envio={e} />
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-gray-200 pt-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={modoRevisor} onChange={(e) => setModoRevisor(e.target.checked)} className="accent-marca-600" />
          modo revisor (demonstração): aprovar ou reprovar envios na mão
        </label>
        {modoRevisor &&
          (aguardandoRevisao.length === 0 ? (
            <p className="text-sm text-gray-400">Nada esperando revisão.</p>
          ) : (
            <ul className="space-y-2">
              {aguardandoRevisao.map((e) => (
                <LinhaDeEnvio key={e.id} envio={e} onDecidir={(id, aprovar) => salvar(decidirRevisao(envios, id, aprovar))} />
              ))}
            </ul>
          ))}
        {envios.length > 0 && (
          <button onClick={() => salvar([])} className="text-xs font-semibold text-gray-400 hover:text-red-600">
            apagar todos os envios deste navegador
          </button>
        )}
      </div>
    </div>
  )
}
