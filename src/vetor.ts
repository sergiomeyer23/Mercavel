// A cesta vista como álgebra linear.
//
// Cada produto da cesta é um eixo. A cesta vira o vetor de quantidades q, e
// cada mercado vira um vetor de preços p, na mesma ordem dos eixos. O total
// que você paga é o produto escalar q·p, um número só (um escalar).
// Multiplicar a cesta por um número k (ex: 4 semanas) é multiplicar o vetor
// por um escalar: k·q·p = (k·q)·p.

import type { PriceType } from './types'
import { precosDoProduto } from './utils'

export type Vetor = number[]

interface ItemDaCesta {
  productId: string
  qtd: number
}

function exigirMesmoTamanho(a: Vetor, b: Vetor) {
  if (a.length !== b.length) {
    throw new Error(`vetores com dimensões diferentes: ${a.length} e ${b.length}`)
  }
}

// a·b = soma de a[i] * b[i]
export function produtoEscalar(a: Vetor, b: Vetor): number {
  exigirMesmoTamanho(a, b)
  return a.reduce((soma, x, i) => soma + x * b[i], 0)
}

// k·a: estica ou encolhe o vetor sem mudar a direção (k > 0)
export function multiplicarPorEscalar(k: number, a: Vetor): Vetor {
  return a.map((x) => k * x)
}

// comprimento do vetor: raiz de a·a
export function norma(a: Vetor): number {
  return Math.sqrt(produtoEscalar(a, a))
}

// cosseno do ângulo entre dois vetores, de -1 a 1. Perto de 1 as flechas
// apontam pro mesmo lado. Com vetor nulo o ângulo não existe: devolve null.
export function similaridadeCosseno(a: Vetor, b: Vetor): number | null {
  const na = norma(a)
  const nb = norma(b)
  if (na === 0 || nb === 0) return null
  // clamp: erro de ponto flutuante pode dar 1.0000000000000002
  return Math.max(-1, Math.min(1, produtoEscalar(a, b) / (na * nb)))
}

// quantidades dos itens, na ordem da cesta
export function vetorDeQuantidades(itens: ItemDaCesta[]): Vetor {
  return itens.map((i) => i.qtd)
}

export interface VetorDePrecos {
  // p[i] = preço do item i no mercado; 0 quando o mercado não tem o item
  precos: Vetor
  // temItem[i] = false quando o mercado não tem o item i
  temItem: boolean[]
}

export function vetorDePrecos(itens: ItemDaCesta[], marketId: string, tipo?: PriceType): VetorDePrecos {
  const precos: Vetor = []
  const temItem: boolean[] = []
  for (const item of itens) {
    const obs = precosDoProduto(item.productId, tipo).find((o) => o.marketId === marketId)
    precos.push(obs ? obs.price : 0)
    temItem.push(obs !== undefined)
  }
  return { precos, temItem }
}

// ângulo entre os perfis de preço de dois mercados, só nos itens que os dois
// têm. Mede se um mercado é caro/barato nos mesmos itens que o outro.
// Precisa de pelo menos 2 itens em comum, senão não há o que comparar.
export function similaridadeEntreMercados(a: VetorDePrecos, b: VetorDePrecos): number | null {
  const comuns = a.temItem.map((tem, i) => tem && b.temItem[i])
  if (comuns.filter(Boolean).length < 2) return null
  return similaridadeCosseno(
    a.precos.filter((_, i) => comuns[i]),
    b.precos.filter((_, i) => comuns[i]),
  )
}
