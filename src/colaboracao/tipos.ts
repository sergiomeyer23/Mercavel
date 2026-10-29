export type StatusEnvio = 'em_analise' | 'confirmado' | 'revisao_manual' | 'rejeitado'

// de onde veio a foto: a câmera do próprio app grava hora e localização sozinha; arquivo de galeria não prova nada
export type OrigemFoto = 'camera_app' | 'arquivo'

export interface Captura {
  feitaEm: string
  lat: number | null
  lng: number | null
  origem: OrigemFoto
}

// só o que a nota prova e não identifica a pessoa: nada de CPF
export interface NotaFiscal {
  cnpj: string
  emissao: string // AAAA-MM
  chaveValida: boolean
}

export interface Envio {
  id: string
  usuarioId: string
  produtoId: string
  mercadoId: string // id de um mercado da base ou 'outro'
  preco: number
  criadoEm: string
  foto: string | null // data URL (modo demonstração); no servidor seria um arquivo
  captura: Captura
  nota: NotaFiscal | null
  status: StatusEnvio
  motivos: string[]
  pontos: number // só conta quando o status é "confirmado"
}

export type NovoEnvio = Omit<Envio, 'id' | 'status' | 'motivos' | 'pontos'>
