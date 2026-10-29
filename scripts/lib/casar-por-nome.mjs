/**
 * Segundo passe do casamento: o mesmo produto pode ter codigos de barras diferentes (embalagem,
 * promocao, fabrica), entao quem ficou sozinho no primeiro passe (casado por EAN) ganha uma segunda
 * chance, comparando marca + tamanho + nome.
 *
 * E' conservador de proposito: marca igual, tamanho igual, nomes parecidos (Jaccard >= 0.75), nenhuma
 * diferenca em palavra que muda o produto (zero, diet, integral, sem lactose...) e o par tem que ser o
 * melhor do outro lado tambem. Na duvida, nao casa.
 */

const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const palavras = (t) => semAcento(t).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)

const SO_TAMANHO = /^\d+([.,]\d+)?(kg|g|mg|ml|l|lt|un|und|unid)?$/
const UNIDADES_SOLTAS = new Set(['kg', 'g', 'mg', 'ml', 'l', 'lt', 'un', 'und', 'unid', 'litro', 'litros', 'c'])
const VAZIAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'com', 'e', 'em', 'a', 'o', 'para', 'pacote', 'caixa', 'lata', 'garrafa',
  'pet', 'sache', 'pote', 'unidade', 'tipo', 'pct', 'cx', 'fardo', 'embalagem', 'sem',
])
// palavra que muda o produto: se so um dos nomes tem, nao e' o mesmo item
const CRITICAS = new Set([
  'zero', 'diet', 'light', 'integral', 'desnatado', 'semidesnatado', 'desnatada', 'lactose', 'gluten',
  'organico', 'organica', 'gratis', 'desconto', 'fit', 'kids', 'infantil', 'refil', 'concentrado', 'descafeinado', 'cafeina',
])

const UNID = { kg: ['massa', 1000], g: ['massa', 1], mg: ['massa', 0.001], l: ['volume', 1000], lt: ['volume', 1000], litro: ['volume', 1000], litros: ['volume', 1000], ml: ['volume', 1], un: ['unid', 1], und: ['unid', 1], unid: ['unid', 1] }

/** Tamanho escrito no nome ("500g", "1,5 L", "12 un") em unidade-base, ou null se nao tiver. */
export function tamanhoExplicito(nome) {
  const achados = [...semAcento(nome).matchAll(/(\d+(?:[.,]\d+)?)\s?(kg|mg|g|ml|lt|litros?|l|unid|und|un)\b/g)]
  const m = achados[achados.length - 1]
  if (!m) return null
  const [tipo, fator] = UNID[m[2]]
  return { tipo, valor: Math.round(Number(m[1].replace(',', '.')) * fator * 1000) / 1000 }
}

export function tokensDoNome(nome, marca) {
  const daMarca = new Set(palavras(marca ?? ''))
  return palavras(nome).filter((p) => !daMarca.has(p) && !SO_TAMANHO.test(p) && !UNIDADES_SOLTAS.has(p) && !VAZIAS.has(p))
}

export function similaridade(a, b) {
  const A = new Set(a)
  const B = new Set(b)
  const comum = [...A].filter((t) => B.has(t)).length
  const total = new Set([...A, ...B]).size
  if (total === 0) return { jaccard: 0, comum }
  return { jaccard: comum / total, comum }
}

function mesmoProduto(a, b) {
  for (const critica of CRITICAS) if (a.tokens.includes(critica) !== b.tokens.includes(critica)) return 0
  const { jaccard, comum } = similaridade(a.tokens, b.tokens)
  if (jaccard < 0.75) return 0
  // com tao poucas palavras em comum, so vale se os nomes forem identicos
  if (comum < 2 && jaccard < 1) return 0
  return jaccard
}

/**
 * itens: [{ mercado, ean, nome, marca }] que ficaram sem par no primeiro passe.
 * Devolve grupos de itens (um por mercado, 2+ mercados) que sao o mesmo produto.
 */
export function casarOrfaos(itens) {
  const grupos = new Map()
  for (const item of itens) {
    const marca = semAcento(item.marca ?? '').replace(/[^a-z0-9]/g, '')
    const tam = tamanhoExplicito(item.nome)
    if (!marca || !tam) continue
    const chave = `${marca}|${tam.tipo}|${tam.valor}`
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave).push({ ...item, tokens: tokensDoNome(item.nome, item.marca) })
  }

  const saida = []
  for (const lista of grupos.values()) {
    const mercados = [...new Set(lista.map((i) => i.mercado))]
    if (mercados.length < 2) continue

    // melhor parceiro de cada item em cada outro mercado
    const melhor = new Map() // item -> Map(mercado -> { alvo, nota, empate })
    for (const a of lista) {
      const porMercado = new Map()
      for (const b of lista) {
        if (a.mercado === b.mercado) continue
        const nota = mesmoProduto(a, b)
        if (nota === 0) continue
        const atual = porMercado.get(b.mercado)
        if (!atual || nota > atual.nota) porMercado.set(b.mercado, { alvo: b, nota, empate: false })
        else if (nota === atual.nota) atual.empate = true
      }
      melhor.set(a, porMercado)
    }

    // so vale se os dois lados se escolhem e nao ha empate (duvida = nao casa)
    const visto = new Set()
    for (const a of lista) {
      if (visto.has(a)) continue
      const grupo = [a]
      for (const [mercado, { alvo, empate }] of melhor.get(a)) {
        if (empate || visto.has(alvo)) continue
        const volta = melhor.get(alvo)?.get(a.mercado)
        if (volta && !volta.empate && volta.alvo === a) grupo.push(alvo)
        void mercado
      }
      if (grupo.length >= 2 && new Set(grupo.map((i) => i.mercado)).size === grupo.length) {
        grupo.forEach((i) => visto.add(i))
        saida.push(grupo.map(({ mercado, ean, nome, marca }) => ({ mercado, ean, nome, marca })))
      }
    }
  }
  return saida
}
