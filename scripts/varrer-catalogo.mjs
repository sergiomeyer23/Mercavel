/**
 * Varre o catalogo publico de um mercado, categoria por categoria, e grava
 * dados/catalogo/<mercado>/<categoria>.json (fora do git; o site usa o que o montar-base gera).
 *
 * node scripts/varrer-catalogo.mjs --mercado muffato|festval|atacadao
 *   --so <ids>      so essa categoria, pelo caminho de ids (ex: 2-18-19)
 *   --limite <n>    para depois de n categorias (teste)
 *   --retomar       pula categorias que ja tem arquivo
 *   --parte i/n     so a fatia i de n das categorias, pra rodar em paralelo
 */

import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MERCADOS } from './lib/mercados.mjs'
import { criarClienteVtex } from './lib/vtex.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

const argumentos = process.argv.slice(2)
const valorDe = (nome) => {
  const posicao = argumentos.indexOf(`--${nome}`)
  return posicao >= 0 ? argumentos[posicao + 1] : undefined
}

const nomeDoMercado = valorDe('mercado')
const mercado = MERCADOS[nomeDoMercado]
if (!mercado) {
  console.error('uso: node scripts/varrer-catalogo.mjs --mercado muffato|festval|atacadao')
  process.exit(1)
}
const soCategoria = valorDe('so')
const limiteDeCategorias = Number(valorDe('limite') ?? Infinity)
const retomar = argumentos.includes('--retomar')
const [parte, totalDePartes] = (valorDe('parte') ?? '1/1').split('/').map(Number)

const vtex = criarClienteVtex(mercado)

async function categoriasParaVarrer() {
  if (soCategoria) {
    const ids = soCategoria.split('-').map(Number)
    return [{ id: soCategoria, ids, caminho: ['(manual)'], n: await vtex.totalDaCategoria(ids) }]
  }
  console.log(`${nomeDoMercado}: lendo a arvore de categorias...`)
  const categorias = []
  for (const departamento of await vtex.arvoreDeCategorias()) categorias.push(...(await vtex.planejar(departamento)))
  return categorias
}

const jaExiste = (arquivo) => access(arquivo).then(() => true, () => false)

const todas = await categoriasParaVarrer()
console.log(`${nomeDoMercado}: ${todas.length} categorias, ${todas.reduce((soma, c) => soma + c.n, 0)} produtos`)

const categorias = todas.filter((_, i) => i % totalDePartes === parte - 1)
if (totalDePartes > 1) console.log(`${nomeDoMercado}: parte ${parte}/${totalDePartes}, ${categorias.length} categorias`)

const pasta = join(RAIZ, 'dados/catalogo', nomeDoMercado)
await mkdir(pasta, { recursive: true })

const coletadoEm = new Date().toISOString()
let gravadas = 0
let itensGravados = 0

for (const categoria of categorias) {
  if (gravadas >= limiteDeCategorias) break
  const arquivo = join(pasta, `${categoria.id}.json`)
  if (retomar && (await jaExiste(arquivo))) continue

  const nome = categoria.caminho.join(' > ')
  try {
    let itens = await vtex.varrerCategoria(categoria.ids)
    if (mercado.simulacao && itens.length > 0) itens = await vtex.aplicarSimulacao(itens)
    const conteudo = { mercado: nomeDoMercado, categoriaId: categoria.id, caminho: categoria.caminho, coletadoEm, itens }
    await writeFile(arquivo, JSON.stringify(conteudo) + '\n')
    gravadas++
    itensGravados += itens.length
    console.log(`  ${nome}: ${itens.length} itens`)
  } catch (erro) {
    console.error(`  falhou "${nome}": ${erro.message}`)
  }
}

console.log(`${nomeDoMercado}: ${gravadas} categorias gravadas, ${itensGravados} itens`)
