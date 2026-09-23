import marketsJson from './data/markets.json'
import categoriesJson from './data/categories.json'
import productsJson from './data/products.json'
import pricesJson from './data/prices.json'
import type { Category, Market, Price, Product } from './types'

// por enquanto os dados ficam fixos nesses json aqui do projeto,
// o plano é trocar por uma chamada de API depois
export const markets = marketsJson as Market[]
export const categories = categoriesJson as Category[]
export const products = productsJson as Product[]
export const prices = pricesJson as Price[]

export const ULTIMA_COLETA = '22/09/2026'
