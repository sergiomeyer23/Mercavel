/**
 * Varre o catalogo publico de um mercado VTEX, categoria por categoria, e grava o que achou em
 * dados/catalogo/<mercado>/<categoria>.json (fica fora do git; quem vai pro site e' o montar-base).
 *
 * O codigo de barras (EAN) e' so a chave interna pra casar o mesmo produto entre mercados.
 *
 * Uso:
 *   node scripts/varrer-catalogo.mjs --mercado muffato|festval|atacadao
 *        [--so <ids>]               varre so essa categoria, pelo caminho de ids (ex: 2-18-19)
 *        [--limite <n>]             pra na n-esima categoria (teste)
 *        [--retomar]                pula categorias que ja tem arquivo
        [--parte i/n]              varre so a fatia i de n das categorias (i de 1 a n), pra dividir em processos
 *
 * A VTEX nao entrega mais que 2500 resultados por consulta, entao categoria grande e' dividida
 * nas subcategorias. Pausa entre as requisicoes pra nao pesar no site.
 */

import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const PAGINA = 50
const LIMITE_VTEX = 2450
const PAUSA_MS = 300

const MERCADOS = {
  muffato: { base: 'https://www.supermuffato.com.br' },
  festval: {
    base: 'https://www.festval.com',
    // o catalogo do Festval mostra o vendedor padrao (sem estoque em quase tudo). o preco e o estoque de
    // Cascavel saem da simulacao de carrinho com o CEP e as lojas da regiao
    simulacao: { cep: '85810-000', vendedores: ['meufestvalcarlosgomes', 'meufestvalcatuai', '1'] },
  },
  // o preco do Atacadao tambem depende da loja: no catalogo vem zerado pra maioria dos itens. a simulacao com
  // o CEP de Cascavel devolve a loja de retirada de la, com preco real; o que nao tem preco la nao e' vendido la
  atacadao: {
    base: 'https://www.atacadao.com.br/io',
    simulacao: { cep: '85810-000', vendedores: ['1'], descartarSemPreco: true },
  },
}

const CABECALHOS = {
  'User-Agent': 'Mercavel/0.2 (+https://github.com/sergiomeyer23/Mercavel; projeto de estudo)',
  Accept: 'application/json',
}

const argumentos = process.argv.slice(2)
const pegar = (nome) => {
  const i = argumentos.indexOf(`--${nome}`)
  return i >= 0 ? argumentos[i + 1] : undefined
}
const nomeMercado = pegar('mercado')
const mercado = MERCADOS[nomeMercado]
if (!mercado) {
  console.error('uso: node scripts/varrer-catalogo.mjs --mercado muffato|festval|atacadao')
  process.exit(1)
}
const soCategoria = pegar('so')
const limiteCategorias = Number(pegar('limite') ?? Infinity)
const retomar = argumentos.includes('--retomar')
// --parte 2/3: varre so a segunda de tres fatias das categorias (pra rodar em paralelo)
const [parte, partes] = (pegar('parte') ?? '1/1').split('/').map(Number)

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function pedir(url, opcoes = {}) {
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const resposta = await fetch(url, { headers: CABECALHOS, ...opcoes })
      if (resposta.status === 429 || resposta.status >= 500) throw new Error(`HTTP ${resposta.status}`)
      return resposta
    } catch (erro) {
      if (tentativa === 4) throw erro
      await dormir(1500 * tentativa)
    }
  }
}

// ---------------------------------------------------------------- categorias

async function arvore() {
  const r = await pedir(`${mercado.base}/api/catalog_system/pub/category/tree/4`)
  if (!r.ok) throw new Error(`arvore de categorias: HTTP ${r.status}`)
  return r.json()
}

// subcategoria so e' achada pelo caminho de ids (C:/2/18/19/); o id solto so funciona nas raizes
const filtro = (ids) => `C:/${ids.join('/')}/`

async function total(ids) {
  const r = await pedir(`${mercado.base}/api/catalog_system/pub/products/search?fq=${filtro(ids)}&_from=0&_to=0`)
  const m = (r.headers.get('resources') ?? '').match(/\/(\d+)$/)
  return m ? Number(m[1]) : 0
}

/** Devolve a lista de categorias a varrer: a propria se couber em 2450 itens, senao as filhas. */
async function planejar(no, caminho = [], ids = []) {
  const caminhoIds = [...ids, no.id]
  const n = await total(caminhoIds)
  await dormir(PAUSA_MS)
  const trilha = [...caminho, no.name]
  if (n === 0) return []
  if (n <= LIMITE_VTEX || !(no.children ?? []).length) {
    if (n > LIMITE_VTEX) console.warn(`  aviso: "${trilha.join(' > ')}" tem ${n} itens e nao tem filhas; pego so os primeiros ${LIMITE_VTEX}`)
    return [{ id: caminhoIds.join('-'), ids: caminhoIds, caminho: trilha, n }]
  }
  const saida = []
  for (const filho of no.children) saida.push(...(await planejar(filho, trilha, caminhoIds)))
  return saida
}

// ---------------------------------------------------------------- itens

const EAN_VALIDO = /^\d{8,14}$/

function normalizarEan(bruto) {
  const so = String(bruto ?? '').trim()
  if (!EAN_VALIDO.test(so)) return null
  const sem0 = so.replace(/^0+/, '')
  // 13 digitos comecando com 2 e' codigo interno de balanca/loja, nao identifica o produto no pais todo
  if (sem0.length === 13 && sem0.startsWith('2')) return null
  return sem0
}

function lerProduto(produto) {
  const saida = []
  for (const item of produto.items ?? []) {
    const ean = normalizarEan(item.ean)
    if (!ean) continue
    const oferta = item.sellers?.[0]?.commertialOffer ?? {}
    // com simulacao o preco do catalogo nao vale nada, entao nao descarta aqui
    if (!(oferta.Price > 0) && !mercado.simulacao) continue
    saida.push({
      ean,
      sku: item.itemId,
      nome: produto.productName,
      marca: produto.brand ?? null,
      preco: oferta.Price,
      precoLista: oferta.ListPrice > oferta.Price ? oferta.ListPrice : null,
      disponivel: Boolean(oferta.IsAvailable),
      medida: item.measurementUnit ?? null,
      multiplicador: item.unitMultiplier ?? null,
      caminho: produto.categories?.[0] ?? null,
      link: produto.link ?? null,
    })
  }
  return saida
}

async function varrerCategoria(ids) {
  const itens = []
  for (let de = 0; de < LIMITE_VTEX; de += PAGINA) {
    const r = await pedir(
      `${mercado.base}/api/catalog_system/pub/products/search?fq=${filtro(ids)}&_from=${de}&_to=${de + PAGINA - 1}`,
    )
    if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status}`)
    const lote = await r.json()
    if (!Array.isArray(lote) || lote.length === 0) break
    for (const p of lote) itens.push(...lerProduto(p))
    if (lote.length < PAGINA) break
    await dormir(PAUSA_MS)
  }
  return itens
}

/** Troca preco/estoque do catalogo pelos da simulacao de carrinho em Cascavel (Festval e Atacadao). */
async function refinarPorSimulacao(itens) {
  const { cep, vendedores, descartarSemPreco } = mercado.simulacao
  const pendentes = new Map(itens.map((i) => [String(i.sku), i]))
  for (const i of itens) i.disponivel = false
  for (const vendedor of vendedores) {
    const skus = [...pendentes.keys()]
    for (let k = 0; k < skus.length; k += PAGINA) {
      const lote = skus.slice(k, k + PAGINA)
      const r = await pedir(`${mercado.base}/api/checkout/pub/orderforms/simulation?sc=1`, {
        method: 'POST',
        headers: { ...CABECALHOS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lote.map((id) => ({ id, quantity: 1, seller: vendedor })),
          country: 'BRA',
          postalCode: cep,
        }),
      })
      if (!r.ok) continue
      for (const resposta of (await r.json()).items ?? []) {
        const item = pendentes.get(String(resposta.id))
        if (item && resposta.availability === 'available' && resposta.sellingPrice > 0) {
          item.preco = resposta.sellingPrice / 100
          item.precoLista = resposta.listPrice > resposta.sellingPrice ? resposta.listPrice / 100 : null
          item.disponivel = true
          pendentes.delete(String(resposta.id))
        }
      }
      await dormir(PAUSA_MS)
    }
  }
  // item sem estoque e sem preco no catalogo (preco 0) nao serve nem como referencia
  return itens.filter((i) => (descartarSemPreco ? i.disponivel : i.preco > 0))
}

// ---------------------------------------------------------------- principal

const pasta = join(RAIZ, 'dados/catalogo', nomeMercado)
await mkdir(pasta, { recursive: true })

let categorias
if (soCategoria) {
  const ids = soCategoria.split('-').map(Number)
  categorias = [{ id: soCategoria, ids, caminho: ['(manual)'], n: await total(ids) }]
} else {
  console.log(`${nomeMercado}: lendo a arvore de categorias...`)
  categorias = []
  for (const depto of await arvore()) categorias.push(...(await planejar(depto)))
}
console.log(`${nomeMercado}: ${categorias.length} categorias, ${categorias.reduce((s, c) => s + c.n, 0)} produtos`)

categorias = categorias.filter((_, i) => i % partes === parte - 1)
if (partes > 1) console.log(`${nomeMercado}: parte ${parte}/${partes} = ${categorias.length} categorias`)

const agora = new Date().toISOString()
let feitas = 0
let gravados = 0
for (const cat of categorias) {
  if (feitas >= limiteCategorias) break
  const arquivo = join(pasta, `${cat.id}.json`)
  if (retomar) {
    try {
      await access(arquivo)
      continue
    } catch {
      // ainda nao foi varrida
    }
  }
  try {
    let itens = await varrerCategoria(cat.ids)
    if (mercado.simulacao && itens.length) itens = await refinarPorSimulacao(itens)
    await writeFile(
      arquivo,
      JSON.stringify({ mercado: nomeMercado, categoriaId: cat.id, caminho: cat.caminho, coletadoEm: agora, itens }) + '\n',
    )
    gravados += itens.length
    feitas++
    console.log(`  ${cat.caminho.join(' > ')}: ${itens.length} itens`)
  } catch (erro) {
    console.error(`  falhou "${cat.caminho.join(' > ')}": ${erro.message}`)
  }
}
console.log(`${nomeMercado}: ${feitas} categorias gravadas, ${gravados} itens`)
