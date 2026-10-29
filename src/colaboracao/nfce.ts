// A nota fiscal do consumidor (NFC-e) traz uma chave de acesso de 44 dígitos. Ela já diz o estado, o mês,
// o CNPJ do mercado e tem um dígito verificador, então dá pra conferir sem consultar ninguém.
// Aqui só se lê isso: não se guarda CPF, itens da compra nem o endereço da consulta.

import type { NotaFiscal } from './tipos'

const soDigitos = (t: string) => t.replace(/\D/g, '')

/** Procura uma chave de 44 dígitos num texto: o link do QR code, o código digitado ou a chave com espaços. */
export function acharChave(texto: string): string | null {
  const direto = texto.match(/(?<!\d)\d{44}(?!\d)/)
  if (direto) return direto[0]
  const junto = soDigitos(texto)
  return junto.length === 44 ? junto : null
}

/** Dígito verificador da chave: módulo 11 com pesos de 2 a 9, da direita pra esquerda. */
export function digitoDaChave(base43: string): number {
  let soma = 0
  let peso = 2
  for (let i = base43.length - 1; i >= 0; i--) {
    soma += Number(base43[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function chaveValida(chave: string): boolean {
  return /^\d{44}$/.test(chave) && digitoDaChave(chave.slice(0, 43)) === Number(chave[43])
}

export function cnpjValido(cnpj: string): boolean {
  const n = soDigitos(cnpj)
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false
  const dv = (base: string) => {
    let peso = base.length - 7
    let soma = 0
    for (const d of base) {
      soma += Number(d) * peso--
      if (peso < 2) peso = 9
    }
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(n.slice(0, 12)) === Number(n[12]) && dv(n.slice(0, 13)) === Number(n[13])
}

export interface LeituraDaNota extends NotaFiscal {
  uf: string
  modelo: string
  avisos: string[]
}

const UF_PR = '41'
const MODELO_NFCE = '65'

export function lerNota(texto: string): LeituraDaNota | null {
  const chave = acharChave(texto)
  if (!chave) return null
  const uf = chave.slice(0, 2)
  const aa = chave.slice(2, 4)
  const mm = chave.slice(4, 6)
  const cnpj = chave.slice(6, 20)
  const modelo = chave.slice(20, 22)

  const avisos: string[] = []
  const valida = chaveValida(chave)
  if (!valida) avisos.push('dígito verificador da chave não confere')
  if (!cnpjValido(cnpj)) avisos.push('CNPJ da chave não confere')
  if (uf !== UF_PR) avisos.push('nota de outro estado')
  if (modelo !== MODELO_NFCE) avisos.push('não é uma NFC-e (nota de consumidor)')
  const mes = Number(mm)
  if (mes < 1 || mes > 12) avisos.push('mês da chave inválido')

  return {
    cnpj,
    emissao: `20${aa}-${mm}`,
    chaveValida: valida && cnpjValido(cnpj) && mes >= 1 && mes <= 12,
    uf,
    modelo,
    avisos,
  }
}
