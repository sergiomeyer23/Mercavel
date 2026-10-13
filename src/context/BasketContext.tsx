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
}

const CestaContext = createContext<CestaContexto | null>(null)

function lerCesta(): ItemCesta[] {
  try {
    const salvo = localStorage.getItem('cesta')
    return salvo ? JSON.parse(salvo) : []
  } catch {
    return []
  }
}

export function CestaProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCesta[]>(lerCesta)

  useEffect(() => {
    localStorage.setItem('cesta', JSON.stringify(itens))
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

  const qtdItens = itens.reduce((total, i) => total + i.qtd, 0)

  return (
    <CestaContext.Provider value={{ itens, qtdItens, adicionar, remover, mudarQtd, limpar }}>
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
