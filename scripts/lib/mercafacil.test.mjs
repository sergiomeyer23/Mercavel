import { describe, expect, it } from 'vitest'
import { casarOrfaos } from './casar-por-nome.mjs'
import { itemValido, lerArquivoDoCatalogo } from './leitura.mjs'
import {
  ehIdProprio,
  idDoItem,
  juntarPayload,
  lerDepartamentos,
  lerOfertasDoIrani,
  lerPagina,
  normalizarProduto,
} from './mercafacil.mjs'

const BASE = 'https://www.irani.delivery'

const produto = (extra = {}) => ({
  __typename: 'EcommerceProduct',
  id: '568513',
  modelId: '190220',
  name: 'Refrigerante Coca-Cola Sem Açúcar 2L',
  slug: 'refrigerante-coca-cola-sem-acucar-2l',
  price: 12.49,
  priceWithDiscount: 0,
  brand: 'Coca-Cola',
  department: 'Bebidas',
  stock: 10,
  unitOfMeasurement: { abbreviation: 'un' },
  clubSale: null,
  ...extra,
})

// monta um HTML parecido com o do Next: o payload vem em pedaços de string em self.__next_f.push
function htmlComProdutos(produtos, paginacao = { page: 1, records: produtos.length, totalPages: 1 }) {
  const corpo = `[["$","div",null,{"children":[${produtos.map((p) => JSON.stringify(p)).join(',')}]}],["$","$L1",null,{"pagination":${JSON.stringify(paginacao)}}]]`
  // parte o texto no meio, como o Next faz, pra provar que os pedaços são juntados antes de ler
  const meio = Math.floor(corpo.length / 2)
  const pedacos = [corpo.slice(0, meio), corpo.slice(meio)]
  return `<html><script>${pedacos.map((p) => `self.__next_f.push([1,${JSON.stringify(p)}])`).join('</script><script>')}</script></html>`
}

describe('juntarPayload / lerPagina', () => {
  it('junta os pedaços e acha os produtos e a paginação', () => {
    const html = htmlComProdutos([produto(), produto({ id: '2', name: 'Guaraná 2L' })], { page: 2, records: 61, totalPages: 3 })
    const { produtos, pagina, registros, totalDePaginas } = lerPagina(html)
    expect(produtos.map((p) => p.id)).toEqual(['568513', '2'])
    expect([pagina, registros, totalDePaginas]).toEqual([2, 61, 3])
  })

  it('não confunde chaves dentro do nome do produto', () => {
    const html = htmlComProdutos([produto({ name: 'Molho {especial} "x" } fim' })])
    expect(lerPagina(html).produtos[0].name).toBe('Molho {especial} "x" } fim')
  })

  it('ignora trecho quebrado e objeto cortado sem lançar erro', () => {
    const html = '<script>self.__next_f.push([1,"{\\"__typename\\":\\"EcommerceProduct\\",\\"id\\":\\"1\\""])</script><script>self.__next_f.push([1,"lixo\\x"])</script>'
    expect(() => lerPagina(html)).not.toThrow()
    expect(lerPagina(html).produtos).toEqual([])
  })

  it('página sem produtos devolve lista vazia e paginação nula', () => {
    expect(lerPagina('<html></html>')).toEqual({ produtos: [], pagina: null, registros: null, totalDePaginas: null })
    expect(juntarPayload('<html></html>')).toBe('')
  })

  it('não repete o mesmo produto', () => {
    expect(lerPagina(htmlComProdutos([produto(), produto()])).produtos).toHaveLength(1)
  })
})

describe('normalizarProduto', () => {
  it('normaliza para o item do catálogo, com id próprio no lugar do EAN', () => {
    const item = normalizarProduto(produto(), 'irani', 'pacaembu', BASE)
    expect(item).toMatchObject({
      ean: 'mf-irani-568513',
      nome: 'Refrigerante Coca-Cola Sem Açúcar 2L',
      marca: 'Coca-Cola',
      preco: 12.49,
      precoLista: null,
      precoClube: null,
      disponivel: true,
      medida: 'un',
      caminho: 'Bebidas',
      link: `${BASE}/pacaembu/produto/m/refrigerante-coca-cola-sem-acucar-2l-190220`,
    })
    expect(itemValido(item)).toBe(true)
    expect(ehIdProprio(item.ean)).toBe(true)
    expect(ehIdProprio('7891234567895')).toBe(false)
  })

  it('preço do clube não vira o preço: fica o normal e o do clube vai à parte', () => {
    const item = normalizarProduto(
      produto({ price: 14.98, priceWithDiscount: 11.98, clubSale: { discount: 20, price: 14.98, priceWithDiscount: 11.98 } }),
      'irani', 'pacaembu', BASE,
    )
    expect(item.preco).toBe(14.98)
    expect(item.precoClube).toBe(11.98)
    expect(item.precoLista).toBeNull()
  })

  it('promoção aberta a todos vira o preço e o normal vira precoLista', () => {
    const item = normalizarProduto(produto({ price: 10, priceWithDiscount: 8, clubSale: null }), 'riviera', '1', 'https://www.rmaisdelivery.com.br')
    expect(item).toMatchObject({ preco: 8, precoLista: 10, precoClube: null })
  })

  it('desconto maior que o preço normal é ignorado', () => {
    expect(normalizarProduto(produto({ price: 10, priceWithDiscount: 12 }), 'irani', 'x', BASE)).toMatchObject({ preco: 10, precoLista: null })
  })

  it('sem estoque fica indisponível', () => {
    expect(normalizarProduto(produto({ stock: 0 }), 'irani', 'x', BASE).disponivel).toBe(false)
    expect(normalizarProduto(produto({ stock: null }), 'irani', 'x', BASE).disponivel).toBe(false)
  })

  it('descarta itens inválidos ou incompletos', () => {
    for (const ruim of [
      null,
      'texto',
      {},
      produto({ id: '' }),
      produto({ id: undefined }),
      produto({ name: '' }),
      produto({ name: null }),
      produto({ price: 0 }),
      produto({ price: -1 }),
      produto({ price: '12,49' }),
      produto({ price: NaN }),
      produto({ price: null }),
    ]) {
      expect(normalizarProduto(ruim, 'irani', 'x', BASE)).toBeNull()
    }
  })

  it('limpa caracteres inválidos do nome e tolera campos opcionais ausentes', () => {
    const item = normalizarProduto(produto({ name: '  Sabonete �  Johnson  ', brand: '  ', unitOfMeasurement: null, slug: undefined, department: null }), 'irani', 'x', BASE)
    expect(item).toMatchObject({ nome: 'Sabonete Johnson', marca: null, medida: null, link: null, caminho: null })
  })

  it('o item gravado passa pela leitura defensiva do montar-base', () => {
    const itens = [normalizarProduto(produto(), 'irani', 'x', BASE), { ean: 'mf-irani-9', nome: 'sem preco' }]
    const texto = JSON.stringify({ itens: itens.filter(Boolean), coletadoEm: '2026-11-23T10:00:00Z' })
    expect(lerArquivoDoCatalogo(texto).itens).toHaveLength(1)
  })
})

describe('lerDepartamentos', () => {
  it('lista os departamentos da loja, sem repetir e sem a vitrine de promoções', () => {
    const html = `
      <a href="/pacaembu/bebidas-1488">x</a><a href="/pacaembu/bebidas-1488">x</a>
      <a href="/pacaembu/limpeza-1479">x</a><a href="/pacaembu/promocoes-99999">x</a>
      <a href="/pacaembu/produto/m/arroz-5">x</a><a href="/alto-alegre/padaria-1">x</a>`
    expect(lerDepartamentos(html, 'pacaembu').map((d) => d.id)).toEqual(['1488', '1479'])
  })

  it('funciona com a loja "1" do Riviera', () => {
    expect(lerDepartamentos('<a href="/1/acougue-3">a</a><a href="/1/bebidas-8">b</a>', '1')).toEqual([
      { id: '3', slug: 'acougue-3', nome: 'acougue' },
      { id: '8', slug: 'bebidas-8', nome: 'bebidas' },
    ])
  })
})

describe('lerOfertasDoIrani (fallback)', () => {
  it('lê nome e preço das ofertas do dia', () => {
    const html =
      '<p class="slide-offers-item"><a href="x">Deterg Liq Ype 500ml Clear</a></p><p class="slide-offers-price"><a href="x">R$ 2,19</a></p>' +
      '<p class="slide-offers-item"><a href="x">Carne Moida 1kg</a></p><p class="slide-offers-price"><a href="x">R$ 1.043,98</a></p>'
    expect(lerOfertasDoIrani(html)).toEqual([
      { nome: 'Deterg Liq Ype 500ml Clear', preco: 2.19 },
      { nome: 'Carne Moida 1kg', preco: 1043.98 },
    ])
  })
  it('HTML diferente do esperado dá lista vazia', () => {
    expect(lerOfertasDoIrani('<html>nada</html>')).toEqual([])
  })
})

describe('integração com o casamento por nome do montar-base', () => {
  it('casa item Mercafacil (id próprio) com item de outro mercado por marca + tamanho + nome', () => {
    const grupos = casarOrfaos([
      { mercado: 'muffato', ean: '7894900011517', nome: 'Refrigerante Coca-Cola Sem Açúcar 2L', marca: 'Coca-Cola' },
      { mercado: 'irani', ean: idDoItem('irani', '568513'), nome: 'Refrigerante Coca-Cola Sem Açúcar 2L', marca: 'Coca-Cola' },
      { mercado: 'riviera', ean: idDoItem('riviera', '77'), nome: 'Refrigerante Coca-Cola Sem Açúcar 2L', marca: 'Coca-Cola' },
    ])
    expect(grupos).toHaveLength(1)
    expect(grupos[0].map((i) => i.mercado).sort()).toEqual(['irani', 'muffato', 'riviera'])
  })

  it('não casa tamanhos diferentes', () => {
    const grupos = casarOrfaos([
      { mercado: 'muffato', ean: '7894900011517', nome: 'Refrigerante Coca-Cola 2L', marca: 'Coca-Cola' },
      { mercado: 'irani', ean: idDoItem('irani', '1'), nome: 'Refrigerante Coca-Cola 350ml', marca: 'Coca-Cola' },
    ])
    expect(grupos).toEqual([])
  })
})
