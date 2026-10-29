import { useState } from 'react'
import { Link } from 'react-router-dom'
import { markets, products } from '../data'
import { decidirRevisao, repositorioLocal, totalDePontos } from '../colaboracao/repositorio'
import type { Envio } from '../colaboracao/tipos'
import { brl, dataHora } from '../utils'

const rotulo: Record<Envio['status'], { texto: string; cor: string }> = {
  em_analise: { texto: 'em análise', cor: 'bg-sky-100 text-sky-700' },
  confirmado: { texto: 'confirmado', cor: 'bg-marca-100 text-marca-700' },
  revisao_manual: { texto: 'revisão manual', cor: 'bg-amber-100 text-amber-700' },
  rejeitado: { texto: 'rejeitado', cor: 'bg-red-100 text-red-700' },
}

export default function MeusEnvios() {
  const usuario = repositorioLocal.usuarioId()
  const [envios, setEnvios] = useState(() => repositorioLocal.listar())
  const [revisor, setRevisor] = useState(false)

  const meus = envios.filter((e) => e.usuarioId === usuario).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  const fila = envios.filter((e) => e.status === 'revisao_manual' || e.status === 'em_analise')

  function decidir(id: string, aprovar: boolean) {
    const novos = decidirRevisao(envios, id, aprovar)
    repositorioLocal.salvar(novos)
    setEnvios(novos)
  }

  function limpar() {
    repositorioLocal.salvar([])
    setEnvios([])
  }

  const nomeProduto = (id: string) => products.find((p) => p.id === id)?.name ?? id
  const nomeMercado = (id: string) => markets.find((m) => m.id === id)?.name ?? 'Outro mercado'

  function Linha({ e, acoes }: { e: Envio; acoes?: boolean }) {
    return (
      <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3">
        {e.foto && <img src={e.foto} alt="etiqueta" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0 flex-1">
          <Link to={`/produto/${e.produtoId}`} className="text-sm font-semibold text-gray-900 hover:text-marca-700">
            {nomeProduto(e.produtoId)}
          </Link>
          <p className="text-xs text-gray-500">
            {nomeMercado(e.mercadoId)} · <b className="text-gray-800">{brl(e.preco)}</b> · {dataHora(e.criadoEm)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rotulo[e.status].cor}`}>{rotulo[e.status].texto}</span>
            {e.status === 'confirmado' && <span className="text-[11px] font-semibold text-marca-700">+{e.pontos} pontos</span>}
            {e.motivos.map((m) => (
              <span key={m} className="text-[11px] text-gray-400">{m}</span>
            ))}
          </div>
          {acoes && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => decidir(e.id, true)} className="rounded-lg bg-marca-600 px-3 py-1 text-xs font-semibold text-white hover:bg-marca-700">aprovar</button>
              <button onClick={() => decidir(e.id, false)} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600">reprovar</button>
            </div>
          )}
        </div>
      </li>
    )
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
          <Link to="/contribuir" className="mt-3 inline-block text-sm font-semibold text-marca-700 hover:underline">enviar o primeiro →</Link>
        </div>
      ) : (
        <ul className="space-y-2">{meus.map((e) => <Linha key={e.id} e={e} />)}</ul>
      )}

      <div className="space-y-3 border-t border-gray-200 pt-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={revisor} onChange={(e) => setRevisor(e.target.checked)} className="accent-marca-600" />
          modo revisor (demonstração): aprovar ou reprovar envios na mão
        </label>
        {revisor &&
          (fila.length === 0 ? (
            <p className="text-sm text-gray-400">Nada esperando revisão.</p>
          ) : (
            <ul className="space-y-2">{fila.map((e) => <Linha key={e.id} e={e} acoes />)}</ul>
          ))}
        {envios.length > 0 && (
          <button onClick={limpar} className="text-xs font-semibold text-gray-400 hover:text-red-600">apagar todos os envios deste navegador</button>
        )}
      </div>
    </div>
  )
}
