// Cliente do catalogo publico de lojas feitas na plataforma Mercafacil Phygital (Irani, Riviera).
//
// O site e' Next.js e entrega cada pagina de categoria ja com os produtos no payload RSC
// (self.__next_f.push). Aqui esse payload e' lido e normalizado para o mesmo item do vtex.mjs.
// A API GraphQL do site nao expoe codigo de barras, entao o item recebe um id proprio (veja idDoItem)
// e so casa com outros mercados pelo segundo passe do montar-base (marca + tamanho + nome).
//
// Fallback do Irani: se o site bloquear a coleta (HTTP 403/WAF), le as ofertas do dia em superirani.com.br/ofertas.

const PAUSA_MS = 400
const TENTATIVAS = 4
const PRAZO_MS = 30_000
const LIMITE_DE_PAGINAS = 200

const CABECALHOS = {
  'User-Agent': 'Mercavel/0.2 (+https://github.com/sergiomeyer23/Mercavel; projeto de estudo)',
  Accept: 'text/html',
}

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

/** Id do item sem EAN: "mf-<mercado>-<id da loja>". Nao e' numerico, entao nunca vira codigo de barras. */
export const idDoItem = (mercado, id) => `mf-${mercado}-${id}`
export const ehIdProprio = (ean) => typeof ean === 'string' && ean.startsWith('mf-')

const numeroOuNulo = (valor) => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null)

/**
 * Junta o texto que o Next empurra em self.__next_f.push([1,"..."]). Cada trecho e' um literal JSON.
 * Trecho ilegivel e' ignorado: um pedaco quebrado nao pode derrubar a pagina inteira.
 */
export function juntarPayload(html) {
  let texto = ''
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      texto += JSON.parse(m[1])
    } catch {
      /* trecho ilegivel */
    }
  }
  return texto
}

/** Extrai o objeto JSON que comeca em texto[inicio] === '{' contando chaves, respeitando strings. */
function objetoEm(texto, inicio) {
  let fundo = 0
  let dentroDeTexto = false
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i]
    if (dentroDeTexto) {
      if (c === '\\') i++
      else if (c === '"') dentroDeTexto = false
    } else if (c === '"') dentroDeTexto = true
    else if (c === '{') fundo++
    else if (c === '}' && --fundo === 0) return texto.slice(inicio, i + 1)
  }
  return null
}

/** Produtos crus (EcommerceProduct) e paginacao de uma pagina de categoria. */
export function lerPagina(html) {
  const texto = juntarPayload(html)
  const produtos = []
  const vistos = new Set()
  const marca = '{"__typename":"EcommerceProduct"'
  for (let i = texto.indexOf(marca); i >= 0; i = texto.indexOf(marca, i + 1)) {
    const bruto = objetoEm(texto, i)
    if (!bruto) continue
    try {
      const produto = JSON.parse(bruto)
      if (produto?.id !== undefined && !vistos.has(produto.id)) {
        vistos.add(produto.id)
        produtos.push(produto)
      }
    } catch {
      /* objeto cortado */
    }
  }
  const pag = texto.match(/"pagination":\{"page":(\d+),"records":(\d+),"totalPages":(\d+)\}/)
  return {
    produtos,
    pagina: pag ? Number(pag[1]) : null,
    registros: pag ? Number(pag[2]) : null,
    totalDePaginas: pag ? Number(pag[3]) : null,
  }
}

/**
 * Converte um produto cru no item do catalogo. Devolve null se nao tem id, nome ou preco usavel.
 * Preco: o do clube so vale com cadastro no clube, entao o preco normal e' o que compara;
 * promocao aberta a todos (sem clube) vira o preco e o normal vira precoLista.
 */
export function normalizarProduto(bruto, mercado, loja, base) {
  if (bruto === null || typeof bruto !== 'object') return null
  const id = String(bruto.id ?? '').trim()
  const nome = typeof bruto.name === 'string' ? bruto.name.replace(/�/g, '').replace(/\s+/g, ' ').trim() : ''
  if (!id || !nome) return null

  const normal = numeroOuNulo(bruto.price)
  const comDesconto = numeroOuNulo(bruto.priceWithDiscount)
  if (!(normal > 0)) return null

  const promocaoAberta = !bruto.clubSale && comDesconto > 0 && comDesconto < normal
  const preco = promocaoAberta ? comDesconto : normal
  const precoClube = bruto.clubSale && comDesconto > 0 && comDesconto < normal ? comDesconto : null

  return {
    ean: idDoItem(mercado, id),
    sku: id,
    nome,
    marca: typeof bruto.brand === 'string' && bruto.brand.trim() ? bruto.brand.trim() : null,
    preco,
    precoLista: promocaoAberta ? normal : null,
    precoClube,
    disponivel: numeroOuNulo(bruto.stock) > 0,
    medida: bruto.unitOfMeasurement?.abbreviation ?? null,
    multiplicador: null,
    caminho: typeof bruto.department === 'string' && bruto.department ? bruto.department : null,
    link: typeof bruto.slug === 'string' && bruto.modelId ? `${base}/${loja}/produto/m/${bruto.slug}-${bruto.modelId}` : null,
  }
}

/** Departamentos (slug-id) que aparecem como links na pagina inicial da loja. */
export function lerDepartamentos(html, loja) {
  const achados = new Map()
  const padrao = new RegExp(`href="/${loja.replace(/[^\w-]/g, '')}/([a-z0-9-]+)-(\\d+)"`, 'gi')
  for (const m of html.matchAll(padrao)) {
    const id = m[2]
    // "promocoes-99999" e' vitrine, repete produtos de outros departamentos
    if (id === '99999' || m[1] === 'produto') continue
    if (!achados.has(id)) achados.set(id, { id, slug: `${m[1]}-${id}`, nome: m[1].replace(/-/g, ' ') })
  }
  return [...achados.values()]
}

/** Ofertas do dia do site institucional do Irani (fallback): { nome, preco }. */
export function lerOfertasDoIrani(html) {
  const itens = []
  const padrao = /<p class="slide-offers-item"><a[^>]*>([^<]+)<\/a><\/p><p class="slide-offers-price"><a[^>]*>R\$\s*([\d.]+,\d{2})/g
  for (const m of html.matchAll(padrao)) {
    const preco = Number(m[2].replace(/\./g, '').replace(',', '.'))
    const nome = m[1].replace(/�/g, '').trim()
    if (nome && preco > 0) itens.push({ nome, preco })
  }
  return itens
}

export function criarClienteMercafacil(nomeDoMercado, mercado) {
  const { base, loja } = mercado

  async function pedir(url) {
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        const resposta = await fetch(url, { headers: CABECALHOS, signal: AbortSignal.timeout(PRAZO_MS), redirect: 'follow' })
        if (resposta.status === 429 || resposta.status >= 500) throw new Error(`HTTP ${resposta.status}`)
        return resposta
      } catch (erro) {
        if (tentativa === TENTATIVAS) throw erro
        console.warn(`  aviso: ${new URL(url).pathname} falhou (${erro.message}); tentativa ${tentativa}/${TENTATIVAS}`)
        await dormir(2000 * tentativa)
      }
    }
  }

  async function texto(url) {
    const resposta = await pedir(url)
    if (!resposta.ok) {
      const erro = new Error(`HTTP ${resposta.status}`)
      erro.status = resposta.status
      throw erro
    }
    return resposta.text()
  }

  const urlDaCategoria = (slug, pagina) => `${base}/${loja}/${slug}${pagina > 1 ? `?page=${pagina}` : ''}`

  /** Categorias a varrer: um departamento por arquivo. n = total de produtos informado pelo site. */
  async function planejar() {
    const departamentos = lerDepartamentos(await texto(`${base}/${loja}`), loja)
    if (departamentos.length === 0) throw new Error('nenhum departamento encontrado na pagina inicial')
    const categorias = []
    for (const departamento of departamentos) {
      try {
        const { registros, produtos } = lerPagina(await texto(urlDaCategoria(departamento.slug, 1)))
        const n = registros ?? produtos.length
        if (n > 0) categorias.push({ id: departamento.id, slug: departamento.slug, caminho: [departamento.nome], n })
      } catch (erro) {
        console.warn(`  aviso: departamento "${departamento.slug}" ignorado no planejamento: ${erro.message}`)
      }
      await dormir(PAUSA_MS)
    }
    return categorias
  }

  async function varrerCategoria(categoria) {
    const itens = []
    const vistos = new Set()
    let totalDePaginas = 1
    for (let pagina = 1; pagina <= Math.min(totalDePaginas, LIMITE_DE_PAGINAS); pagina++) {
      const lida = lerPagina(await texto(urlDaCategoria(categoria.slug, pagina)))
      if (pagina === 1) totalDePaginas = lida.totalDePaginas ?? 1
      if (lida.produtos.length === 0) break
      for (const bruto of lida.produtos) {
        const item = normalizarProduto(bruto, nomeDoMercado, loja, base)
        if (item && !vistos.has(item.sku)) {
          vistos.add(item.sku)
          itens.push(item)
        }
      }
      await dormir(PAUSA_MS)
    }
    return itens
  }

  /** Fallback do Irani: ofertas do dia. Sem marca e sem estoque no HTML, entao quase nao casa com outros mercados. */
  async function ofertasDoDia() {
    const itens = []
    for (const { nome, preco } of lerOfertasDoIrani(await texto('https://superirani.com.br/ofertas'))) {
      itens.push({
        ean: idDoItem(nomeDoMercado, `oferta-${nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
        sku: null,
        nome,
        marca: null,
        preco,
        precoLista: null,
        precoClube: null,
        disponivel: true,
        medida: null,
        multiplicador: null,
        caminho: null,
        link: `${base}/${loja}/ofertas-clube`,
      })
    }
    return itens
  }

  return { planejar, varrerCategoria, ofertasDoDia }
}
