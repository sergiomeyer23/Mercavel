// Leitura defensiva dos arquivos que o varrer deixa em dados/catalogo/<mercado>/.
// Um arquivo truncado ou com formato inesperado nao pode derrubar o montar: vira aviso e e' pulado.

const ehTexto = (valor) => typeof valor === 'string' && valor.length > 0

/** Item minimo aceito: EAN em texto, nome em texto e preco numerico finito (preco <= 0 e' filtrado depois). */
export function itemValido(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    ehTexto(item.ean) &&
    ehTexto(item.nome) &&
    typeof item.preco === 'number' &&
    Number.isFinite(item.preco)
  )
}

/**
 * Converte o texto de um arquivo do catalogo em { itens, coletadoEm, descartados }.
 * Lanca Error com motivo claro se o arquivo nao e' aproveitavel.
 */
export function lerArquivoDoCatalogo(texto) {
  let dados
  try {
    dados = JSON.parse(texto)
  } catch (erro) {
    throw new Error(`JSON invalido (${erro.message})`)
  }
  if (dados === null || typeof dados !== 'object' || !Array.isArray(dados.itens)) {
    throw new Error('formato inesperado: falta a lista "itens"')
  }
  const itens = dados.itens.filter(itemValido)
  const coletadoEm = typeof dados.coletadoEm === 'string' && !Number.isNaN(Date.parse(dados.coletadoEm)) ? dados.coletadoEm : null
  return { itens, coletadoEm, descartados: dados.itens.length - itens.length }
}
