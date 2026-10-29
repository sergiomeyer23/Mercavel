import { describe, expect, it } from 'vitest'
import { categoriaDe, subcategoriaDe } from './categorias.mjs'
import { tamanhoDoNome } from './tamanho.mjs'
import { limparNome, slug } from './texto.mjs'
import { normalizarEan } from './vtex.mjs'

describe('tamanhoDoNome', () => {
  it('le o tamanho do nome', () => {
    expect(tamanhoDoNome('Arroz Tipo 1 5kg')).toEqual({ quantidade: 5, unidade: 'KG', texto: '5 kg' })
    expect(tamanhoDoNome('Leite 1,5 L')).toMatchObject({ quantidade: 1.5, unidade: 'L' })
    expect(tamanhoDoNome('Tempero 500mg')).toMatchObject({ quantidade: 0.5, unidade: 'G' })
  })
  it('usa o último tamanho quando há mais de um', () => {
    expect(tamanhoDoNome('Biscoito 3 un 130g')).toMatchObject({ quantidade: 130, unidade: 'G' })
  })
  it('sem tamanho no nome, cai em por kg ou 1 un', () => {
    expect(tamanhoDoNome('Banana prata', 'kg').texto).toBe('por kg')
    expect(tamanhoDoNome('Alface crespa', 'un').texto).toBe('1 un')
  })
})

describe('categoriaDe', () => {
  it('mapeia o primeiro nível do mercado', () => {
    expect(categoriaDe('/Mercearia e Alimentos/Arroz/')).toBe('cat-mercearia')
    expect(categoriaDe('/Frios e Laticínios/Queijos/')).toBe('cat-laticinios')
    expect(categoriaDe('/Higiene e Beleza/Cabelos/')).toBe('cat-higiene')
    expect(categoriaDe('/Pet Shop/Rações/')).toBe('cat-pet')
  })
  it('cai em outros quando não reconhece', () => {
    expect(categoriaDe('/Automotivo/')).toBe('cat-outros')
    expect(categoriaDe(null)).toBe('cat-outros')
  })
  it('devolve o segundo nível como subcategoria', () => {
    expect(subcategoriaDe('/Padaria/Pães/')).toBe('Pães')
    expect(subcategoriaDe('/Padaria/')).toBeNull()
  })
})

describe('texto', () => {
  it('limpa aspas duplicadas e espaços', () => {
    expect(limparNome("''Capsula''  Nescafé   Farmers ")).toBe('Capsula Nescafé Farmers')
  })
  it('gera slug sem acento nem símbolo', () => {
    expect(slug('Açúcar Refinado União 1kg!')).toBe('acucar-refinado-uniao-1kg')
  })
})

describe('normalizarEan', () => {
  it('tira zeros à esquerda e rejeita código inválido', () => {
    expect(normalizarEan('0789100045746')).toBe('789100045746')
    expect(normalizarEan('abc')).toBeNull()
    expect(normalizarEan('123')).toBeNull()
  })
  it('descarta código interno de balança (13 dígitos começando com 2)', () => {
    expect(normalizarEan('2012345678905')).toBeNull()
  })
})
