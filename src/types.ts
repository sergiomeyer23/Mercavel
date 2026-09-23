export type PriceType =
  | 'ONLINE'
  | 'PHYSICAL'
  | 'APP'
  | 'CLUB'
  | 'PROMOTION'
  | 'WHOLESALE'
  | 'UNKNOWN'

export interface Market {
  id: string
  name: string
  shortName: string
  slug: string
  city: string
  state: string
  website: string | null
  onlineShoppingAvailable: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  parentCategoryId: string | null
}

export interface Product {
  id: string
  name: string
  brand: string
  ean: string | null
  unit: string
  quantity: number
  quantityUnit: string
  categoryId: string
}

export interface Price {
  id: string
  productId: string
  marketId: string
  price: number
  priceType: PriceType
  collectedAt: string
  source: string
  sourceUrl: string | null
  availability: 'IN_STOCK' | 'OUT_OF_STOCK'
  // categoria que o mercado usa lá no site dele (antes de eu padronizar)
  marketOriginalCategory: string | null
}
