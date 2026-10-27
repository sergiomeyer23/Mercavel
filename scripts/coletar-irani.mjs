/**
 * Coleta as "ofertas do dia" do Irani (https://www.superirani.com.br/ofertas) e grava
 * em src/data/prices.json os itens que equivalem a produtos do catalogo.
 *
 * O Irani vende online so pelo irani.delivery (sem API publica), entao aqui entram apenas
 * as ofertas divulgadas no site institucional. Sao precos promocionais, de validade curta
 * (a data aparece na fonte do preco), e o catalogo e' generico: so vale item que tem o mesmo
 * tipo e tamanho do produto. As regras abaixo sao propositalmente conservadoras.
 *
 * Mexe so nos precos do Irani que casarem de novo; os demais precos ficam como estao.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL_OFERTAS = 'https://www.superirani.com.br/ofertas'

// produto do catalogo <- nome da oferta no site
const REGRAS = [
  { produtoId: 'cafe-torrado-500g', nome: /^caf[eé] .*500g/i },
  { produtoId: 'coxao-mole-kg', nome: /^cox[aã]o mole bovino pe[cç]a/i },
  { produtoId: 'banana-prata-kg', nome: /^banana prata kg/i },
  { produtoId: 'batata-inglesa-kg', nome: /^batata monalisa kg/i },
]

// com um caminho como argumento, le o html de um arquivo em vez de baixar (serve pra testar offline)
const arquivo = process.argv[2]
const html = arquivo
  ? await readFile(arquivo, 'utf8')
  : await (
      await fetch(URL_OFERTAS, {
        headers: { 'User-Agent': 'Mercavel/0.1 (+https://github.com/sergiomeyer23/Mercavel; projeto de estudo)' },
      })
    ).text()

const linhas = html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
  .replace(/<[^>]+>/g, '\n')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)

const validade = linhas.find((l) => /^Ofertas v[aá]lidas:/i.test(l))?.replace(/^Ofertas v[aá]lidas:\s*/i, '') ?? null

const ofertas = []
for (let i = 0; i < linhas.length - 1; i++) {
  const preco = linhas[i + 1].match(/^R\$\s*(\d+(?:\.\d{3})*,\d{2})$/)
  if (preco) {
    ofertas.push({ nome: linhas[i], preco: Number(preco[1].replace(/\./g, '').replace(',', '.')) })
  }
}

const novos = []
const agora = new Date().toISOString()
for (const regra of REGRAS) {
  const oferta = ofertas.find((o) => regra.nome.test(o.nome))
  if (!oferta) continue
  novos.push({
    id: `irani--${regra.produtoId}`,
    productId: regra.produtoId,
    marketId: 'irani',
    price: oferta.preco,
    priceType: 'PROMOTION',
    collectedAt: agora,
    source: `ofertas do dia do Irani${validade ? ` (${validade})` : ''}`,
    sourceUrl: URL_OFERTAS,
    availability: 'IN_STOCK',
    marketOriginalCategory: null,
    marketEan: null,
    marketProductName: oferta.nome,
    marketBrand: null,
  })
}

console.log(`ofertas lidas: ${ofertas.length}, equivalentes ao catalogo: ${novos.length}`)
if (novos.length === 0) process.exit(0)

const caminho = join(RAIZ, 'src/data/prices.json')
const atuais = JSON.parse(await readFile(caminho, 'utf8'))
const ids = new Set(novos.map((n) => n.id))
const todos = [...atuais.filter((p) => !ids.has(p.id)), ...novos].sort(
  (a, b) => a.productId.localeCompare(b.productId) || a.marketId.localeCompare(b.marketId),
)
await writeFile(caminho, JSON.stringify(todos, null, 2) + '\n', 'utf8')
