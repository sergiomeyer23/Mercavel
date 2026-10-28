import { markets, pricesByProduct, products } from './data'
import type { Market, Price, PriceType } from './types'

export function brl(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

const nomesTipos: Record<PriceType, string> = {
  ONLINE: 'online',
  PHYSICAL: 'loja física',
  APP: 'app',
  CLUB: 'clube',
  PROMOTION: 'promoção',
  WHOLESALE: 'atacado',
  UNKNOWN: 'não informado',
}

export function nomeDoPreco(tipo: PriceType) {
  return nomesTipos[tipo] ?? tipo
}

export function corDoPreco(tipo: PriceType) {
  switch (tipo) {
    case 'ONLINE':
      return 'bg-marca-100 text-marca-700'
    case 'PHYSICAL':
      return 'bg-gray-200 text-gray-700'
    case 'PROMOTION':
      return 'bg-amber-100 text-amber-700'
    case 'APP':
      return 'bg-sky-100 text-sky-700'
    case 'CLUB':
      return 'bg-violet-100 text-violet-700'
    case 'WHOLESALE':
      return 'bg-teal-100 text-teal-700'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

export function acharMarket(id: string): Market | undefined {
  return markets.find((m) => m.id === id)
}

// preços que davam pra comprar na data da coleta, do mais barato pro mais caro
// (os que estão sem estoque ficam de fora)
export function precosDoProduto(productId: string, tipo?: PriceType): Price[] {
  let lista = (pricesByProduct.get(productId) ?? []).filter((p) => p.availability === 'IN_STOCK')
  if (tipo) {
    lista = lista.filter((p) => p.priceType === tipo)
  }
  return lista.sort((a, b) => a.price - b.price)
}

// usado pelos dois campos de busca (o do cabeçalho e o da home)
export function caminhoDaBusca(termo: string) {
  return '/busca?q=' + encodeURIComponent(termo.trim())
}

export function mediaValores(valores: number[]) {
  if (valores.length === 0) return null
  const soma = valores.reduce((total, v) => total + v, 0)
  return soma / valores.length
}

// quantos dias se passaram desde a coleta
export function diasDesde(iso: string, agora: Date = new Date()) {
  const ms = agora.getTime() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

export const DIAS_PRECO_VELHO = 7

export function idadeDoPreco(iso: string, agora: Date = new Date()) {
  const dias = diasDesde(iso, agora)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'há 1 dia'
  return `há ${dias} dias`
}

export function precoVelho(iso: string, agora: Date = new Date()) {
  return diasDesde(iso, agora) > DIAS_PRECO_VELHO
}

// preço por kg ou por litro, pra comparar embalagens de tamanhos diferentes.
// devolve null quando a unidade não é de peso nem de volume
export function precoPorUnidade(preco: number, quantidade: number, unidade: string) {
  if (!(quantidade > 0)) return null
  const u = unidade.toLowerCase()
  if (u === 'kg') return { valor: preco / quantidade, rotulo: 'kg' }
  if (u === 'g') return { valor: (preco / quantidade) * 1000, rotulo: 'kg' }
  if (u === 'l') return { valor: preco / quantidade, rotulo: 'L' }
  if (u === 'ml') return { valor: (preco / quantidade) * 1000, rotulo: 'L' }
  return null
}

// primeiro produto (com preço em 2+ mercados) cujo nome casa com o padrão; usado nos destaques e na cesta de exemplo
export function acharProdutoComparavel(padrao: RegExp) {
  return products.find((p) => padrao.test(p.name) && precosDoProduto(p.id).length >= 2)
}
