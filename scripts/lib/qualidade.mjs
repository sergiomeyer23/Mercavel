// Travas de qualidade da base: oferta que nao e' a mesma embalagem e coleta que veio incompleta.

import { semAcento } from './texto.mjs'

// a partir daqui a diferenca de preco entre dois mercados deixa de ser plausivel pro mesmo item
const RAZAO_COM_PACOTE_DIFERENTE = 1.6
const RAZAO_MAXIMA = 4
// a base nova nao pode ter menos que isso da anterior (mercado fora do ar, API mudou...)
const QUEDA_MAXIMA = 0.7

const TEM_PESO_OU_VOLUME = /\d\s?(kg|g|mg|ml|lt|l|litros?)\b/

/** Quantas unidades vem na embalagem: "8x85g" = 8, "6un 350ml" = 6, "Lata 350ml" = 1. */
export function unidadesNaEmbalagem(nome) {
  const texto = semAcento(nome)
  const vezes = texto.match(/(\d+)\s?x\s?\d/)
  if (vezes) return Number(vezes[1])
  // "12 un" sozinho e' o proprio tamanho (fralda, absorvente); so vira pacote se o nome tambem tem peso ou volume
  const unidades = texto.match(/(\d+)\s?(?:unidades?|unid|und|un)\b/)
  if (unidades && TEM_PESO_OU_VOLUME.test(texto)) return Number(unidades[1])
  return 1
}

/**
 * O mesmo codigo de barras as vezes e' vendido como unidade num mercado e como pacote em outro.
 * Devolve os mercados cuja oferta bate com a do primeiro da ordem (o que da nome ao produto).
 * ofertas: { mercado: { nome, preco } }
 */
export function mercadosCompativeis(ofertas, ordem) {
  const mercados = ordem.filter((m) => ofertas[m])
  const base = ofertas[mercados[0]]
  if (!base) return []
  const pacoteBase = unidadesNaEmbalagem(base.nome)
  return mercados.filter((m, i) => {
    if (i === 0) return true
    const oferta = ofertas[m]
    const razao = Math.max(oferta.preco, base.preco) / Math.min(oferta.preco, base.preco)
    if (razao >= RAZAO_MAXIMA) return false
    return !(razao >= RAZAO_COM_PACOTE_DIFERENTE && unidadesNaEmbalagem(oferta.nome) !== pacoteBase)
  })
}

/** Motivos pra nao gravar a base nova. Lista vazia = pode gravar. */
export function problemasDaColeta({ lidos, produtosAntes, produtosAgora }) {
  const problemas = []
  for (const [mercado, total] of Object.entries(lidos)) {
    if (total === 0) problemas.push(`nenhum item lido do ${mercado}`)
  }
  if (produtosAntes > 0 && produtosAgora < produtosAntes * QUEDA_MAXIMA) {
    problemas.push(`a base cairia de ${produtosAntes} para ${produtosAgora} produtos`)
  }
  return problemas
}
