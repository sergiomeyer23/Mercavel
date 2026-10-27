/**
 * Fase 2: coleta os precos reais usando os EANs aprendidos na fase 1.
 *
 * 1. le a lista de revisao e aprova apenas os casamentos seguros
 *    (confianca alta, nenhum motivo de revisao, com codigo de barras e preco)
 * 2. grava os vinculos produto <-> codigo de barras da loja em dados/vinculos.json
 *    e o que ficou de fora em dados/pendentes.json
 * 3. consulta cada vinculo pelo codigo de barras e escreve src/data/prices.json
 *
 * Detalhe da API da VTEX: o filtro por codigo de barras usa DOIS PONTOS
 * (fq=alternateIds_Ean:<ean>). Com sinal de igual a API ignora o filtro e
 * devolve o catalogo inteiro, o que ja me fez medir "49 de 49" sem ser verdade.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

const MERCADOS = {
  muffato: { nome: 'Super Muffato', shortName: 'Muffato', base: 'https://www.supermuffato.com.br' },
  festval: { nome: 'Festval', shortName: 'Festval', base: 'https://www.festval.com' },
  atacadao: { nome: 'Atacadao', shortName: 'Atacadao', base: 'https://www.atacadao.com.br/io' },
}

const CABECALHOS = {
  'User-Agent': 'Mercavel/0.1 (+https://github.com/sergiomeyer23/Mercavel; projeto de estudo)',
  Accept: 'application/json',
}

const PAUSA_MS = 350

const lerJson = async (caminho) => JSON.parse(await readFile(join(RAIZ, caminho), 'utf8'))
const gravarJson = async (caminho, dados) =>
  writeFile(join(RAIZ, caminho), JSON.stringify(dados, null, 2) + '\n', 'utf8')

// ------------------------------------------------- 1. aprovacao dos vinculos

/**
 * Um casamento so entra se nao deixou nenhuma duvida na revisao.
 *
 * A disponibilidade nao entra no criterio: ela responde pela regiao padrao da
 * sessao, nao por Cascavel. Foi o que zerou o Festval inteiro (preco certo,
 * IsAvailable=false em tudo) e o que fez o Atacadao devolver Price=0. O sinal
 * confiavel de "sem oferta" e' o preco, que ja vem filtrado da revisao.
 */
function ehSeguro(resultado) {
  const escolhido = resultado.escolhido
  if (resultado.confianca !== 'alta') return false
  if (!escolhido) return false
  if ((escolhido.motivosRevisao ?? []).length > 0) return false
  if (!escolhido.ean) return false
  if (!(escolhido.preco > 0)) return false
  return true
}

function motivosDaRecusa(resultado) {
  const escolhido = resultado.escolhido
  if (!escolhido) return 'nenhuma oferta encontrada'
  const motivos = [...(escolhido.motivosRevisao ?? [])]
  if (!escolhido.ean) motivos.push('oferta sem codigo de barras')
  if (!(escolhido.preco > 0)) motivos.push('oferta sem preco')
  if (resultado.confianca !== 'alta') motivos.push(`confianca ${resultado.confianca}`)
  return motivos.join(', ') || 'confianca alta'
}

function montarVinculos(revisao) {
  const vinculos = []
  const pendentes = []
  const eansUsados = new Map()

  for (const mercado of revisao.mercados) {
    for (const resultado of mercado.resultados) {
      if (!ehSeguro(resultado)) {
        pendentes.push({
          produtoId: resultado.produtoId,
          mercadoId: mercado.mercado,
          confianca: resultado.confianca,
          motivo: motivosDaRecusa(resultado),
          melhorOferta: resultado.escolhido?.nome ?? null,
        })
        continue
      }

      const escolhido = resultado.escolhido
      const jaUsado = eansUsados.get(escolhido.ean)
      // o mesmo codigo em outra loja e' o esperado (produto nacional vendido nos
      // dois). o que nao pode e' o mesmo codigo responder por dois produtos nossos.
      if (jaUsado && jaUsado !== resultado.produtoId) {
        pendentes.push({
          produtoId: resultado.produtoId,
          mercadoId: mercado.mercado,
          confianca: resultado.confianca,
          motivo: `codigo de barras repetido (ja usado em ${jaUsado})`,
          melhorOferta: escolhido.nome,
        })
        continue
      }

      eansUsados.set(escolhido.ean, resultado.produtoId)
      vinculos.push({
        produtoId: resultado.produtoId,
        mercadoId: mercado.mercado,
        eanLoja: escolhido.ean,
        nomeNaLoja: escolhido.nome,
        marcaNaLoja: escolhido.marca ?? null,
        tamanhoNaLoja: escolhido.tamanho ?? null,
        precoNaAprovacao: escolhido.preco,
        linkNaLoja: escolhido.link ?? null,
      })
    }
  }

  return { vinculos, pendentes }
}

// ------------------------------------------------- 2. coleta por codigo de barras

/** Busca a oferta exata pelo codigo de barras e confere se o EAN bate mesmo. */
async function buscarPorEan(mercado, ean) {
  const url = `${mercado.base}/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${ean}&_from=0&_to=4`
  const resposta = await fetch(url, { headers: CABECALHOS })
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)

  const tipo = resposta.headers.get('content-type') ?? ''
  if (!tipo.includes('json')) throw new Error(`resposta nao-JSON (${tipo.split(';')[0]})`)

  const produtos = await resposta.json()
  if (!Array.isArray(produtos)) throw new Error('resposta inesperada da API')

  // confere item por item: o filtro pode devolver o produto com outro SKU junto
  for (const produto of produtos) {
    for (const item of produto.items ?? []) {
      if (String(item.ean) !== String(ean)) continue
      const oferta = item.sellers?.[0]?.commertialOffer ?? {}
      const preco = oferta.Price
      if (!(preco > 0)) continue

      return {
        preco,
        disponivel: Boolean(oferta.IsAvailable),
        nomeNaLoja: produto.productName,
        marcaNaLoja: produto.brand ?? null,
        categoriaNaLoja: (produto.categories?.[0] ?? '').replace(/\//g, '').trim() || null,
        linkNaLoja: produto.link ?? null,
      }
    }
  }

  return null
}

// ------------------------------------------------- principal

const revisao = await lerJson('dados/revisao.json')
const produtos = await lerJson('src/data/products.json')

const { vinculos, pendentes } = montarVinculos(revisao)

console.log(`vinculos aprovados: ${vinculos.length}`)
console.log(`pendentes de revisao: ${pendentes.length}`)
for (const mercado of Object.keys(MERCADOS)) {
  const total = vinculos.filter((v) => v.mercadoId === mercado).length
  console.log(`  ${MERCADOS[mercado].nome}: ${total}`)
}

await gravarJson('dados/vinculos.json', {
  geradoEm: new Date().toISOString(),
  observacao:
    'Vinculo entre cada produto nosso e o codigo de barras do mesmo produto na loja. ' +
    'Os codigos de barras sao das lojas: o nosso produto e generico ("Arroz Branco Tipo 1 5 kg") ' +
    'e nao tem codigo proprio.',
  vinculos,
})
await gravarJson('dados/pendentes.json', {
  geradoEm: new Date().toISOString(),
  observacao: 'Casamentos que nao passaram no criterio de aprovacao e precisam de olho humano.',
  pendentes,
})

// a partir daqui e' rede: consulta cada vinculo
console.log('\ncoletando precos por codigo de barras...')
const precos = []
const agora = new Date().toISOString()
let semOferta = 0
let falhas = 0

for (const vinculo of vinculos) {
  const mercado = MERCADOS[vinculo.mercadoId]
  try {
    const oferta = await buscarPorEan(mercado, vinculo.eanLoja)
    if (!oferta) {
      semOferta++
      process.stdout.write('x')
    } else {
      precos.push({
        id: `${vinculo.mercadoId}--${vinculo.produtoId}`,
        productId: vinculo.produtoId,
        marketId: vinculo.mercadoId,
        price: oferta.preco,
        priceType: 'ONLINE',
        collectedAt: agora,
        source: `site do ${mercado.shortName}`,
        sourceUrl: oferta.linkNaLoja,
        availability: oferta.disponivel ? 'IN_STOCK' : 'OUT_OF_STOCK',
        marketOriginalCategory: oferta.categoriaNaLoja,
        marketEan: vinculo.eanLoja,
        marketProductName: oferta.nomeNaLoja,
        marketBrand: oferta.marcaNaLoja,
      })
      process.stdout.write('.')
    }
  } catch (erro) {
    falhas++
    process.stdout.write('!')
  }
  await new Promise((r) => setTimeout(r, PAUSA_MS))
}

console.log('')

if (!precos.length) {
  console.error('\nnenhum preco coletado - nao vou sobrescrever src/data/prices.json')
  process.exit(1)
}

// precos de mercados que nao sao coletados aqui (encartes do Puppo, ofertas do Irani) ficam como estao
const coletados = precos.length
const anteriores = await lerJson('src/data/prices.json')
precos.push(...anteriores.filter((p) => !(p.marketId in MERCADOS)))

precos.sort((a, b) => a.productId.localeCompare(b.productId) || a.marketId.localeCompare(b.marketId))
await gravarJson('src/data/prices.json', precos)
await gravarJson('dados/coleta.json', {
  coletadoEm: agora,
  precosGravados: coletados,
  semOferta,
  falhas,
  porMercado: Object.fromEntries(
    Object.keys(MERCADOS).map((id) => [id, precos.filter((p) => p.marketId === id).length]),
  ),
})

// o catalogo nao tem codigo de barras proprio: os codigos sao das lojas e agora
// vivem em dados/vinculos.json, entao o campo do produto fica nulo em vez de
// carregar um codigo inventado
let eansLimpados = 0
for (const produto of produtos) {
  if (produto.ean) {
    produto.ean = null
    eansLimpados++
  }
}
await gravarJson('src/data/products.json', produtos)

console.log(`\nprecos gravados em src/data/prices.json: ${precos.length}`)
console.log(`  sem oferta agora: ${semOferta}   falhas: ${falhas}`)
console.log(`  codigos de barras inventados removidos do catalogo: ${eansLimpados}`)
