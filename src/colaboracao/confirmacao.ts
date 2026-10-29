import { REGRAS } from './regras'
import type { Envio } from './tipos'

const DIA = 86_400_000

/**
 * Um preço só vira "confirmado" quando duas pessoas diferentes mandam valores parecidos
 * (até 3% de distância) dentro de 7 dias para o mesmo produto no mesmo mercado.
 * Devolve os ids dos envios que passam a ser confirmados agora.
 */
export function enviosConfirmados(envios: Envio[], agora: Date = new Date()): string[] {
  const { diasDeValidade, tolerancia, envios: minimo } = REGRAS.confirmacao
  const candidatos = envios.filter(
    (e) => (e.status === 'em_analise' || e.status === 'confirmado') && agora.getTime() - new Date(e.criadoEm).getTime() <= diasDeValidade * DIA,
  )

  const grupos = new Map<string, Envio[]>()
  for (const e of candidatos) {
    const chave = `${e.produtoId}|${e.mercadoId}`
    grupos.set(chave, [...(grupos.get(chave) ?? []), e])
  }

  const confirmados = new Set<string>()
  for (const lista of grupos.values()) {
    for (const base of lista) {
      const parecidos = lista.filter((e) => Math.abs(e.preco - base.preco) / base.preco <= tolerancia)
      if (new Set(parecidos.map((e) => e.usuarioId)).size >= minimo) parecidos.forEach((e) => confirmados.add(e.id))
    }
  }
  return [...confirmados]
}
