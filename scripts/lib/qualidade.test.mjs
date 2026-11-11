import { describe, expect, it } from 'vitest'
import { mercadosCompativeis, problemasDaColeta, unidadesNaEmbalagem } from './qualidade.mjs'

const ORDEM = ['muffato', 'festval', 'atacadao']

describe('unidadesNaEmbalagem', () => {
  it('le o multiplicador do nome', () => {
    expect(unidadesNaEmbalagem('Sabonete Palmolive 8x85g')).toBe(8)
    expect(unidadesNaEmbalagem('Refrigerante Coca-Cola 6un 350ml')).toBe(6)
    expect(unidadesNaEmbalagem('Limpador Veja com 3 unidades de 500ml')).toBe(3)
  })
  it('sem multiplicador e 1', () => {
    expect(unidadesNaEmbalagem('Refrigerante Coca-Cola Lata 350ml')).toBe(1)
    expect(unidadesNaEmbalagem('Absorvente Always 32un')).toBe(1)
  })
})

describe('mercadosCompativeis', () => {
  it('tira o pacote comparado com a unidade', () => {
    const ofertas = {
      muffato: { nome: 'Sabonete Palmolive 85g', preco: 3.1 },
      atacadao: { nome: 'Sabonete Palmolive 8x85g', preco: 15.5 },
    }
    expect(mercadosCompativeis(ofertas, ORDEM)).toEqual(['muffato'])
  })
  it('mantem quando so o jeito de escrever muda', () => {
    const ofertas = {
      muffato: { nome: 'Iogurte Batavo 6un 540g', preco: 9.9 },
      festval: { nome: 'Iogurte Batavo 540g', preco: 10.5 },
    }
    expect(mercadosCompativeis(ofertas, ORDEM)).toEqual(['muffato', 'festval'])
  })
  it('tira preco absurdo mesmo sem pista no nome', () => {
    const ofertas = {
      festval: { nome: 'Bala Mentos 38g', preco: 3.98 },
      atacadao: { nome: 'Drops Mentos Fruit 16 un', preco: 33.9 },
    }
    expect(mercadosCompativeis(ofertas, ORDEM)).toEqual(['festval'])
  })
  it('mantem diferenca normal de preco', () => {
    const ofertas = {
      muffato: { nome: 'Arroz 5kg', preco: 30 },
      festval: { nome: 'Arroz 5kg', preco: 39 },
      atacadao: { nome: 'Arroz 5kg', preco: 25 },
    }
    expect(mercadosCompativeis(ofertas, ORDEM)).toEqual(ORDEM)
  })
})

describe('problemasDaColeta', () => {
  it('passa quando esta tudo normal', () => {
    expect(problemasDaColeta({ lidos: { muffato: 10, festval: 8 }, produtosAntes: 100, produtosAgora: 95 })).toEqual([])
    expect(problemasDaColeta({ lidos: { muffato: 10 }, produtosAntes: 0, produtosAgora: 5 })).toEqual([])
  })
  it('barra mercado vazio e queda grande', () => {
    expect(problemasDaColeta({ lidos: { muffato: 10, festval: 0 }, produtosAntes: 100, produtosAgora: 95 })).toHaveLength(1)
    expect(problemasDaColeta({ lidos: { muffato: 10 }, produtosAntes: 100, produtosAgora: 60 })).toHaveLength(1)
  })
})
