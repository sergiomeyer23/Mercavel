// Mercados coletados. Ordem = preferencia pra escolher nome e categoria do produto na base.
const CEP_CASCAVEL = '85810-000'

export const MERCADOS = {
  muffato: {
    base: 'https://www.supermuffato.com.br',
    site: 'https://www.supermuffato.com.br',
  },
  // O catalogo mostra o vendedor padrao (sem estoque em quase tudo). Preco e estoque de Cascavel
  // saem da simulacao de carrinho, com as lojas da regiao.
  festval: {
    base: 'https://www.festval.com',
    site: 'https://www.festval.com',
    simulacao: { cep: CEP_CASCAVEL, vendedores: ['meufestvalcarlosgomes', 'meufestvalcatuai', '1'] },
  },
  // No catalogo o preco vem zerado pra maioria dos itens. A simulacao devolve a loja de retirada de
  // Cascavel; o que nao tem preco la nao e' vendido la, entao sai.
  atacadao: {
    base: 'https://www.atacadao.com.br/io',
    site: '',
    simulacao: { cep: CEP_CASCAVEL, vendedores: ['1'], descartarSemPreco: true },
  },
}

export const ORDEM_DOS_MERCADOS = Object.keys(MERCADOS)
