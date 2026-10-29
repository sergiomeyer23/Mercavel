import type { StatusEnvio } from './tipos'

export const ROTULO_DO_STATUS: Record<StatusEnvio, { texto: string; cor: string }> = {
  em_analise: { texto: 'em análise', cor: 'bg-sky-100 text-sky-700' },
  confirmado: { texto: 'confirmado', cor: 'bg-marca-100 text-marca-700' },
  revisao_manual: { texto: 'revisão manual', cor: 'bg-amber-100 text-amber-700' },
  rejeitado: { texto: 'rejeitado', cor: 'bg-red-100 text-red-700' },
}

export const MENSAGEM_DO_STATUS: Record<StatusEnvio, string> = {
  em_analise: 'Recebido. Falta outra pessoa confirmar um preço parecido para ele valer.',
  confirmado: 'Confirmado!',
  revisao_manual: 'Recebido, mas foi para revisão manual.',
  rejeitado: 'Não foi aceito.',
}
