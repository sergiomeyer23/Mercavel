import { describe, expect, it } from 'vitest'
import { casarOrfaos, tamanhoExplicito, tokensDoNome } from './casar-por-nome.mjs'

describe('tamanhoExplicito', () => {
  it('converte para a unidade base', () => {
    expect(tamanhoExplicito('Arroz 5kg')).toEqual({ tipo: 'massa', valor: 5000 })
    expect(tamanhoExplicito('Leite 1,5 L')).toEqual({ tipo: 'volume', valor: 1500 })
    expect(tamanhoExplicito('Biscoito 500 g')).toEqual({ tipo: 'massa', valor: 500 })
  })
  it('devolve null sem tamanho', () => {
    expect(tamanhoExplicito('Banana prata')).toBeNull()
  })
})

describe('tokensDoNome', () => {
  it('tira marca, tamanho e palavras vazias', () => {
    expect(tokensDoNome('Café Pilão Torrado e Moído 500g', 'Pilão')).toEqual(['cafe', 'torrado', 'moido'])
  })
})

const item = (mercado, ean, nome, marca) => ({ mercado, ean, nome, marca })

describe('casarOrfaos', () => {
  it('casa o mesmo produto com nomes parecidos e EANs diferentes', () => {
    const grupos = casarOrfaos([
      item('muffato', '1', 'Biscoito Recheado Passatempo Chocolate 130g', 'Passatempo'),
      item('atacadao', '2', 'Biscoito Passatempo Recheado Chocolate 130g', 'Passatempo'),
    ])
    expect(grupos).toHaveLength(1)
    expect(grupos[0].map((i) => i.mercado).sort()).toEqual(['atacadao', 'muffato'])
  })
  it('não casa sabores diferentes', () => {
    expect(
      casarOrfaos([
        item('muffato', '1', 'Biscoito Recheado Passatempo Chocolate 130g', 'Passatempo'),
        item('atacadao', '2', 'Biscoito Recheado Passatempo Morango 130g', 'Passatempo'),
      ]),
    ).toHaveLength(0)
  })
  it('não casa tamanhos diferentes', () => {
    expect(
      casarOrfaos([
        item('muffato', '1', 'Leite Condensado Moça 395g', 'Moça'),
        item('atacadao', '2', 'Leite Condensado Moça 270g', 'Moça'),
      ]),
    ).toHaveLength(0)
  })
  it('não casa quando só um é zero lactose', () => {
    expect(
      casarOrfaos([
        item('muffato', '1', 'Leite UHT Italac 1L', 'Italac'),
        item('atacadao', '2', 'Leite UHT Italac Zero Lactose 1L', 'Italac'),
      ]),
    ).toHaveLength(0)
  })
  it('na dúvida (dois candidatos iguais), não casa', () => {
    expect(
      casarOrfaos([
        item('muffato', '1', 'Maionese Hellmanns Tradicional 500g', 'Hellmanns'),
        item('atacadao', '2', 'Maionese Hellmanns Tradicional 500g', 'Hellmanns'),
        item('atacadao', '3', 'Maionese Hellmanns Tradicional 500g', 'Hellmanns'),
      ]),
    ).toHaveLength(0)
  })
})
