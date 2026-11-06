import { describe, expect, it } from 'vitest'
import {
  multiplicarPorEscalar,
  norma,
  produtoEscalar,
  similaridadeCosseno,
  similaridadeEntreMercados,
  vetorDeQuantidades,
} from './vetor'

describe('produtoEscalar', () => {
  it('soma os produtos coordenada a coordenada', () => {
    expect(produtoEscalar([2, 1, 3], [10, 5, 4])).toBe(37)
  })
  it('dá zero para vetores perpendiculares', () => {
    expect(produtoEscalar([1, 0], [0, 7])).toBe(0)
  })
  it('recusa dimensões diferentes', () => {
    expect(() => produtoEscalar([1, 2], [1, 2, 3])).toThrow()
  })
})

describe('multiplicarPorEscalar', () => {
  it('escala todas as coordenadas', () => {
    expect(multiplicarPorEscalar(4, [1, 2, 3])).toEqual([4, 8, 12])
  })
  it('k·(q·p) é igual a (k·q)·p', () => {
    const q = [2, 1, 3]
    const p = [10.5, 5.25, 4]
    expect(produtoEscalar(multiplicarPorEscalar(4, q), p)).toBeCloseTo(4 * produtoEscalar(q, p))
  })
})

describe('norma', () => {
  it('é o comprimento do vetor', () => {
    expect(norma([3, 4])).toBe(5)
  })
})

describe('similaridadeCosseno', () => {
  it('é 1 para a mesma direção, mesmo com comprimentos diferentes', () => {
    expect(similaridadeCosseno([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
  })
  it('é 0 para perpendiculares', () => {
    expect(similaridadeCosseno([1, 0], [0, 1])).toBe(0)
  })
  it('não existe para o vetor nulo', () => {
    expect(similaridadeCosseno([0, 0], [1, 2])).toBeNull()
  })
})

describe('vetorDeQuantidades', () => {
  it('segue a ordem da cesta', () => {
    expect(
      vetorDeQuantidades([
        { productId: 'a', qtd: 2 },
        { productId: 'b', qtd: 5 },
      ]),
    ).toEqual([2, 5])
  })
})

describe('similaridadeEntreMercados', () => {
  it('usa só os itens que os dois mercados têm', () => {
    const a = { precos: [10, 4, 0], temItem: [true, true, false] }
    const b = { precos: [20, 8, 9], temItem: [true, true, true] }
    expect(similaridadeEntreMercados(a, b)).toBeCloseTo(1)
  })
  it('devolve null com menos de 2 itens em comum', () => {
    const a = { precos: [10, 0], temItem: [true, false] }
    const b = { precos: [20, 8], temItem: [true, true] }
    expect(similaridadeEntreMercados(a, b)).toBeNull()
  })
})
