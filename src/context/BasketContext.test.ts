import { describe, expect, it } from 'vitest'
import { cestaDoTexto, cestaParaTexto, limparItens } from './BasketContext'

describe('limparItens', () => {
  it('descarta lixo, repetidos e quantidades inválidas', () => {
    const itens = limparItens([
      { productId: 'a', qtd: 2 },
      { productId: 'a', qtd: 5 },
      { productId: '', qtd: 1 },
      { productId: 'b', qtd: 0 },
      { productId: 'c', qtd: NaN },
      { productId: 'd', qtd: 5000 },
      null,
      'x',
    ])
    expect(itens).toEqual([
      { productId: 'a', qtd: 2 },
      { productId: 'd', qtd: 999 },
    ])
  })
  it('devolve lista vazia se não for array', () => {
    expect(limparItens({})).toEqual([])
  })
})

describe('texto da cesta compartilhada', () => {
  it('ida e volta', () => {
    const itens = [
      { productId: 'arroz', qtd: 2 },
      { productId: 'leite', qtd: 6 },
    ]
    expect(cestaDoTexto(cestaParaTexto(itens))).toEqual(itens)
  })
  it('ignora partes quebradas', () => {
    expect(cestaDoTexto('arroz:abc,leite:3,,:2')).toEqual([{ productId: 'leite', qtd: 3 }])
  })
})
