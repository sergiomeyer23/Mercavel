/**
 * Coletor de precos reais dos supermercados de Cascavel.
 *
 * Fase 1 (--revisar): busca cada produto do catalogo pelo nome no site do
 * mercado, pontua os candidatos e gera uma lista de revisao em dados/revisao.json.
 * NAO altera o catalogo: serve pra voce conferir a qualidade do casamento antes.
 *
 * Usa a API publica de catalogo da VTEX, que os tres mercados abaixo usam:
 *   /api/catalog_system/pub/products/search?ft=<termo>
 *
 * Detalhe que custou caro pra descobrir: o filtro por codigo de barras e
 *   fq=alternateIds_Ean:<ean>   (com DOIS PONTOS)
 * Com sinal de igual a API ignora o filtro em silencio e devolve o catalogo
 * inteiro - foi assim que a primeira medicao deu "49 de 49" e era mentira.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

// mercados que usam VTEX. o "base" inclui o prefixo /io que o Atacadao usa.
const MERCADOS = {
  muffato: { nome: 'Super Muffato', base: 'https://www.supermuffato.com.br' },
  festval: { nome: 'Festval', base: 'https://www.festval.com' },
  atacadao: { nome: 'Atacadao', base: 'https://www.atacadao.com.br/io' },
}

const CABECALHOS = {
  'User-Agent': 'Mercavel/0.1 (+https://github.com/sergiomeyer23/Mercavel; projeto de estudo)',
  Accept: 'application/json',
}

const PAUSA_MS = 300

// ---------------------------------------------------------------- texto

const PALAVRAS_IGNORADAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'para', 'por', 'ao', 'a', 'o',
  'tipo', 'unidade', 'unidades', 'caixa', 'pacote', 'embalagem', 'sabor',
])

function semAcento(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizar(texto) {
  return semAcento(String(texto ?? ''))
    .toLowerCase()
    .replace(/[^a-z0-9,.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function palavras(texto) {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p.length > 2 && !PALAVRAS_IGNORADAS.has(p) && !/^[\d.,]+$/.test(p))
}

const UNIDADES_MASSA = { kg: 1000, g: 1, mg: 0.001 }
const UNIDADES_VOLUME = { l: 1000, lt: 1000, litro: 1000, litros: 1000, ml: 1 }

/**
 * Tamanho da embalagem, sempre em gramas ou mililitros.
 * "5 kg" -> { gramas: 5000 }, "900 ml" -> { mililitros: 900 }
 */
function tamanhoDoNome(texto) {
  const t = normalizar(texto)
  const medida = {}

  const massa = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|mg|g)\b/)
  if (massa) {
    medida.gramas = parseFloat(massa[1].replace(',', '.')) * UNIDADES_MASSA[massa[2]]
  }

  const volume = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|litros|litro|lt|l)\b/)
  if (volume) {
    medida.mililitros = parseFloat(volume[1].replace(',', '.')) * UNIDADES_VOLUME[volume[2]]
  }

  // produto vendido a granel. as lojas escrevem das duas formas: "Picanha Kg"
  // e "Banana Prata Quilo" - so "kg" nao pegava metade dos casos
  if (!medida.gramas && !medida.mililitros && /(por kg|\bkg\b|\bquilos?\b)/.test(t)) {
    medida.gramas = 1000
  }

  return medida
}

function tamanhoDoCatalogo(produto) {
  const quantidade = Number(produto.quantity ?? 0)
  const unidade = normalizar(produto.quantityUnit ?? '')
  if (!quantidade) return {}

  if (unidade === 'kg') return { gramas: quantidade * 1000 }
  if (unidade === 'g') return { gramas: quantidade }
  if (unidade === 'l') return { mililitros: quantidade * 1000 }
  if (unidade === 'ml') return { mililitros: quantidade }
  if (unidade === 'un') return { unidades: quantidade }
  return {}
}

function descreverTamanho(medida) {
  if (medida.gramas) return medida.gramas >= 1000 ? `${medida.gramas / 1000} kg` : `${medida.gramas} g`
  if (medida.mililitros) return medida.mililitros >= 1000 ? `${medida.mililitros / 1000} L` : `${medida.mililitros} ml`
  if (medida.unidades) return `${medida.unidades} un`
  return '?'
}

// qualificadores que mudam o produto. se a oferta tem um que o nosso produto
// nao tem (ou vice-versa), o casamento vai pra revisao mesmo com nota alta:
// foi assim que "Farinha de Trigo Tipo 1" casou com "Farinha Integral".
const QUALIFICADORES = [
  'integral', 'desnatado', 'semidesnatado', 'sem lactose', 'zero', 'diet', 'light',
  'organico', 'refinado', 'cristal', 'extra', 'premium', 'sache', 'capsula',
  'instantaneo', 'solucionvel', 'po', 'cremoso', 'fatiado', 'moido', 'torrado',
  'com gas', 'sem gas', 'mistura', 'sem gluten',
]

function qualificadores(texto) {
  const t = normalizar(texto)
  const palavrasDoTexto = new Set(t.split(' '))
  // palavra inteira, senao "po" casaria dentro de "pouch" e "extra" em "extraforte"
  return new Set(
    QUALIFICADORES.filter((q) => (q.includes(' ') ? t.includes(q) : palavrasDoTexto.has(q))),
  )
}

/** Contagem no nome: "12 rolos", "4 unidades", "30 comprimidos". */
function unidadesDoNome(texto) {
  const achado = normalizar(texto).match(
    /(\d+)\s*(rolos|folhas|fatias|unidades|un|saches|capsulas|comprimidos)\b/,
  )
  return achado ? Number(achado[1]) : null
}

/** Pack, kit, fardo: o preco anunciado e' do conjunto, nao da unidade. */
function ehMultiplo(texto) {
  const t = normalizar(texto)
  return /\b(pack|kit|fardo|display|lastro)\b/.test(t) || /\d+\s*(unidades|un)\b/.test(t)
}

// ---------------------------------------------------------------- pontuacao

/**
 * Compara o produto do catalogo com uma oferta encontrada.
 * Peso maior no tamanho da embalagem, porque comparar 5 kg com 1 kg e' o erro
 * que estraga a comparacao de preco.
 */
function pontuar(alvo, oferta) {
  const meuTamanho = tamanhoDoCatalogo(alvo.produto)
  const tamanhoOferta = tamanhoDoNome(oferta.nome)

  const meuGramas = meuTamanho.gramas ?? (meuTamanho.mililitros ? meuTamanho.mililitros : null)
  const gramasOferta = tamanhoOferta.gramas ?? (tamanhoOferta.mililitros ? tamanhoOferta.mililitros : null)

  let tamanhoIgual = null // null = nao deu pra comparar
  if (meuGramas && gramasOferta) {
    const diferenca = Math.abs(meuGramas - gramasOferta) / meuGramas
    tamanhoIgual = diferenca <= 0.05
  }

  // contagem tambem e' tamanho: 12 rolos nao e' o mesmo produto que 16 rolos
  const minhasUnidades = meuTamanho.unidades ?? null
  const unidadesOferta = unidadesDoNome(oferta.nome)
  if (tamanhoIgual === null && minhasUnidades && unidadesOferta) {
    tamanhoIgual = minhasUnidades === unidadesOferta
  }

  const minhas = new Set(palavras(alvo.produto.name))
  const dele = new Set(palavras(oferta.nome))
  const comuns = [...minhas].filter((p) => dele.has(p)).length
  const cobertura = minhas.size ? comuns / minhas.size : 0

  // tamanho conflitante derruba a nota; tamanho igual e' o sinal mais forte
  const notaLimite = tamanhoIgual === false ? 0.2 : tamanhoIgual === true ? 1 : 0.55
  const pontuacao = cobertura * 0.6 + notaLimite * 0.4

  const meusQualificadores = qualificadores(alvo.produto.name)
  const qualificadoresOferta = qualificadores(oferta.nome)
  const motivosRevisao = [
    ...[...qualificadoresOferta].filter((q) => !meusQualificadores.has(q)),
    ...[...meusQualificadores].filter((q) => !qualificadoresOferta.has(q)),
  ]

  // pack de 12 latas por R$ 41 nao compara com uma lata. mas a duzia de ovos
  // ("12 un") bate com o nosso produto, entao ai nao e' problema.
  if (ehMultiplo(oferta.nome) && unidadesOferta !== minhasUnidades) {
    motivosRevisao.push('embalagem multipla')
  }

  // nosso produto tem tamanho, mas o da oferta nao deu pra ler: pode ser outra
  // embalagem, entao nao pode passar como alta
  if ((meuGramas || meuTamanho.unidades) && tamanhoIgual === null) {
    motivosRevisao.push('tamanho nao confirmado')
  }

  return {
    pontuacao: Number(pontuacao.toFixed(3)),
    cobertura: Number(cobertura.toFixed(3)),
    tamanhoIgual,
    meuTamanho: descreverTamanho(meuTamanho),
    tamanhoOferta: descreverTamanho(tamanhoOferta),
    motivosRevisao,
  }
}

const LIMITE_ALTA = 0.72

/**
 * Termos de busca, do mais especifico ao mais generico.
 * "Batata Inglesa" nao devolve nada no site, mas "Batata" devolve.
 */
function tentativasDeBusca(produto) {
  const significativas = palavras(produto.name)
  const completo = termoDeBusca(produto)
  const semUltima = significativas.slice(0, 2).join(' ')
  const soPrimeira = significativas.slice(0, 1).join(' ')

  return [...new Set([completo, semUltima, soPrimeira].filter(Boolean))]
}

function confianca(pontuacao) {
  if (pontuacao >= LIMITE_ALTA) return 'alta'
  if (pontuacao >= 0.55) return 'media'
  return 'baixa'
}

// ---------------------------------------------------------------- coleta

/**
 * O nome do nosso produto vira termo de busca.
 * Os parenteses derrubavam a API com HTTP 400 ("Picanha Bovina (por kg)"),
 * entao eles saem fora - o tamanho ja vem dos campos do catalogo.
 */
function termoDeBusca(produto) {
  return produto.name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 8)
    .join(' ')
}

async function buscar(mercado, termo, quantos = 5) {
  const url = `${mercado.base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(termo)}&_from=0&_to=${quantos - 1}`
  const resposta = await fetch(url, { headers: CABECALHOS })

  if (!resposta.ok) {
    throw new Error(`${resposta.status} em ${mercado.base}`)
  }

  const tipo = resposta.headers.get('content-type') ?? ''
  if (!tipo.includes('json')) {
    // o site devolveu HTML: essa rota nao e' VTEX (foi o que aconteceu no Puppo)
    throw new Error(`resposta nao-JSON (${tipo.split(';')[0]}) - a rota nao parece ser VTEX`)
  }

  const produtos = await resposta.json()

  const ofertas = (Array.isArray(produtos) ? produtos : []).map((p) => {
    const item = p.items?.[0] ?? {}
    const oferta = item.sellers?.[0]?.commertialOffer ?? {}
    return {
      nome: p.productName,
      marca: p.brand ?? null,
      ean: item.ean || null,
      preco: oferta.Price ?? null,
      disponivel: Boolean(oferta.IsAvailable),
      tamanho: descreverTamanho(tamanhoDoNome(p.productName)),
      link: p.link ?? null,
      imagem: item.images?.[0]?.imageUrl ?? null,
    }
  })

  // o Atacadao devolve Price 0 quando a regiao de entrega nao esta definida.
  // oferta sem preco nao serve pra comparar nada, entao sai da lista.
  return ofertas.filter((oferta) => typeof oferta.preco === 'number' && oferta.preco > 0)
}

async function revisarMercado(idMercado, produtos) {
  const mercado = MERCADOS[idMercado]
  console.log(`\n=== ${mercado.nome} (${mercado.base}) - ${produtos.length} produtos`)

  const resultados = []
  let alta = 0
  let media = 0
  let baixa = 0
  let falhas = 0

  for (const produto of produtos) {
    const alvo = { produto }
    process.stdout.write(`  ${produto.id.padEnd(30)} `)

    try {
      // tenta o nome completo e vai encurtando enquanto a nota for fraca
      let pontuadas = []
      for (const termo of tentativasDeBusca(produto)) {
        const ofertas = await buscar(mercado, termo)
        const avaliadas = ofertas
          .map((oferta) => ({ ...oferta, ...pontuar(alvo, oferta) }))
          .sort((a, b) => b.pontuacao - a.pontuacao)

        if (avaliadas.length && (!pontuadas.length || avaliadas[0].pontuacao > pontuadas[0].pontuacao)) {
          pontuadas = avaliadas
        }
        if (pontuadas.length && pontuadas[0].pontuacao >= LIMITE_ALTA) break

        await new Promise((r) => setTimeout(r, PAUSA_MS))
      }

      if (!pontuadas.length) {
        console.log('sem oferta com preco')
        resultados.push({ produtoId: produto.id, nossoNome: produto.name, confianca: 'nenhuma', escolhido: null, candidatos: [] })
        baixa++
        continue
      }

      const escolhido = pontuadas[0]
      let nivel = confianca(escolhido.pontuacao)

      // qualificador divergente (integral x tipo 1, desnatado x integral) nunca
      // passa como alta: vai pra revisao, mesmo com a nota la em cima
      if (nivel === 'alta' && escolhido.motivosRevisao.length > 0) {
        nivel = 'media'
      }

      if (nivel === 'alta') alta++
      else if (nivel === 'media') media++
      else baixa++

      const aviso = escolhido.motivosRevisao.length
        ? `  <-- revisar: ${escolhido.motivosRevisao.join(', ')}`
        : ''

      console.log(
        `${nivel.padEnd(5)} ${String(escolhido.pontuacao).padEnd(5)} ` +
          `R$ ${String(escolhido.preco).padEnd(7)} ${escolhido.tamanho.padEnd(7)} ${escolhido.nome.slice(0, 44)}${aviso}`,
      )

      resultados.push({
        produtoId: produto.id,
        nossoNome: produto.name,
        nossoTamanho: descreverTamanho(tamanhoDoCatalogo(produto)),
        confianca: nivel,
        escolhido,
        candidatos: pontuadas.slice(1),
      })
    } catch (erro) {
      console.log(`FALHA: ${erro.message}`)
      resultados.push({ produtoId: produto.id, nossoNome: produto.name, confianca: 'erro', erro: erro.message, candidatos: [] })
      falhas++
    }

    await new Promise((r) => setTimeout(r, PAUSA_MS))
  }

  return {
    mercado: idMercado,
    nome: mercado.nome,
    base: mercado.base,
    total: produtos.length,
    resumo: { alta, media, baixa, falhas },
    resultados,
  }
}

// ---------------------------------------------------------------- principal

const argumentos = process.argv.slice(2)
const pegarArgumento = (nome) => argumentos.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1]

const mercadosPedidos = (pegarArgumento('mercados') ?? 'muffato').split(',').filter((m) => MERCADOS[m])
const limite = Number(pegarArgumento('limite') ?? 0)

if (!mercadosPedidos.length) {
  console.error(`mercado invalido. opcoes: ${Object.keys(MERCADOS).join(', ')}`)
  process.exit(1)
}

const produtos = JSON.parse(await readFile(join(RAIZ, 'src/data/products.json'), 'utf8'))
const alvos = limite > 0 ? produtos.slice(0, limite) : produtos

const saida = {
  geradoEm: new Date().toISOString(),
  observacao:
    'Lista de revisao: compara cada produto do catalogo com as ofertas reais encontradas. ' +
    'Confira as de confianca media e baixa antes de gravar os EANs no catalogo.',
  mercados: [],
}

for (const idMercado of mercadosPedidos) {
  try {
    saida.mercados.push(await revisarMercado(idMercado, alvos))
  } catch (erro) {
    console.error(`\n!!! ${idMercado}: ${erro.message}`)
    saida.mercados.push({ mercado: idMercado, nome: MERCADOS[idMercado].nome, erro: erro.message, resultados: [] })
  }
}

await mkdir(join(RAIZ, 'dados'), { recursive: true })
const destino = join(RAIZ, pegarArgumento('saida') ?? 'dados/revisao.json')
await writeFile(destino, JSON.stringify(saida, null, 2) + '\n', 'utf8')

console.log('\n=== resumo')
for (const m of saida.mercados) {
  if (m.erro) {
    console.log(`  ${m.nome}: FALHOU - ${m.erro}`)
    continue
  }
  const { alta, media, baixa, falhas } = m.resumo
  const pct = ((alta / m.total) * 100).toFixed(0)
  console.log(`  ${m.nome}: ${alta} alta (${pct}%), ${media} media, ${baixa} baixa, ${falhas} falhas`)
}
console.log(`\nlista salva em: ${destino}`)
