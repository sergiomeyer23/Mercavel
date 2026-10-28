import { describe, expect, it } from 'vitest'
import { emojiDoProduto } from './emoji'

describe('emojiDoProduto', () => {
  it('escolhe pelo nome do produto', () => {
    expect(emojiDoProduto('Arroz Branco Tipo 1 5kg', null, 'cat-mercearia')).toBe('🍚')
    expect(emojiDoProduto('Leite UHT Integral 1L', 'Leites', 'cat-laticinios')).toBe('🥛')
  })
  it('usa a subcategoria quando o nome não ajuda', () => {
    expect(emojiDoProduto('Premium Seleção 500g', 'Cafés e Chás', 'cat-mercearia')).toBe('☕')
  })
  it('cai no ícone da categoria quando nada casa', () => {
    expect(emojiDoProduto('Xyz 123', null, 'cat-pet')).toBe('🐾')
  })
})
