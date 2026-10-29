import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { markets } from '../data'
import type { Product } from '../types'
import CameraPreco from '../colaboracao/CameraPreco'
import type { FotoCapturada } from '../colaboracao/CameraPreco'
import { lerNota } from '../colaboracao/nfce'
import { enviarPreco, repositorioLocal } from '../colaboracao/repositorio'
import SeletorDeProduto from '../colaboracao/SeletorDeProduto'
import { MENSAGEM_DO_STATUS } from '../colaboracao/status'
import type { Envio } from '../colaboracao/tipos'
import { brl } from '../utils'

export default function Contribuir() {
  const [produto, setProduto] = useState<Product | null>(null)
  const [mercadoId, setMercadoId] = useState('')
  const [preco, setPreco] = useState('')
  const [foto, setFoto] = useState<FotoCapturada | null>(null)
  const [notaTexto, setNotaTexto] = useState('')
  const [aceito, setAceito] = useState(false)
  const [resultado, setResultado] = useState<Envio | null>(null)

  const nota = notaTexto.trim() ? lerNota(notaTexto) : null
  const valor = Number(preco.replace(',', '.'))
  const pronto = produto && mercadoId && valor > 0 && foto && aceito

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!pronto || !produto || !foto) return
    setResultado(
      enviarPreco({
        usuarioId: repositorioLocal.usuarioId(),
        produtoId: produto.id,
        mercadoId,
        preco: valor,
        criadoEm: new Date().toISOString(),
        foto: foto.foto,
        captura: foto.captura,
        nota: nota ? { cnpj: nota.cnpj, emissao: nota.emissao, chaveValida: nota.chaveValida } : null,
      }),
    )
  }

  function novoEnvio() {
    setProduto(null)
    setPreco('')
    setFoto(null)
    setNotaTexto('')
    setAceito(false)
    setResultado(null)
  }

  if (resultado) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Envio registrado</h1>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="font-semibold text-gray-900">{MENSAGEM_DO_STATUS[resultado.status]}</p>
          {resultado.motivos.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
              {resultado.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Modo demonstração: o envio fica só neste navegador. Com um servidor, outras pessoas poderiam confirmar o preço.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={novoEnvio} className="rounded-lg bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700">
            enviar outro preço
          </button>
          <Link to="/contribuicoes" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:border-marca-400">
            ver meus envios
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Enviar um preço de gôndola</h1>
        <p className="mt-1 text-sm text-gray-500">
          Está no mercado? Fotografe a etiqueta de preço e ajude a manter os valores certos. O preço só vale depois que
          outra pessoa confirmar.
        </p>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Modo demonstração: não existe servidor ainda, então nada é enviado para fora do seu navegador.
        </p>
      </div>

      <section className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">1. Produto</h2>
        <SeletorDeProduto produto={produto} onEscolher={setProduto} />
      </section>

      <section className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="mercado" className="text-sm font-bold text-gray-900">2. Mercado</label>
          <select id="mercado" value={mercadoId} onChange={(e) => setMercadoId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">escolha</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            <option value="outro">Outro mercado</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="preco" className="text-sm font-bold text-gray-900">3. Preço na etiqueta</label>
          <input id="preco" value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="ex: 6,29" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none" />
          {valor > 0 && <p className="text-xs text-gray-400">{brl(valor)}</p>}
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">4. Foto da etiqueta</h2>
        <p className="text-xs text-gray-400">
          Tire a foto aqui no app: a hora e a localização são gravadas na hora. Foto de galeria vai para revisão manual.
        </p>
        <CameraPreco onFoto={setFoto} />
      </section>

      <section className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">5. Nota fiscal <span className="font-normal text-gray-400">(opcional, dá mais pontos)</span></h2>
        <textarea
          value={notaTexto}
          onChange={(e) => setNotaTexto(e.target.value)}
          rows={2}
          aria-label="link do QR code ou chave de acesso da nota"
          placeholder="cole o link do QR code ou a chave de acesso de 44 dígitos"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none"
        />
        {notaTexto.trim() &&
          (nota ? (
            <p className={`text-xs ${nota.chaveValida ? 'text-marca-700' : 'text-amber-700'}`}>
              {nota.chaveValida ? 'Chave válida' : 'Chave com problema'} · CNPJ {nota.cnpj} · emitida em {nota.emissao}
              {nota.avisos.length > 0 && ` · ${nota.avisos.join(', ')}`}
            </p>
          ) : (
            <p className="text-xs text-amber-700">Não achei uma chave de 44 dígitos nesse texto.</p>
          ))}
        <p className="text-xs text-gray-400">Só uso o CNPJ e o mês da chave. Não guardo CPF, itens da compra nem o link.</p>
      </section>

      <label className="flex items-start gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-1 accent-marca-600" />
        <span>Concordo em enviar a foto, a hora e a localização aproximada deste envio para validar o preço.</span>
      </label>

      <button
        type="submit"
        disabled={!pronto}
        className="w-full rounded-xl bg-marca-600 py-3 text-sm font-semibold text-white transition hover:bg-marca-700 disabled:opacity-40"
      >
        enviar preço
      </button>
    </form>
  )
}
