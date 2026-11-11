import { describe, expect, it } from 'vitest'
import { acharProduto, mercadosComPrecos, prices, products } from './data'
import {
  acharProdutoComparavel,
  caminhoDaBusca,
  diasDesde,
  idadeDoPreco,
  mediaValores,
  precoPorUnidade,
  precoVelho,
  precosDoProduto,
} from './utils'

describe('precoPorUnidade', () => {
  it('converte gramas e mililitros para kg e L', () => {
    expect(precoPorUnidade(5, 500, 'G')).toEqual({ valor: 10, rotulo: 'kg' })
    expect(precoPorUnidade(3, 500, 'ML')).toEqual({ valor: 6, rotulo: 'L' })
  })
  it('mantém kg e L', () => {
    expect(precoPorUnidade(20, 5, 'KG')).toEqual({ valor: 4, rotulo: 'kg' })
    expect(precoPorUnidade(5, 2, 'L')).toEqual({ valor: 2.5, rotulo: 'L' })
  })
  it('devolve null para unidades que não são peso nem volume', () => {
    expect(precoPorUnidade(10, 12, 'UN')).toBeNull()
    expect(precoPorUnidade(10, 0, 'KG')).toBeNull()
  })
})

describe('idade do preço', () => {
  const agora = new Date('2026-10-27T12:00:00Z')
  it('conta os dias desde a coleta', () => {
    expect(diasDesde('2026-10-27T01:00:00Z', agora)).toBe(0)
    expect(diasDesde('2026-10-14T12:00:00Z', agora)).toBe(13)
    expect(diasDesde('2026-11-01T12:00:00Z', agora)).toBe(0)
  })
  it('escreve a idade em português', () => {
    expect(idadeDoPreco('2026-10-27T01:00:00Z', agora)).toBe('hoje')
    expect(idadeDoPreco('2026-10-26T01:00:00Z', agora)).toBe('há 1 dia')
    expect(idadeDoPreco('2026-10-14T12:00:00Z', agora)).toBe('há 13 dias')
  })
  it('marca como velho depois de 7 dias', () => {
    expect(precoVelho('2026-10-20T12:00:00Z', agora)).toBe(false)
    expect(precoVelho('2026-10-19T11:00:00Z', agora)).toBe(true)
  })
})

describe('precosDoProduto', () => {
  it('devolve só o que tem estoque, do mais barato pro mais caro', () => {
    for (const produto of products) {
      const lista = precosDoProduto(produto.id)
      expect(lista.every((p) => p.availability === 'IN_STOCK')).toBe(true)
      expect(lista.map((p) => p.price)).toEqual([...lista.map((p) => p.price)].sort((a, b) => a - b))
    }
  })
})

describe('mediaValores e busca', () => {
  it('calcula a média e trata lista vazia', () => {
    expect(mediaValores([2, 4])).toBe(3)
    expect(mediaValores([])).toBeNull()
  })
  it('monta a URL de busca escapando o termo', () => {
    expect(caminhoDaBusca('  leite & café ')).toBe('/busca?q=leite%20%26%20caf%C3%A9')
  })
})

describe('integridade dos dados', () => {
  it('todo preço aponta para um produto existente, com valor positivo', () => {
    const ids = new Set(products.map((p) => p.id))
    for (const p of prices) {
      expect(ids.has(p.productId)).toBe(true)
      expect(p.price).toBeGreaterThan(0)
    }
  })
  it('não repete o id de preço', () => {
    expect(new Set(prices.map((p) => p.id)).size).toBe(prices.length)
  })
})

describe('acharProduto', () => {
  it('acha pelo id e, se o nome mudou, pelo final do id', () => {
    const p = products[0]
    expect(acharProduto(p.id)).toBe(p)
    const final = p.id.slice(p.id.lastIndexOf('-'))
    expect(acharProduto('nome-antigo' + final)).toBe(p)
    expect(acharProduto('nao-existe-zzzzzz')).toBeUndefined()
    expect(acharProduto(undefined)).toBeUndefined()
  })
})

describe('acharProdutoComparavel', () => {
  it('prefere o produto que está em mais mercados', () => {
    const arroz = acharProdutoComparavel(/^arroz /i)
    expect(arroz).toBeDefined()
    const melhorPossivel = Math.max(
      ...products.filter((p) => /^arroz /i.test(p.name)).map((p) => precosDoProduto(p.id).length),
    )
    expect(precosDoProduto(arroz!.id).length).toBe(melhorPossivel)
  })
  it('não devolve produto que só tem um mercado', () => {
    expect(acharProdutoComparavel(/isso nao existe em lugar nenhum/)).toBeUndefined()
  })
})

describe('base', () => {
  it('todo produto tem estoque em 2+ mercados e todo preço é de um mercado com coleta', () => {
    for (const p of products) expect(precosDoProduto(p.id).length).toBeGreaterThanOrEqual(2)
    const ids = new Set(mercadosComPrecos.map((m) => m.id))
    for (const pr of prices) expect(ids.has(pr.marketId)).toBe(true)
    for (const pr of prices) expect(Number.isNaN(new Date(pr.collectedAt).getTime())).toBe(false)
  })
})
