/**
 * Monta a base do site a partir do que o varrer-catalogo.mjs coletou em dados/catalogo/.
 *
 * - casa o mesmo produto entre mercados pelo codigo de barras (EAN). O EAN e' so a chave interna:
 *   nao vai pro site, que mostra descricao, tamanho e preco.
 * - quem ficou sem par ganha um segundo passe por marca + tamanho + nome (scripts/lib/casar-por-nome.mjs),
 *   porque o mesmo produto pode ter codigos de barras diferentes. os pares ficam em dados/casamentos-por-nome.json
 * - so entra produto que aparece em 2 ou mais mercados (senao nao tem o que comparar)
 * - gera src/data/products.json, prices.json e src/data/ean-produtos.json (id do site -> EAN, so o leitor de codigo de barras usa)
 *
 * Formato compacto (o site expande em src/data.ts), porque sao milhares de linhas:
 *   produto: { id, n: nome, b: marca, q: quantidade, u: unidade, t: texto do tamanho, c: categoria, s: subcategoria }
 *   preco:   { p: produto, m: mercado, v: preco, a: 1 se tem estoque, d: coletado em, l: link sem o dominio, k: caminho no mercado }
 */

import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { casarOrfaos } from './lib/casar-por-nome.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

// ordem de preferencia pra escolher o nome e a categoria do produto
const MERCADOS = ['muffato', 'festval', 'atacadao']

// ---------------------------------------------------------------- leitura

async function lerCatalogos() {
  const porEan = new Map() // ean -> { mercado -> item }
  const coleta = {}
  for (const mercado of MERCADOS) {
    let arquivos = []
    try {
      arquivos = (await readdir(join(RAIZ, 'dados/catalogo', mercado))).filter((a) => a.endsWith('.json'))
    } catch {
      continue
    }
    let itens = 0
    for (const arquivo of arquivos) {
      const dados = JSON.parse(await readFile(join(RAIZ, 'dados/catalogo', mercado, arquivo), 'utf8'))
      for (const item of dados.itens) {
        if (!(item.preco > 0)) continue
        if (!porEan.has(item.ean)) porEan.set(item.ean, {})
        const atual = porEan.get(item.ean)[mercado]
        // o mesmo EAN pode aparecer mais de uma vez no mercado: fica o que tem estoque, depois o mais barato
        const melhor =
          !atual ||
          (item.disponivel && !atual.disponivel) ||
          (item.disponivel === atual.disponivel && item.preco < atual.preco)
        if (melhor) porEan.get(item.ean)[mercado] = { ...item, coletadoEm: dados.coletadoEm }
        itens++
      }
    }
    coleta[mercado] = itens
  }
  return { porEan, coleta }
}

// ---------------------------------------------------------------- tamanho e categoria

const UNIDADES = { kg: 'KG', g: 'G', mg: 'G', l: 'L', lt: 'L', litro: 'L', litros: 'L', ml: 'ML', un: 'UN', und: 'UN', unid: 'UN', rolos: 'UN', rolo: 'UN' }

function tamanhoDoNome(nome, medida) {
  const achados = [...nome.matchAll(/(\d+(?:[.,]\d+)?)\s?(kg|g|mg|ml|lt|litros?|l|unid|und|un|rolos?)\b/gi)]
  const m = achados[achados.length - 1]
  if (m) {
    let quantidade = Number(m[1].replace(',', '.'))
    const bruta = m[2].toLowerCase()
    if (bruta === 'mg') quantidade /= 1000
    const unidade = UNIDADES[bruta]
    return { quantidade, unidade, texto: `${m[1].replace('.', ',')} ${unidade === 'UN' ? 'un' : unidade.toLowerCase()}` }
  }
  if (medida === 'kg') return { quantidade: 1, unidade: 'KG', texto: 'por kg' }
  return { quantidade: 1, unidade: 'UN', texto: '1 un' }
}

const CATEGORIAS = [
  [/hortifr|feira|floricultura/, 'cat-hortifruti'],
  [/carne|a[cç]ougue|aves|peixe|frango/, 'cat-carnes'],
  [/bebida|adega|cerveja|vinho|destilad/, 'cat-bebidas'],
  [/latic[ií]nio|frios|queijo|iogurte|ovos/, 'cat-laticinios'],
  [/higiene|beleza|perfumaria|cuidados|farm[aá]cia/, 'cat-higiene'],
  [/limpeza|lavanderia/, 'cat-limpeza'],
  [/padaria|confeitaria|panifica/, 'cat-padaria'],
  [/congelad|sorvete/, 'cat-congelados'],
  [/\bpet\b|animais/, 'cat-pet'],
  [/mercearia|alimento|matinal|diet|gastronomia|importado|biscoito|doce|snack|conserva|massas|cafe|caf[eé]/, 'cat-mercearia'],
]

function categoriaDe(caminho) {
  const primeiro = (caminho ?? '').split('/').filter(Boolean)[0]?.toLowerCase() ?? ''
  for (const [regra, id] of CATEGORIAS) if (regra.test(primeiro)) return id
  return 'cat-outros'
}

const subcategoriaDe = (caminho) => (caminho ?? '').split('/').filter(Boolean)[1] ?? null

// ---------------------------------------------------------------- montagem

// os mercados mandam nome com aspas duplicadas, espaço sobrando etc.
const limparNome = (nome) =>
  nome
    .replace(/'{2,}|"{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const slug = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

const idDoProduto = (nome, ean) => `${slug(nome)}-${createHash('sha1').update(ean).digest('hex').slice(0, 6)}`

const { porEan, coleta } = await lerCatalogos()
console.log('itens lidos por mercado:', coleta)

const produtos = []
const precos = []
const eans = {}
const porMercado = {}

function adicionar(ean, ofertas) {
  const mercadosDoProduto = MERCADOS.filter((m) => ofertas[m])
  const base = ofertas[mercadosDoProduto[0]]
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
  eans[id] = ean

  for (const mercado of mercadosDoProduto) {
    const o = ofertas[mercado]
    const dominio = { muffato: 'https://www.supermuffato.com.br', festval: 'https://www.festval.com', atacadao: '' }[mercado]
    precos.push({
      p: id,
      m: mercado,
      v: o.preco,
      a: o.disponivel ? 1 : 0,
      d: o.coletadoEm,
      l: o.link && dominio && o.link.startsWith(dominio) ? o.link.slice(dominio.length) : o.link,
      k: o.caminho,
      n: limparNome(o.nome) !== nome ? limparNome(o.nome) : undefined,
    })
    porMercado[mercado] = (porMercado[mercado] ?? 0) + 1
  }
  return id
}

// 1o passe: mesmo EAN em 2+ mercados
const orfaos = []
for (const [ean, ofertas] of porEan) {
  const presentes = MERCADOS.filter((m) => ofertas[m])
  if (presentes.length >= 2) adicionar(ean, ofertas)
  else if (presentes.length === 1) orfaos.push({ mercado: presentes[0], ean, nome: ofertas[presentes[0]].nome, marca: ofertas[presentes[0]].marca })
}
const casadosPorEan = produtos.length

// 2o passe: quem ficou sozinho, por marca + tamanho + nome
const auditoria = []
for (const grupo of casarOrfaos(orfaos)) {
  const ofertas = {}
  for (const g of grupo) ofertas[g.mercado] = porEan.get(g.ean)[g.mercado]
  const primeiro = MERCADOS.find((m) => ofertas[m])
  const id = adicionar(grupo.find((g) => g.mercado === primeiro).ean, ofertas)
  auditoria.push({ produto: id, itens: grupo.map(({ mercado, ean, nome }) => ({ mercado, ean, nome })) })
}

produtos.sort((a, b) => a.n.localeCompare(b.n, 'pt-BR'))
precos.sort((a, b) => a.p.localeCompare(b.p) || a.m.localeCompare(b.m))

await writeFile(join(RAIZ, 'src/data/products.json'), JSON.stringify(produtos) + '\n')
await writeFile(join(RAIZ, 'src/data/prices.json'), JSON.stringify(precos) + '\n')
await writeFile(join(RAIZ, 'src/data/ean-produtos.json'), JSON.stringify(eans) + '\n')
await writeFile(join(RAIZ, 'dados/casamentos-por-nome.json'), JSON.stringify(auditoria, null, 1) + '\n')

const todos = [...porEan.values()].length
console.log(`produtos distintos (EAN): ${todos}`)
console.log(`casados por EAN: ${casadosPorEan}, casados por nome: ${auditoria.length}`)
console.log(`na base do site (2+ mercados): ${produtos.length}`)
console.log('precos por mercado:', porMercado)
