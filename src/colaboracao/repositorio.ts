import { enviosConfirmados } from './confirmacao'
import { avaliarEnvio, pontosDoEnvio } from './regras'
import type { Envio, NovoEnvio } from './tipos'
import { precosDoProduto } from '../utils'

/**
 * Onde os envios ficam guardados. Hoje é o navegador de quem enviou (modo demonstração): não existe
 * servidor, então a "confirmação por outra pessoa" só acontece pela revisão manual. A interface abaixo é
 * o que um servidor de verdade (ver supabase/schema.sql) precisaria implementar.
 */
export interface Repositorio {
  usuarioId(): string
  listar(): Envio[]
  salvar(envios: Envio[]): void
}

const CHAVE_ENVIOS = 'mercavel-envios'
const CHAVE_USUARIO = 'mercavel-usuario'

export const repositorioLocal: Repositorio = {
  usuarioId() {
    try {
      let id = localStorage.getItem(CHAVE_USUARIO)
      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem(CHAVE_USUARIO, id)
      }
      return id
    } catch {
      return 'anonimo'
    }
  },
  listar() {
    try {
      const dados: unknown = JSON.parse(localStorage.getItem(CHAVE_ENVIOS) ?? '[]')
      return Array.isArray(dados) ? (dados as Envio[]) : []
    } catch {
      return []
    }
  },
  salvar(envios) {
    try {
      localStorage.setItem(CHAVE_ENVIOS, JSON.stringify(envios))
    } catch {
      // armazenamento cheio ou bloqueado: o envio some quando a página fechar
    }
  },
}

const mediana = (valores: number[]) => {
  if (valores.length === 0) return null
  const ordenado = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenado.length / 2)
  return ordenado.length % 2 ? ordenado[meio] : (ordenado[meio - 1] + ordenado[meio]) / 2
}

const mesmoDia = (a: string, b: Date) => new Date(a).toDateString() === b.toDateString()

/** Avalia o envio, guarda e devolve o que ficou gravado. */
export function enviarPreco(novo: NovoEnvio, repo: Repositorio = repositorioLocal, agora: Date = new Date()): Envio {
  const existentes = repo.listar()
  const avaliacao = avaliarEnvio(novo, {
    precoDeReferencia: mediana(precosDoProduto(novo.produtoId).map((p) => p.price)),
    enviosDoUsuarioHoje: existentes.filter((e) => e.usuarioId === novo.usuarioId && mesmoDia(e.criadoEm, agora)).length,
  })
  const envio: Envio = { ...novo, id: crypto.randomUUID(), status: avaliacao.status, motivos: avaliacao.motivos, pontos: 0 }
  const todos = [...existentes, envio]
  repo.salvar(aplicarConfirmacoes(todos, agora))
  return todos.find((e) => e.id === envio.id) ?? envio
}

/** Marca como confirmados os envios que duas pessoas diferentes sustentaram e credita os pontos. */
export function aplicarConfirmacoes(envios: Envio[], agora: Date = new Date()): Envio[] {
  const ids = new Set(enviosConfirmados(envios, agora))
  return envios.map((e) => (ids.has(e.id) && e.status !== 'confirmado' ? confirmar(e, envios, agora) : e))
}

export function confirmar(envio: Envio, todos: Envio[], agora: Date = new Date()): Envio {
  const outros = todos.filter((e) => e.id !== envio.id && e.status === 'confirmado')
  const doMercado = outros.filter((e) => e.produtoId === envio.produtoId && e.mercadoId === envio.mercadoId)
  const ultimo = doMercado.map((e) => new Date(e.criadoEm).getTime()).sort((a, b) => b - a)[0]
  const produtoDesatualizado = !ultimo || agora.getTime() - ultimo > 14 * 86_400_000
  const primeiroDoMercado = !outros.some((e) => e.mercadoId === envio.mercadoId)
  return { ...envio, status: 'confirmado', motivos: [], pontos: pontosDoEnvio(envio, { produtoDesatualizado, primeiroDoMercado }) }
}

/** Decisão de quem revisa à mão (modo revisor). */
export function decidirRevisao(envios: Envio[], id: string, aprovar: boolean, agora: Date = new Date()): Envio[] {
  return envios.map((e) => {
    if (e.id !== id) return e
    return aprovar ? confirmar(e, envios, agora) : { ...e, status: 'rejeitado', motivos: [...e.motivos, 'reprovado na revisão'] }
  })
}

export const totalDePontos = (envios: Envio[], usuarioId: string) =>
  envios.filter((e) => e.usuarioId === usuarioId && e.status === 'confirmado').reduce((s, e) => s + e.pontos, 0)
