import { useEffect, useState } from 'react'
import type { Product } from '../types'
import ProductCard from './ProductCard'

const PASSO = 48

// com milhares de produtos não dá pra desenhar tudo de uma vez: mostra 48 e libera mais a pedido
// `chave` identifica a lista (outra busca, outro filtro): quando muda, volta pro começo
export function useLimite<T>(lista: T[], chave: string, passo = PASSO) {
  const [limite, setLimite] = useState(passo)
  useEffect(() => setLimite(passo), [chave, passo])
  return {
    visiveis: lista.slice(0, limite),
    restam: Math.max(0, lista.length - limite),
    maisUm: () => setLimite((l) => l + passo),
  }
}

export function BotaoMais({ restam, onClick }: { restam: number; onClick: () => void }) {
  if (restam <= 0) return null
  return (
    <div className="mt-4 text-center">
      <button
        onClick={onClick}
        className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-600 transition hover:border-marca-400 hover:text-marca-700"
      >
        mostrar mais ({restam.toLocaleString('pt-BR')} restantes)
      </button>
    </div>
  )
}

export default function GradeProdutos({ produtos }: { produtos: Product[] }) {
  const { visiveis, restam, maisUm } = useLimite(produtos, `${produtos.length}:${produtos[0]?.id}`)
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visiveis.map((p) => (
          <ProductCard key={p.id} produto={p} />
        ))}
      </div>
      <BotaoMais restam={restam} onClick={maisUm} />
    </>
  )
}
