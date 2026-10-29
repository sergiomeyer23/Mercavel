const UNIDADES = {
  kg: 'KG', g: 'G', mg: 'G', l: 'L', lt: 'L', litro: 'L', litros: 'L', ml: 'ML',
  un: 'UN', und: 'UN', unid: 'UN', rolo: 'UN', rolos: 'UN',
}

// Tamanho escrito no nome ("500g", "1,5 L"). Sem numero no nome, cai em "por kg" ou "1 un".
export function tamanhoDoNome(nome, medida) {
  const achados = [...nome.matchAll(/(\d+(?:[.,]\d+)?)\s?(kg|g|mg|ml|lt|litros?|l|unid|und|un|rolos?)\b/gi)]
  const ultimo = achados[achados.length - 1]
  if (ultimo) {
    const [, numero, unidadeEscrita] = ultimo
    let quantidade = Number(numero.replace(',', '.'))
    const escrita = unidadeEscrita.toLowerCase()
    if (escrita === 'mg') quantidade /= 1000
    const unidade = UNIDADES[escrita]
    return { quantidade, unidade, texto: `${numero.replace('.', ',')} ${unidade === 'UN' ? 'un' : unidade.toLowerCase()}` }
  }
  if (medida === 'kg') return { quantidade: 1, unidade: 'KG', texto: 'por kg' }
  return { quantidade: 1, unidade: 'UN', texto: '1 un' }
}
