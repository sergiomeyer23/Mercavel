# Mercavel

Site pra comparar preços de supermercados em Cascavel/PR. A ideia é pesquisar um produto e ver quanto
cada mercado cobra, olhar a média por categoria e montar uma cesta pra ver onde a compra fica mais barata.

**Os preços são reais**, coletados automaticamente nos sites dos mercados. São preços de e-commerce e
podem mudar a qualquer momento. Nem todo produto tem preço em todo mercado: depende do que cada loja
vende online, e cada preço guarda a data da coleta e o link da oferta.

## Aviso

projeto de estudo, sem vínculo com nenhum dos mercados citados. os preços vêm de coleta automatizada
das APIs públicas de catálogo dos sites, rodam uma vez por dia, com pausa entre as requisições e um
`User-Agent` que identifica o projeto. podem estar errados ou desatualizados e **não são recomendação
de compra**. o Atacadão é atacarejo, então a comparação com supermercado não é 100% equivalente.

as marcas e logos são dos respectivos mercados. se algum mercado quiser que seus dados ou sua logo
saiam, é só abrir uma issue que eu retiro.

## Como rodar

```
npm install
npm run dev
```

e abre o `http://localhost:5173`

pra gerar a versão de produção:

```
npm run build
```

## Scripts

```
npm run dev                                   servidor de desenvolvimento
npm run build                                 build de produção
npm test                                      testes (vitest)
npm run lint                                  eslint
npm run varrer -- --mercado muffato           varre o catálogo inteiro de um mercado (muffato, festval, atacadao)
npm run montar                                junta o que foi varrido e gera a base do site
```

## Como a base é montada

em vez de procurar uns poucos itens escolhidos a dedo, o `scripts/varrer-catalogo.mjs` lê o catálogo
público inteiro de cada mercado, **categoria por categoria** (a API da VTEX não entrega mais de 2.450
resultados por consulta, então categoria grande é dividida nas subcategorias). dá pra rodar em fatias
(`--parte 2/4`) e retomar (`--retomar`). o que sai fica em `dados/catalogo/` (fora do git).

o `scripts/montar-base.mjs` casa o mesmo produto entre os mercados pelo **código de barras (EAN)**.
o EAN é só a chave interna: não aparece no site, que mostra descrição, tamanho e preço. só entra produto
que está em 2 ou mais mercados. a saída vai pra `src/data` em formato compacto (o `src/data.ts` expande)
e o mapa id do site → EAN fica em `dados/ean-produtos.json`.

- **Muffato**: lista pública do catálogo, preço do catálogo.
- **Festval** e **Atacadão**: o preço e o estoque dependem da loja, então vêm da simulação de carrinho com
  o CEP de Cascavel (no Atacadão, é a retirada na loja de Cascavel). no Atacadão o que não tem preço
  lá é descartado.
- **Irani** e **Puppo**: fora da base. o Irani só tem loja renderizada (sem API) e o `robots.txt` dele
  bloqueia a busca, então não coleto. o Puppo só publica encarte em PDF. os scripts da primeira versão
  (catálogo manual de 49 itens) ficam em `scripts/legado/` só como registro.
- **Nota Paraná (Menor Preço)**: não uso. não achei API oficial e o uso automatizado parece não ser
  permitido, então fica de fora.

hortifruti e carnes a granel quase não entram: não têm código de barras, então não dá pra casar por EAN.

## Automação

- `.github/workflows/ci.yml`: lint, testes e build em cada push e pull request
- `.github/workflows/coletar-precos.yml`: todo dia varre cada mercado num job (o Atacadão em 4 fatias),
  monta a base e faz commit se mudou. também dá pra disparar na mão pela aba Actions
- `.github/workflows/deploy.yml`: publica o site no GitHub Pages em `/Mercavel/`. pra ativar, vai em
  Settings > Pages e escolhe "GitHub Actions" como fonte

## O que tem no site

- home com busca, categorias, mercados e destaques
- página de produto com tabela de preços por mercado (preço, tipo, origem do dado, data da coleta e diferença)
- página de categoria com média por mercado
- página de cada mercado com os produtos e preços dele
- cesta de compras que compara o total em cada mercado (diferença em R$ e %), mostra total parcial e os
  itens que faltam em cada mercado e gera um link pra compartilhar a cesta
- preço por kg/L e há quantos dias o preço foi coletado (acima de 7 dias aparece em destaque)
- busca com várias palavras, ordenação por preço e filtros guardados na URL
- dashboard com números gerais

os preços marcam se são online ou de loja física, porque um não vale pro outro.

## Como tá organizado

```
src/
  data/          jsons com os dados (mercados, categorias, produtos e preços)
  data.ts        exporta esses jsons
  types.ts       tipagem das entidades
  utils.ts       formatação, busca de preços e montagem da URL de busca
  components/    layout, logo, card de produto, chip de filtro e botão de cesta
  context/       contexto da cesta (salva no localStorage)
  pages/         uma página por rota
```

## Stack

React + TypeScript + Vite, Tailwind pros estilos e react-router pras rotas. Sem backend por enquanto,
os dados são os jsons em `src/data`.

as cores da marca ficam no `tailwind.config.js`: `marca` é o verde do logo e `tinta` o azul-marinho do nome.

## Logos dos mercados

cada mercado aparece com um escudo de iniciais na cor dele, que fica no campo `cor` do
`src/data/markets.json`. se o campo `logo` apontar pra um arquivo, o site mostra a imagem; se estiver
`null` — ou se a imagem não carregar — cai no escudo de iniciais.

as logos ficam em `public/logos/<slug>.png`, todas padronizadas do mesmo jeito: margem em volta
recortada, mesmo formato (PNG) e no máximo 128px de altura, que é 2x o maior tamanho usado na tela.

as logos são marca dos respectivos mercados, então o certo é usar com autorização deles.

## Ideias pra depois

- API + banco de dados no lugar dos jsons
- histórico de preços por produto
- coleta automática nos sites dos mercados
- cesta otimizada dividindo as compras entre mercados
