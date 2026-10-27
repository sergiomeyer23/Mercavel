/**
 * Coleta os precos da loja online do Irani (irani.delivery, unidade Av. Brasil, Cascavel).
 *
 * Nao tem API publica: a loja e' uma pagina renderizada, entao abro num navegador, busco cada
 * item e leio os cards, como um cliente faria. O catalogo do Mercavel e' generico ("Arroz Branco
 * Tipo 1 5 kg"), entao cada produto tem uma regra com o que a oferta PRECISA ter (tipo e tamanho)
 * e o que NAO pode ter (integral, sem gas, pack...). Entre as ofertas que passam, fica a mais barata.
 * Sem oferta equivalente, o produto simplesmente nao ganha preco do Irani.
 *
 * Uso: node scripts/coletar-irani.mjs
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOJA = 'https://www.irani.delivery/pacaembu'
const PAUSA_MS = 1500

// busca: o que digito na loja. tem: tudo isso precisa casar. nao: nada disso pode casar.
const kg = /\bkg\b|quilo/i
const REGRAS = [
  { id: 'arroz-tipo1-5kg', busca: 'arroz 5kg', tem: [/^arroz/i, /\b5 ?kg/i, /tp ?1|tipo 1/i], nao: [/parboil|integral|arb[oó]reo|negro|cateto/i] },
  { id: 'feijao-carioca-1kg', busca: 'feijao carioca 1kg', tem: [/feij[aã]o/i, /carioca/i, /\b1 ?kg/i], nao: [/preto|caldo|tropeiro|tempero|cozido|feijoada/i] },
  { id: 'cafe-torrado-500g', busca: 'cafe torrado moido 500g', tem: [/^caf[eé]/i, /\b500 ?g/i], nao: [/sol[uú]vel|c[aá]psula|gourmet|descaf|espresso|cappuccino|capuccino|3 em 1/i] },
  { id: 'acucar-refinado-1kg', busca: 'acucar refinado 1kg', tem: [/a[cç][uú]car/i, /refinado/i, /\b1 ?kg/i], nao: [/cristal|mascavo|demerara|colorido|org[aâ]nico|confeiteiro|impalp/i] },
  { id: 'farinha-trigo-1kg', busca: 'farinha de trigo 1kg', tem: [/farinha de trigo|^far(inha)? trigo/i, /\b1 ?kg/i], nao: [/integral|rosca|pizza|fermento|mandioca|milho/i] },
  { id: 'oleo-soja-900ml', busca: 'oleo de soja 900ml', tem: [/[oó]leo/i, /soja/i, /\b900 ?ml/i], nao: [] },
  { id: 'macarrao-espaguete-500g', busca: 'macarrao espaguete 500g', tem: [/(espaguete|spaghetti)/i, /\b500 ?g/i], nao: [/integral|instant|ovos|talharim|sem gl/i] },
  { id: 'molho-tomate-340g', busca: 'molho de tomate 340g', tem: [/molho de tomate|molho tomate/i, /\b340 ?g/i], nao: [/sach/i] },
  { id: 'milho-verde-lata', busca: 'milho verde 170g', tem: [/milho (verde|em conserva)/i, /\b170 ?g/i], nao: [] },
  { id: 'atum-ralado-lata', busca: 'atum ralado 170g', tem: [/atum/i, /ralado/i, /\b170 ?g/i], nao: [] },
  { id: 'leite-uht-integral-1l', busca: 'leite integral 1l', tem: [/^leite/i, /integral/i, /\b1 ?l\b|1 ?litro/i], nao: [/desnat|semi|zero|lact|condens|coco|em p[oó]|aveia|soja|am[eê]ndoa/i] },
  { id: 'queijo-mussarela-kg', busca: 'queijo mussarela kg', tem: [/mu[sç]arela|mussarela/i, kg], nao: [/ralado|bola|fatiad.*\d+ ?g/i] },
  { id: 'manteiga-200g', busca: 'manteiga 200g', tem: [/manteiga/i, /\b200 ?g/i], nao: [/sem sal|ghee|zero|amendoim|cacau|ma[cç][aã]/i] },
  { id: 'requeijao-200g', busca: 'requeijao cremoso 200g', tem: [/requeij[aã]o/i, /\b200 ?g/i], nao: [/light|zero|culin|polenguinho/i] },
  { id: 'iogurte-natural-170g', busca: 'iogurte natural 170g', tem: [/iogurte/i, /natural/i, /\b170 ?g/i], nao: [/zero|desnat|grego|mel|fruta|morango|coco|ameixa/i] },
  { id: 'ovo-branco-dz', busca: 'ovo branco 12', tem: [/^ovo/i, /branco|grande/i, /c\/ ?12|12 ?un|d[uú]zia/i], nao: [/codorna|p[aá]scoa|chocolate|c\/ ?(30|20|10)|\b30\b/i] },
  { id: 'coxao-mole-kg', busca: 'coxao mole kg', tem: [/cox[aã]o mole/i, kg], nao: [/mo[ií]d|bife|cubos|iscas/i] },
  { id: 'picanha-kg', busca: 'picanha bovina kg', tem: [/picanha/i, kg], nao: [/su[ií]n|hamb|frango|fatiad|pre[cç]o|steak|suina/i] },
  { id: 'file-peito-frango-kg', busca: 'file de peito de frango kg', tem: [/fil[eé]/i, /peito/i, /frango/i, kg], nao: [/empan|temper|congel.*\d+ ?g/i] },
  { id: 'coxa-sobrecoxa-kg', busca: 'coxa sobrecoxa frango kg', tem: [/coxa/i, /sobrecoxa/i, kg], nao: [] },
  { id: 'linguica-toscana-kg', busca: 'linguica toscana kg', tem: [/lingui[cç]a/i, /toscana/i, kg], nao: [/\d+ ?g\b/i] },
  { id: 'refrigerante-cola-2l', busca: 'refrigerante cola 2l', tem: [/refrigerante|coca|pepsi/i, /cola/i, /\b2 ?l\b/i], nao: [/zero|diet|sem a[cç]|light|cherry|vanilla/i] },
  { id: 'refrigerante-guarana-2l', busca: 'refrigerante guarana 2l', tem: [/guaran[aá]/i, /\b2 ?l\b/i], nao: [/zero|diet|sem a[cç]|light/i] },
  { id: 'suco-laranja-1l', busca: 'suco de laranja integral 1l', tem: [/suco/i, /laranja/i, /integral/i, /\b1 ?l\b/i], nao: [/n[eé]ctar|misto/i] },
  { id: 'agua-mineral-15l', busca: 'agua mineral 1,5l', tem: [/[aá]gua mineral/i, /1,5 ?l/i], nao: [/com g[aá]s|gaseific/i] },
  { id: 'cerveja-pilsen-350ml', busca: 'cerveja pilsen lata 350ml', tem: [/cerveja|cerv\b/i, /pilsen/i, /lata/i, /\b350 ?ml/i], nao: [/pack|c\/ ?\d|\d+ ?un|\bx ?\d|sem [aá]lcool|0,0/i] },
  { id: 'banana-prata-kg', busca: 'banana prata', tem: [/banana prata/i, kg], nao: [] },
  { id: 'tomate-italiano-kg', busca: 'tomate italiano', tem: [/tomate italiano/i, kg], nao: [/molho|extrato|seco/i] },
  { id: 'batata-inglesa-kg', busca: 'batata inglesa', tem: [/^batata (inglesa|lavada|monalisa)/i, kg], nao: [/palha|chips|congel|doce/i] },
  { id: 'cebola-nacional-kg', busca: 'cebola', tem: [/^cebola/i, kg], nao: [/roxa|p[oó]|conserva|pérola|perola|crocante/i] },
  { id: 'alface-crespa-un', busca: 'alface crespa', tem: [/alface crespa/i], nao: [/americana|roxa|hidrop|mix|salada/i] },
  { id: 'pao-frances-kg', busca: 'pao frances', tem: [/p[aã]o franc[eê]s/i, kg], nao: [/congel|mini/i] },
  { id: 'pao-forma-500g', busca: 'pao de forma 500g', tem: [/p[aã]o de forma/i, /\b500 ?g/i], nao: [/integral|sem gl|zero|light|hot dog|hamb|cenoura|sem casca/i] },
  { id: 'bolo-forma-400g', busca: 'bolo baunilha 400g', tem: [/^bolo/i, /baunilha/i, /\b400 ?g/i], nao: [/mistura|massa/i] },
  { id: 'pizza-congelada-460g', busca: 'pizza mussarela 460g', tem: [/pizza/i, /mussarela|mu[cç]arela/i, /\b460 ?g/i], nao: [] },
  { id: 'sorvete-creme-2l', busca: 'sorvete creme 2l', tem: [/sorvete/i, /creme/i, /\b2 ?l\b/i], nao: [/napolit|flocos|chocolate|morango/i] },
  { id: 'batata-palito-congelada-2kg', busca: 'batata palito congelada 2kg', tem: [/batata/i, /palito|pr[eé]-?frita/i, /\b2 ?kg/i], nao: [] },
  { id: 'detergente-neutro-500ml', busca: 'detergente neutro 500ml', tem: [/detergente/i, /neutro/i, /\b500 ?ml/i], nao: [/m[aá]quina|refil/i] },
  { id: 'sabao-po-1kg', busca: 'sabao em po 1kg', tem: [/sab[aã]o|lava.?roupas|lava roupa/i, /p[oó]\b/i, /\b1 ?kg/i], nao: [/barra|l[ií]quido|sach/i] },
  { id: 'amaciante-2l', busca: 'amaciante concentrado 2l', tem: [/amaciante/i, /concentrado/i, /\b2 ?l\b/i], nao: [] },
  { id: 'desinfetante-2l', busca: 'desinfetante pinho 2l', tem: [/desinfetante/i, /pinho/i, /\b2 ?l\b/i], nao: [] },
  { id: 'papel-higienico-12un', busca: 'papel higienico folha dupla 12', tem: [/papel higi[eê]nico/i, /folha dupla/i, /c\/ ?12|12 ?(un|rolos)|\b12\b/i], nao: [] },
  { id: 'sabonete-85g', busca: 'sabonete erva doce 85g', tem: [/sabonete/i, /erva.?doce/i, /\b85 ?g/i], nao: [] },
  { id: 'creme-dental-90g', busca: 'creme dental 90g', tem: [/creme dental/i, /\b90 ?g/i], nao: [/infantil|kids|clareador|sensib|gel/i] },
  { id: 'shampoo-350ml', busca: 'shampoo hidratacao 350ml', tem: [/shampoo/i, /hidrata/i, /\b350 ?ml/i], nao: [/kids|infantil/i] },
  { id: 'racao-cao-adulto-3kg', busca: 'racao caes adultos 3kg', tem: [/ra[cç][aã]o/i, /c[aã]e?s|cachorro|dog/i, /adult/i, /\b3 ?kg/i], nao: [/filhote|ú?mida|sach/i] },
  { id: 'racao-gato-1kg', busca: 'racao gatos adultos 1kg', tem: [/ra[cç][aã]o/i, /gato|cat/i, /adult/i, /\b1 ?kg/i], nao: [/filhote|sach|[uú]mida/i] },
  { id: 'pilha-aa-4un', busca: 'pilha alcalina aa', tem: [/pilha/i, /\baa\b/i, /c\/ ?4|4 ?(un|pilhas)|cartela c\/ ?4/i], nao: [/aaa|recarreg/i] },
]

// combos, kits e promocoes casadas nao servem de preco unitario
const COMBO = /\bkit\b|\+ |\bcombo\b|\bleve\b/i

const num = (t) => Number(t.replace(/\./g, '').replace(',', '.'))

/** Le os cards da pagina de busca: nome, preco atual, preco antigo (se tem desconto) e link. */
async function lerCards(pagina) {
  return pagina.evaluate(() => {
    const vistos = new Set()
    const saida = []
    for (const a of document.querySelectorAll('a[href*="/produto/"]')) {
      const href = a.getAttribute('href')
      if (vistos.has(href)) continue
      vistos.add(href)
      let card = a
      for (let i = 0; i < 4 && card.parentElement && !/R\$/.test(card.innerText); i++) card = card.parentElement
      saida.push({ href, linhas: card.innerText.split('\n').map((l) => l.trim()).filter(Boolean) })
    }
    return saida
  })
}

function interpretar(card) {
  const i = card.linhas.indexOf('Add')
  const nome = card.linhas[i + 1] ?? card.linhas.find((l) => l.length > 6 && !/^R\$|^[+-]/.test(l))
  const precos = card.linhas.filter((l) => /^R\$\s*[\d.]+,\d{2}/.test(l)).map((l) => num(l.match(/[\d.]+,\d{2}/)[0]))
  if (!nome || precos.length === 0) return null
  const indisponivel = card.linhas.some((l) => /indispon|esgotad|sem estoque/i.test(l))
  return { nome, preco: precos[0], antigo: precos[1] ?? null, indisponivel, href: card.href }
}

const navegador = await chromium.launch()
const pagina = await (await navegador.newContext({ locale: 'pt-BR', viewport: { width: 1300, height: 900 } })).newPage()
await pagina.goto(LOJA, { waitUntil: 'networkidle', timeout: 60000 })
try {
  await pagina.getByText('Aceitar todos').click({ timeout: 3000 })
} catch {
  // sem faixa de cookies
}
const campo = pagina.locator('input[placeholder="Busque pelo produto"]:visible').first()

const agora = new Date().toISOString()
const novos = []
let semOferta = 0
let falhas = 0

for (const regra of REGRAS) {
  try {
    await campo.fill(regra.busca)
    await campo.press('Enter')
    // espera a URL da busca NOVA (a anterior tambem casaria com /busca?q=) e o resultado assentar
    await pagina.waitForURL((u) => u.searchParams.get('q') === regra.busca, { timeout: 15000 })
    await pagina.waitForLoadState('networkidle')
    await pagina.waitForTimeout(2000)
    const candidatas = (await lerCards(pagina)).map(interpretar).filter(Boolean)
    if (process.env.DEBUG_IRANI) console.log(`\n[${regra.id}] ${candidatas.length} cards: ${candidatas.slice(0, 4).map((c) => c.nome).join(' / ')}`)
    const achadas = candidatas
      .filter((o) => !COMBO.test(o.nome) && regra.tem.every((r) => r.test(o.nome)) && !regra.nao.some((r) => r.test(o.nome)))
      .sort((a, b) => a.preco - b.preco)
    const oferta = achadas[0]
    if (!oferta) {
      semOferta++
      process.stdout.write('x')
    } else {
      novos.push({
        id: `irani--${regra.id}`,
        productId: regra.id,
        marketId: 'irani',
        price: oferta.preco,
        priceType: oferta.antigo ? 'PROMOTION' : 'ONLINE',
        collectedAt: agora,
        source: 'loja online do Irani (Av. Brasil, Cascavel)',
        sourceUrl: new URL(oferta.href, 'https://www.irani.delivery').href,
        availability: oferta.indisponivel ? 'OUT_OF_STOCK' : 'IN_STOCK',
        marketOriginalCategory: null,
        marketEan: null,
        marketProductName: oferta.nome,
        marketBrand: null,
      })
      process.stdout.write('.')
    }
  } catch (erro) {
    falhas++
    process.stdout.write('!')
  }
  await pagina.waitForTimeout(PAUSA_MS)
}
await navegador.close()
console.log(`\nirani: ${novos.length} precos, sem oferta equivalente: ${semOferta}, falhas: ${falhas}`)

// se a loja nao respondeu (ex.: mudou o layout), nao mexe nos precos que ja existem
if (novos.length < 5) {
  console.error('poucos resultados, mantendo os precos atuais do Irani')
  process.exit(1)
}

const caminho = join(RAIZ, 'src/data/prices.json')
const atuais = JSON.parse(await readFile(caminho, 'utf8'))
const todos = [...atuais.filter((p) => p.marketId !== 'irani'), ...novos].sort(
  (a, b) => a.productId.localeCompare(b.productId) || a.marketId.localeCompare(b.marketId),
)
await writeFile(caminho, JSON.stringify(todos, null, 2) + '\n', 'utf8')
