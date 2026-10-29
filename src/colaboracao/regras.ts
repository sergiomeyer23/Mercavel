import type { Envio, NovoEnvio, StatusEnvio } from './tipos'

// tudo que dá pra ajustar fica aqui. os pontos são só reconhecimento por enquanto: não há tabela de troca
export const REGRAS = {
  limiteDiario: 30,
  janelaCapturaMinutos: 15,
  // faixa aceita em relação ao preço mediano que a base já tem pro produto
  faixaDePreco: { min: 0.4, max: 2.5 },
  // caixa aproximada de Cascavel/PR
  cascavel: { latMin: -25.15, latMax: -24.8, lngMin: -53.65, lngMax: -53.25 },
  confirmacao: { diasDeValidade: 7, tolerancia: 0.03, envios: 2 },
  pontos: { base: 1, produtoDesatualizado: 2, primeiroDoMercado: 3, comNotaFiscal: 1 },
} as const

export interface ContextoDeAvaliacao {
  // preço mediano do produto na base (null se ainda não tem)
  precoDeReferencia: number | null
  enviosDoUsuarioHoje: number
}

export interface Avaliacao {
  status: Exclude<StatusEnvio, 'confirmado'>
  motivos: string[]
}

const minutosEntre = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000

/**
 * Primeira triagem, antes de qualquer confirmação de outra pessoa.
 * rejeitado: não tem como valer. revisao_manual: algo estranho, uma pessoa olha. em_analise: passou.
 */
export function avaliarEnvio(envio: NovoEnvio, ctx: ContextoDeAvaliacao): Avaliacao {
  if (!Number.isFinite(envio.preco) || envio.preco <= 0) return { status: 'rejeitado', motivos: ['preço inválido'] }
  if (!envio.foto) return { status: 'rejeitado', motivos: ['sem foto da etiqueta'] }
  if (ctx.enviosDoUsuarioHoje >= REGRAS.limiteDiario) {
    return { status: 'rejeitado', motivos: [`limite de ${REGRAS.limiteDiario} envios por dia`] }
  }

  const motivos: string[] = []
  const { captura } = envio

  if (captura.origem !== 'camera_app') motivos.push('foto enviada de arquivo, não tirada no app')
  else if (minutosEntre(captura.feitaEm, envio.criadoEm) > REGRAS.janelaCapturaMinutos) {
    motivos.push('foto tirada há mais de 15 minutos')
  }

  if (captura.lat === null || captura.lng === null) motivos.push('sem localização')
  else {
    const c = REGRAS.cascavel
    if (captura.lat < c.latMin || captura.lat > c.latMax || captura.lng < c.lngMin || captura.lng > c.lngMax) {
      motivos.push('localização fora de Cascavel')
    }
  }

  if (ctx.precoDeReferencia) {
    const razao = envio.preco / ctx.precoDeReferencia
    if (razao < REGRAS.faixaDePreco.min || razao > REGRAS.faixaDePreco.max) {
      motivos.push('preço muito diferente do que a base tem pra esse produto')
    }
  }

  if (envio.nota && !envio.nota.chaveValida) motivos.push('chave da nota fiscal inválida')

  return motivos.length > 0 ? { status: 'revisao_manual', motivos } : { status: 'em_analise', motivos: [] }
}

/** Pontos que o envio rende quando for confirmado. */
export function pontosDoEnvio(
  envio: Pick<Envio, 'nota'>,
  contexto: { produtoDesatualizado: boolean; primeiroDoMercado: boolean },
): number {
  const p = REGRAS.pontos
  let total = p.base
  if (contexto.produtoDesatualizado) total += p.produtoDesatualizado
  if (contexto.primeiroDoMercado) total += p.primeiroDoMercado
  if (envio.nota?.chaveValida) total += p.comNotaFiscal
  return total
}
