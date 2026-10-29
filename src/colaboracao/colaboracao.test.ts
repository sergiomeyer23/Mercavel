import { describe, expect, it } from 'vitest'
import { enviosConfirmados } from './confirmacao'
import { acharChave, chaveValida, cnpjValido, digitoDaChave, lerNota } from './nfce'
import { avaliarEnvio, pontosDoEnvio, REGRAS } from './regras'
import type { Envio, NovoEnvio } from './tipos'

const agora = new Date('2026-10-29T12:00:00Z')
const novo = (extra: Partial<NovoEnvio> = {}): NovoEnvio => ({
  usuarioId: 'u1',
  produtoId: 'p1',
  mercadoId: 'muffato',
  preco: 10,
  criadoEm: agora.toISOString(),
  foto: 'data:image/jpeg;base64,xx',
  captura: { feitaEm: '2026-10-29T11:55:00Z', lat: -24.95, lng: -53.46, origem: 'camera_app' },
  nota: null,
  ...extra,
})
const ctx = { precoDeReferencia: 10, enviosDoUsuarioHoje: 0 }

describe('avaliarEnvio', () => {
  it('passa um envio bom para análise', () => {
    expect(avaliarEnvio(novo(), ctx)).toEqual({ status: 'em_analise', motivos: [] })
  })
  it('rejeita preço inválido, sem foto e acima do limite diário', () => {
    expect(avaliarEnvio(novo({ preco: 0 }), ctx).status).toBe('rejeitado')
    expect(avaliarEnvio(novo({ foto: null }), ctx).status).toBe('rejeitado')
    expect(avaliarEnvio(novo(), { ...ctx, enviosDoUsuarioHoje: REGRAS.limiteDiario }).status).toBe('rejeitado')
  })
  it('manda para revisão manual o que é estranho', () => {
    const arquivo = avaliarEnvio(novo({ captura: { ...novo().captura, origem: 'arquivo' } }), ctx)
    expect(arquivo.status).toBe('revisao_manual')
    const antiga = avaliarEnvio(novo({ captura: { ...novo().captura, feitaEm: '2026-10-29T10:00:00Z' } }), ctx)
    expect(antiga.motivos).toContain('foto tirada há mais de 15 minutos')
    const longe = avaliarEnvio(novo({ captura: { ...novo().captura, lat: -23.5, lng: -46.6 } }), ctx)
    expect(longe.motivos).toContain('localização fora de Cascavel')
    const semGps = avaliarEnvio(novo({ captura: { ...novo().captura, lat: null, lng: null } }), ctx)
    expect(semGps.motivos).toContain('sem localização')
    expect(avaliarEnvio(novo({ preco: 40 }), ctx).status).toBe('revisao_manual')
    expect(avaliarEnvio(novo({ preco: 3 }), ctx).status).toBe('revisao_manual')
  })
  it('aceita preço quando a base ainda não tem referência', () => {
    expect(avaliarEnvio(novo({ preco: 99 }), { ...ctx, precoDeReferencia: null }).status).toBe('em_analise')
  })
})

describe('enviosConfirmados', () => {
  const envio = (id: string, usuarioId: string, preco: number, dias = 0, status: Envio['status'] = 'em_analise'): Envio => ({
    ...novo({ usuarioId, preco, criadoEm: new Date(agora.getTime() - dias * 86_400_000).toISOString() }),
    id,
    status,
    motivos: [],
    pontos: 0,
  })
  it('confirma quando duas pessoas diferentes mandam preços parecidos', () => {
    expect(enviosConfirmados([envio('a', 'u1', 10), envio('b', 'u2', 10.2)], agora).sort()).toEqual(['a', 'b'])
  })
  it('não confirma a mesma pessoa duas vezes, preços distantes ou envios velhos', () => {
    expect(enviosConfirmados([envio('a', 'u1', 10), envio('b', 'u1', 10)], agora)).toEqual([])
    expect(enviosConfirmados([envio('a', 'u1', 10), envio('b', 'u2', 11)], agora)).toEqual([])
    expect(enviosConfirmados([envio('a', 'u1', 10), envio('b', 'u2', 10, 8)], agora)).toEqual([])
  })
  it('não confirma envio que está em revisão manual', () => {
    expect(enviosConfirmados([envio('a', 'u1', 10), envio('b', 'u2', 10, 0, 'revisao_manual')], agora)).toEqual([])
  })
})

describe('pontosDoEnvio', () => {
  it('soma os critérios', () => {
    expect(pontosDoEnvio({ nota: null }, { produtoDesatualizado: false, primeiroDoMercado: false })).toBe(1)
    expect(pontosDoEnvio({ nota: null }, { produtoDesatualizado: true, primeiroDoMercado: false })).toBe(3)
    const nota = { cnpj: '1', emissao: '2026-10', chaveValida: true }
    expect(pontosDoEnvio({ nota }, { produtoDesatualizado: true, primeiroDoMercado: true })).toBe(1 + 2 + 3 + 1)
  })
})

describe('nota fiscal', () => {
  const base43 = '4126101122233300018165001000123456110012345'
  const chave = base43 + digitoDaChave(base43)
  it('valida o dígito verificador da chave', () => {
    expect(base43).toHaveLength(43)
    expect(chaveValida(chave)).toBe(true)
    const errada = chave.slice(0, 20) + (chave[20] === '1' ? '2' : '1') + chave.slice(21)
    expect(chaveValida(errada)).toBe(false)
  })
  it('valida CNPJ', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true)
    expect(cnpjValido('11.222.333/0001-82')).toBe(false)
    expect(cnpjValido('00000000000000')).toBe(false)
  })
  it('acha a chave dentro do link do QR code e lê só o que importa', () => {
    const url = `https://www.fazenda.pr.gov.br/nfce/qrcode?p=${chave}|2|1|1|ABCDEF`
    expect(acharChave(url)).toBe(chave)
    const nota = lerNota(url)
    expect(nota).toMatchObject({ cnpj: '11222333000181', emissao: '2026-10', uf: '41', modelo: '65', chaveValida: true })
    expect(Object.keys(nota ?? {})).not.toContain('cpf')
  })
  it('avisa quando a nota é de outro estado ou a chave não bate', () => {
    const sp = '3526' + base43.slice(4)
    const nota = lerNota(sp + digitoDaChave(sp))
    expect(nota?.avisos).toContain('nota de outro estado')
    expect(lerNota('1'.repeat(44))?.chaveValida).toBe(false)
    expect(lerNota('sem chave nenhuma')).toBeNull()
  })
})
