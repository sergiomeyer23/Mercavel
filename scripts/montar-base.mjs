/**
 * Junta o que o varrer-catalogo coletou em dados/catalogo/ e gera a base do site:
 *   src/data/products.json, prices.json, coletas.json (data da coleta de cada mercado)
 *   e ean-produtos.json (id do site -> EAN, so pro leitor de codigo)
 *   dados/casamentos-por-nome.json (pares do segundo passe, pra conferir)
 *
 * O mesmo produto e' casado entre mercados pelo codigo de barras. Quem fica sem par ganha um segundo
 * passe por marca + tamanho + nome (lib/casar-por-nome.mjs). So entra produto com estoque em 2+ mercados,
 * e a oferta que nao e' a mesma embalagem (pacote x unidade) sai (lib/qualidade.mjs).
 *
 * Se algum mercado vier vazio ou a base encolher demais, nao grava nada e sai com erro
 * (--forcar grava assim mesmo).
 *
 * Formato compacto, porque sao milhares de linhas (src/data.ts expande):
 *   produto { id, n nome, b marca, q quantidade, u unidade, t tamanho, c categoria, s subcategoria }
 *   preco   { p produto, m mercado, v preco, a estoque 0/1, l link, k categoria no mercado, n nome na loja }
 */

import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { casarOrfaos } from './lib/casar-por-nome.mjs'
import { categoriaDe, subcategoriaDe } from './lib/categorias.mjs'
import { MERCADOS, ORDEM_DOS_MERCADOS } from './lib/mercados.mjs'
import { mercadosCompativeis, problemasDaColeta } from './lib/qualidade.mjs'
import { tamanhoDoNome } from './lib/tamanho.mjs'
import { limparNome, slug } from './lib/texto.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const CATALOGO = join(RAIZ, 'dados/catalogo')

// No mesmo mercado o mesmo EAN pode aparecer em mais de um item: fica o que tem estoque e, depois, o mais barato.
const eMelhor = (novo, atual) =>
  !atual || (novo.disponivel && !atual.disponivel) || (novo.disponivel === atual.disponivel && novo.preco < atual.preco)

async function lerCatalogos() {
  const porEan = new Map() // ean -> { mercado -> item }
  const lidos = {}
  const coletas = {} // mercado -> coleta mais recente
  for (const mercado of ORDEM_DOS_MERCADOS) {
    const arquivos = await readdir(join(CATALOGO, mercado)).catch(() => [])
    lidos[mercado] = 0
    for (const arquivo of arquivos.filter((a) => a.endsWith('.json'))) {
      const { itens, coletadoEm } = JSON.parse(await readFile(join(CATALOGO, mercado, arquivo), 'utf8'))
      if (itens.length > 0 && !(coletas[mercado] >= coletadoEm)) coletas[mercado] = coletadoEm
      for (const item of itens) {
        if (!(item.preco > 0)) continue
        const ofertas = porEan.get(item.ean) ?? {}
        if (eMelhor(item, ofertas[mercado])) ofertas[mercado] = item
        porEan.set(item.ean, ofertas)
        lidos[mercado]++
      }
    }
  }
  return { porEan, lidos, coletas }
}

const idDoProduto = (nome, ean) => `${slug(nome)}-${createHash('sha1').update(ean).digest('hex').slice(0, 6)}`

function linkSemDominio(link, mercado) {
  const { site } = MERCADOS[mercado]
  return link && site && link.startsWith(site) ? link.slice(site.length) : link
}

const { porEan, lidos, coletas } = await lerCatalogos()
console.log('itens lidos por mercado:', lidos)

const produtos = []
const precos = []
const eanPorProduto = {}
const precosPorMercado = {}
let descartados = 0

// Devolve o id do produto, ou null se nao sobrou estoque em 2+ mercados com a mesma embalagem.
function adicionarProduto(ean, ofertas) {
  const mercados = mercadosCompativeis(ofertas, ORDEM_DOS_MERCADOS)
  if (mercados.filter((m) => ofertas[m].disponivel).length < 2) {
    descartados++
    return null
  }
  const base = ofertas[mercados[0]]
  const nome = limparNome(base.nome)
  const tamanho = tamanhoDoNome(nome, base.medida)
  const id = idDoProduto(nome, ean)

  produtos.push({
    id,
    n: nome,
    b: base.marca ? limparNome(base.marca) : null,
    q: tamanho.quantidade,
    u: tamanho.unidade,
    t: tamanho.texto,
    c: categoriaDe(base.caminho),
    s: subcategoriaDe(base.caminho),
  })
  eanPorProduto[id] = ean

  for (const mercado of mercados) {
    const oferta = ofertas[mercado]
    const nomeNaLoja = limparNome(oferta.nome)
    precos.push({
      p: id,
      m: mercado,
      v: oferta.preco,
      a: oferta.disponivel ? 1 : 0,
      l: linkSemDominio(oferta.link, mercado),
      k: oferta.caminho,
      n: nomeNaLoja !== nome ? nomeNaLoja : undefined,
    })
    precosPorMercado[mercado] = (precosPorMercado[mercado] ?? 0) + 1
  }
  return id
}

// 1o passe: mesmo EAN em 2+ mercados
const semPar = []
for (const [ean, ofertas] of porEan) {
  const mercados = ORDEM_DOS_MERCADOS.filter((m) => ofertas[m])
  if (mercados.length >= 2) adicionarProduto(ean, ofertas)
  else if (mercados.length === 1) {
    const { nome, marca } = ofertas[mercados[0]]
    semPar.push({ mercado: mercados[0], ean, nome, marca })
  }
}
const casadosPorEan = produtos.length

// 2o passe: quem ficou sozinho, por marca + tamanho + nome
const casamentosPorNome = []
for (const grupo of casarOrfaos(semPar)) {
  const ofertas = Object.fromEntries(grupo.map((g) => [g.mercado, porEan.get(g.ean)[g.mercado]]))
  const primeiro = grupo.find((g) => g.mercado === ORDEM_DOS_MERCADOS.find((m) => ofertas[m]))
  const produto = adicionarProduto(primeiro.ean, ofertas)
  if (!produto) continue
  casamentosPorNome.push({ produto, itens: grupo.map(({ mercado, ean, nome }) => ({ mercado, ean, nome })) })
}

produtos.sort((a, b) => a.n.localeCompare(b.n, 'pt-BR'))
precos.sort((a, b) => a.p.localeCompare(b.p) || a.m.localeCompare(b.m))

const produtosAntes = await readFile(join(RAIZ, 'src/data/products.json'), 'utf8').then(
  (texto) => JSON.parse(texto).length,
  () => 0,
)
const problemas = problemasDaColeta({ lidos, produtosAntes, produtosAgora: produtos.length })
if (problemas.length > 0) {
  console.error(`coleta incompleta: ${problemas.join('; ')}`)
  if (!process.argv.includes('--forcar')) {
    console.error('a base nao foi gravada (use --forcar pra gravar assim mesmo)')
    process.exit(1)
  }
}

await writeFile(join(RAIZ, 'src/data/products.json'), JSON.stringify(produtos) + '\n')
await writeFile(join(RAIZ, 'src/data/prices.json'), JSON.stringify(precos) + '\n')
await writeFile(join(RAIZ, 'src/data/coletas.json'), JSON.stringify(coletas, null, 1) + '\n')
await writeFile(join(RAIZ, 'src/data/ean-produtos.json'), JSON.stringify(eanPorProduto) + '\n')
await writeFile(join(RAIZ, 'dados/casamentos-por-nome.json'), JSON.stringify(casamentosPorNome, null, 1) + '\n')

console.log(`produtos distintos (EAN): ${porEan.size}`)
console.log(`casados por EAN: ${casadosPorEan}, por nome: ${casamentosPorNome.length}`)
console.log(`descartados (sem estoque em 2+ mercados ou embalagem diferente): ${descartados}`)
console.log(`na base do site (2+ mercados): ${produtos.length}`)
console.log('precos por mercado:', precosPorMercado)
