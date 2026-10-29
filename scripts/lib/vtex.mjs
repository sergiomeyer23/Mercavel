// Cliente das APIs publicas de catalogo e carrinho de uma loja VTEX.

const PAGINA = 50
// a VTEX nao entrega resultado alem de 2500 por consulta
const LIMITE_POR_CONSULTA = 2450
const PAUSA_MS = 300
const TENTATIVAS = 4

const CABECALHOS = {
  'User-Agent': 'Mercavel/0.2 (+https://github.com/sergiomeyer23/Mercavel; projeto de estudo)',
  Accept: 'application/json',
}

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

// subcategoria so e' achada pelo caminho de ids (C:/2/18/19/); o id solto so funciona nas raizes
const filtroDeCategoria = (ids) => `C:/${ids.join('/')}/`

const EAN_VALIDO = /^\d{8,14}$/

export function normalizarEan(bruto) {
  const texto = String(bruto ?? '').trim()
  if (!EAN_VALIDO.test(texto)) return null
  const semZeros = texto.replace(/^0+/, '')
  // 13 digitos comecando com 2 e' codigo interno de balanca ou da loja, nao identifica o produto
  if (semZeros.length === 13 && semZeros.startsWith('2')) return null
  return semZeros
}

export function criarClienteVtex(mercado) {
  async function pedir(url, opcoes = {}) {
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        const resposta = await fetch(url, { headers: CABECALHOS, ...opcoes })
        if (resposta.status === 429 || resposta.status >= 500) throw new Error(`HTTP ${resposta.status}`)
        return resposta
      } catch (erro) {
        if (tentativa === TENTATIVAS) throw erro
        await dormir(1500 * tentativa)
      }
    }
  }

  const urlDeBusca = (ids, de, ate) =>
    `${mercado.base}/api/catalog_system/pub/products/search?fq=${filtroDeCategoria(ids)}&_from=${de}&_to=${ate}`

  async function arvoreDeCategorias() {
    const resposta = await pedir(`${mercado.base}/api/catalog_system/pub/category/tree/4`)
    if (!resposta.ok) throw new Error(`arvore de categorias: HTTP ${resposta.status}`)
    return resposta.json()
  }

  async function totalDaCategoria(ids) {
    const resposta = await pedir(urlDeBusca(ids, 0, 0))
    const total = (resposta.headers.get('resources') ?? '').match(/\/(\d+)$/)
    return total ? Number(total[1]) : 0
  }

  // Lista o que varrer: a propria categoria se couber numa consulta, senao as filhas.
  async function planejar(no, trilhaPai = [], idsPai = []) {
    const ids = [...idsPai, no.id]
    const trilha = [...trilhaPai, no.name]
    const total = await totalDaCategoria(ids)
    await dormir(PAUSA_MS)
    if (total === 0) return []

    const filhos = no.children ?? []
    if (total <= LIMITE_POR_CONSULTA || filhos.length === 0) {
      if (total > LIMITE_POR_CONSULTA) {
        console.warn(`  aviso: "${trilha.join(' > ')}" tem ${total} itens e nao tem filhas; pego so os primeiros ${LIMITE_POR_CONSULTA}`)
      }
      return [{ id: ids.join('-'), ids, caminho: trilha, n: total }]
    }

    const categorias = []
    for (const filho of filhos) categorias.push(...(await planejar(filho, trilha, ids)))
    return categorias
  }

  function lerProduto(produto) {
    const itens = []
    for (const item of produto.items ?? []) {
      const ean = normalizarEan(item.ean)
      if (!ean) continue
      const oferta = item.sellers?.[0]?.commertialOffer ?? {}
      // com simulacao o preco do catalogo e' descartado depois, entao nao filtra aqui
      if (!(oferta.Price > 0) && !mercado.simulacao) continue
      itens.push({
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
    return itens
  }

  async function varrerCategoria(ids) {
    const itens = []
    for (let de = 0; de < LIMITE_POR_CONSULTA; de += PAGINA) {
      const resposta = await pedir(urlDeBusca(ids, de, de + PAGINA - 1))
      if (!resposta.ok && resposta.status !== 206) throw new Error(`HTTP ${resposta.status}`)
      const lote = await resposta.json()
      if (!Array.isArray(lote) || lote.length === 0) break
      for (const produto of lote) itens.push(...lerProduto(produto))
      if (lote.length < PAGINA) break
      await dormir(PAUSA_MS)
    }
    return itens
  }

  // Troca preco e estoque do catalogo pelos da simulacao de carrinho no CEP de Cascavel.
  async function aplicarSimulacao(itens) {
    const { cep, vendedores, descartarSemPreco } = mercado.simulacao
    const semResposta = new Map(itens.map((item) => [String(item.sku), item]))
    for (const item of itens) item.disponivel = false

    for (const vendedor of vendedores) {
      const skus = [...semResposta.keys()]
      for (let inicio = 0; inicio < skus.length; inicio += PAGINA) {
        const lote = skus.slice(inicio, inicio + PAGINA)
        const resposta = await pedir(`${mercado.base}/api/checkout/pub/orderforms/simulation?sc=1`, {
          method: 'POST',
          headers: { ...CABECALHOS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: lote.map((id) => ({ id, quantity: 1, seller: vendedor })),
            country: 'BRA',
            postalCode: cep,
          }),
        })
        if (!resposta.ok) continue
        for (const resultado of (await resposta.json()).items ?? []) {
          const item = semResposta.get(String(resultado.id))
          if (item && resultado.availability === 'available' && resultado.sellingPrice > 0) {
            item.preco = resultado.sellingPrice / 100
            item.precoLista = resultado.listPrice > resultado.sellingPrice ? resultado.listPrice / 100 : null
            item.disponivel = true
            semResposta.delete(String(resultado.id))
          }
        }
        await dormir(PAUSA_MS)
      }
    }
    // sem estoque e sem preco no catalogo (preco 0) nao serve nem de referencia
    return itens.filter((item) => (descartarSemPreco ? item.disponivel : item.preco > 0))
  }

  return { arvoreDeCategorias, totalDaCategoria, planejar, varrerCategoria, aplicarSimulacao }
}
