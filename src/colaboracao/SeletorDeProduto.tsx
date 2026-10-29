import { useCallback, useMemo, useState } from 'react'
import { products } from '../data'
import IconeComida from '../components/IconeComida'
import { emojiDoProduto } from '../emoji'
import type { Product } from '../types'
import LeitorCodigo, { temLeitor } from './LeitorCodigo'

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const botaoPequeno = 'rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-marca-400'

interface Props {
  produto: Product | null
  onEscolher: (produto: Product | null) => void
}

// Escolhe o produto por nome ou código de barras. O código só serve pra achar o produto e nunca aparece.
export default function SeletorDeProduto({ produto, onEscolher }: Props) {
  const [busca, setBusca] = useState('')
  const [codigo, setCodigo] = useState('')
  const [lendo, setLendo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const sugestoes = useMemo(() => {
    const palavras = semAcento(busca.trim()).split(/\s+/).filter(Boolean)
    if (palavras.length === 0) return []
    return products.filter((p) => palavras.every((w) => semAcento(`${p.name} ${p.brand}`).includes(w))).slice(0, 8)
  }, [busca])

  const procurarPorCodigo = useCallback(
    async (digitado: string) => {
      const ean = digitado.replace(/\D/g, '').replace(/^0+/, '')
      setLendo(false)
      if (ean.length < 8) return setAviso('Código de barras muito curto.')
      // o mapa é grande e só serve aqui, então carrega sob demanda
      const eanPorProduto = (await import('../data/ean-produtos.json')).default as Record<string, string>
      const id = Object.keys(eanPorProduto).find((chave) => eanPorProduto[chave] === ean)
      const achado = products.find((p) => p.id === id)
      if (!achado) return setAviso('Esse produto ainda não está na base. Procure pelo nome.')
      setAviso(null)
      onEscolher(achado)
    },
    [onEscolher],
  )

  if (produto) {
    return (
      <div className="flex items-center gap-3">
        <IconeComida emoji={emojiDoProduto(produto.name, produto.subcategory, produto.categoryId)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{produto.name}</p>
          <p className="text-xs text-gray-400">{produto.unit}</p>
        </div>
        <button type="button" onClick={() => onEscolher(null)} className="text-xs font-semibold text-gray-400 hover:text-red-600">
          trocar
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="nome do produto, ex: arroz 5kg"
        aria-label="produto que você está vendo"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none"
      />
      {sugestoes.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {sugestoes.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onEscolher(p)} className="w-full px-3 py-2 text-left text-sm hover:bg-marca-50">
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
        <span className="text-gray-400">ou pelo código de barras:</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          inputMode="numeric"
          placeholder="digite o código"
          aria-label="código de barras"
          className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca-500 focus:outline-none"
        />
        <button type="button" onClick={() => void procurarPorCodigo(codigo)} className={botaoPequeno}>
          buscar
        </button>
        {temLeitor() && (
          <button type="button" onClick={() => setLendo((aberto) => !aberto)} className={botaoPequeno}>
            {lendo ? 'fechar leitor' : 'escanear'}
          </button>
        )}
      </div>
      {lendo && <LeitorCodigo onCodigo={(lido) => void procurarPorCodigo(lido)} />}
      {aviso && <p className="text-xs text-amber-700">{aviso}</p>}
    </>
  )
}
