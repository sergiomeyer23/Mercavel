import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export interface ItemCesta {
  productId: string
  qtd: number
}

interface CestaContexto {
  itens: ItemCesta[]
  qtdItens: number
  adicionar: (productId: string) => void
  remover: (productId: string) => void
  mudarQtd: (productId: string, qtd: number) => void
  limpar: () => void
  substituir: (itens: ItemCesta[]) => void
}

const CestaContext = createContext<CestaContexto | null>(null)

// aceita qualquer coisa e devolve só itens válidos, sem repetidos e com qtd entre 1 e 999
export function limparItens(dados: unknown): ItemCesta[] {
  if (!Array.isArray(dados)) return []
  const vistos = new Set<string>()
  const itens: ItemCesta[] = []
  for (const item of dados) {
    if (!item || typeof item !== 'object') continue
    const { productId, qtd } = item as { productId?: unknown; qtd?: unknown }
    if (typeof productId !== 'string' || productId.length === 0 || vistos.has(productId)) continue
    if (typeof qtd !== 'number' || !Number.isFinite(qtd)) continue
    const quantidade = Math.min(Math.floor(qtd), 999)
    if (quantidade < 1) continue
    vistos.add(productId)
    itens.push({ productId, qtd: quantidade })
  }
  return itens
}

// formato do link de compartilhar: id:qtd,id:qtd
export function cestaParaTexto(itens: ItemCesta[]) {
  return itens.map((i) => `${i.productId}:${i.qtd}`).join(',')
}

export function cestaDoTexto(texto: string): ItemCesta[] {
  return limparItens(
    texto.split(',').map((parte) => {
      const [productId, qtd] = parte.split(':')
      return { productId, qtd: Number(qtd) }
    }),
  )
}

function lerCesta(): ItemCesta[] {
  try {
    const salvo = localStorage.getItem('cesta')
    return salvo ? limparItens(JSON.parse(salvo)) : []
  } catch {
    return []
  }
}

export function CestaProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCesta[]>(lerCesta)

  useEffect(() => {
    try {
      localStorage.setItem('cesta', JSON.stringify(itens))
    } catch {
      // armazenamento indisponível ou cheio: a cesta continua funcionando na sessão
    }
  }, [itens])

  // tudo aqui atualiza a cesta pela forma funcional (atual => ...) porque o
  // mesmo clique pode chamar essas funções várias vezes seguidas - o botão da
  // cesta de exemplo adiciona 8 produtos de uma vez. lendo "itens" direto, todas
  // as chamadas enxergariam a mesma lista velha e só a última valeria.
  function adicionar(productId: string) {
    setItens((atual) => {
      const jaTem = atual.find((i) => i.productId === productId)
      if (!jaTem) {
        return [...atual, { productId, qtd: 1 }]
      }
      return atual.map((i) => (i.productId === productId ? { ...i, qtd: i.qtd + 1 } : i))
    })
  }

  function remover(productId: string) {
    setItens((atual) => atual.filter((i) => i.productId !== productId))
  }

  function mudarQtd(productId: string, qtd: number) {
    if (qtd <= 0) {
      remover(productId)
      return
    }
    setItens((atual) => atual.map((i) => (i.productId === productId ? { ...i, qtd } : i)))
  }

  function limpar() {
    setItens([])
  }

  function substituir(novos: ItemCesta[]) {
    setItens(limparItens(novos))
  }

  const qtdItens = itens.reduce((total, i) => total + i.qtd, 0)

  return (
    <CestaContext.Provider value={{ itens, qtdItens, adicionar, remover, mudarQtd, limpar, substituir }}>
      {children}
    </CestaContext.Provider>
  )
}

export function useCesta() {
  const ctx = useContext(CestaContext)
  if (!ctx) {
    throw new Error('useCesta precisa estar dentro do CestaProvider')
  }
  return ctx
}
