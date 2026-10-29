// Primeiro nivel da categoria do mercado -> categoria do site.
const REGRAS = [
  [/hortifr|feira|floricultura/, 'cat-hortifruti'],
  [/carne|a[cç]ougue|aves|peixe|frango/, 'cat-carnes'],
  [/bebida|adega|cerveja|vinho|destilad/, 'cat-bebidas'],
  [/latic[ií]nio|frios|queijo|iogurte|ovos/, 'cat-laticinios'],
  [/higiene|beleza|perfumaria|cuidados|farm[aá]cia/, 'cat-higiene'],
  [/limpeza|lavanderia/, 'cat-limpeza'],
  [/padaria|confeitaria|panifica/, 'cat-padaria'],
  [/congelad|sorvete/, 'cat-congelados'],
  [/\bpet\b|animais/, 'cat-pet'],
  [/mercearia|alimento|matinal|diet|gastronomia|importado|biscoito|doce|snack|conserva|massas|cafe|caf[eé]/, 'cat-mercearia'],
]

const nivel = (caminho, posicao) => (caminho ?? '').split('/').filter(Boolean)[posicao] ?? null

export function categoriaDe(caminho) {
  const primeiro = nivel(caminho, 0)?.toLowerCase() ?? ''
  for (const [regra, id] of REGRAS) if (regra.test(primeiro)) return id
  return 'cat-outros'
}

export const subcategoriaDe = (caminho) => nivel(caminho, 1)
