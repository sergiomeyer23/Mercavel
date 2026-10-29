# Mercavel

Site pra comparar preços de supermercados em Cascavel/PR. A ideia é pesquisar um produto e ver quanto
cada mercado cobra, olhar a média por categoria e montar uma cesta pra ver onde a compra fica mais barata.

Os preços são coletados automaticamente nos sites dos mercados. São preços de e-commerce e podem mudar
a qualquer momento. Nem todo produto tem preço em todo mercado: depende do que cada loja vende online,
e cada preço guarda a data da coleta e o link da oferta.

## Aviso

projeto de estudo, sem vínculo com nenhum dos mercados citados. os preços vêm de coleta automatizada
das APIs públicas de catálogo dos sites, rodam uma vez por dia, com pausa entre as requisições e um
`User-Agent` que identifica o projeto. podem estar errados ou desatualizados e não são recomendação
de compra. o Atacadão é atacarejo, então a comparação com supermercado não é 100% equivalente.

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

o `scripts/varrer-catalogo.mjs` lê o catálogo público de cada mercado, categoria por categoria. a API
da VTEX não entrega mais de 2.450 resultados por consulta, então categoria grande é dividida nas
subcategorias. dá pra rodar em fatias (`--parte 2/4`) e retomar de onde parou (`--retomar`). o que sai fica
em `dados/catalogo/`, fora do git.

o `scripts/montar-base.mjs` junta tudo e casa o mesmo produto entre os mercados pelo código de barras
(EAN). o EAN é só a chave interna e não aparece no site, que mostra descrição, tamanho e preço. quem ficou
sem par passa por um segundo casamento por marca, tamanho e nome (`scripts/lib/casar-por-nome.mjs`),
porque o mesmo produto às vezes tem mais de um código. só entra na base o produto que está em 2 ou mais
mercados. a saída vai pra `src/data` em formato compacto, que o `src/data.ts` expande. o mapa do id do
site para o EAN fica em `src/data/ean-produtos.json`, usado só pelo leitor de código de barras da tela de
envio e carregado quando precisa.

de onde vem o preço em cada mercado:

- Muffato: o preço do próprio catálogo.
- Festval e Atacadão: preço e estoque dependem da loja, então vêm de uma simulação de carrinho com o CEP
  de Cascavel (no Atacadão, a retirada na loja de lá). o que não tem preço lá é descartado.
- Irani: fora da base. só tem loja renderizada, sem API, e o `robots.txt` dele bloqueia a busca.
- Puppo: fora da base. só publica encarte em PDF.
- Nota Paraná (Menor Preço): não uso. não achei API oficial e o uso automatizado parece não ser permitido.

hortifruti e carnes a granel quase não entram, porque não têm código de barras.

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
- `/contribuir`: a pessoa fotografa a etiqueta de preço no mercado e envia, com triagem automática,
  confirmação por 2 pessoas e pontos. ainda é uma demonstração, sem servidor: veja `docs/colaboracao.md`

hoje todos os preços são de e-commerce. o tipo (online ou loja física) fica marcado em cada um porque
um não vale pro outro, e os envios das pessoas entram como loja física quando houver servidor.

## Como tá organizado

```
src/
  data/          jsons da base (mercados, categorias, produtos, preços e o mapa de EAN)
  data.ts        lê os jsons e expande o formato compacto
  types.ts       tipagem das entidades
  utils.ts       formatação, busca de preços e montagem da URL de busca
  emoji.ts       ícone de comida de cada produto e categoria
  components/    layout, logo, card de produto, chip de filtro e botão de cesta
  context/       contexto da cesta (salva no localStorage)
  colaboracao/   regras de validação, pontos, leitura da nota fiscal e telas do envio de preço
  pages/         uma página por rota
scripts/
  varrer-catalogo.mjs   coleta o catálogo de um mercado
  montar-base.mjs       gera a base do site
  lib/                  config dos mercados, cliente VTEX, tamanho, categorias e casamento por nome
docs/                   como funciona o envio de preço pelas pessoas
supabase/               esquema de banco pra esse envio (não testado)
```

## Stack

React + TypeScript + Vite, Tailwind pros estilos e react-router pras rotas. Sem backend por enquanto,
os dados são os jsons em `src/data`.

as cores da marca ficam no `tailwind.config.js`: `marca` é o verde do logo e `tinta` o azul-marinho do nome.

## Logos dos mercados

cada mercado aparece com um escudo de iniciais na cor dele, que fica no campo `cor` do
`src/data/markets.json`. se o campo `logo` apontar pra um arquivo, o site mostra a imagem; se estiver
`null`, ou se a imagem não carregar, cai no escudo de iniciais.

as logos ficam em `public/logos/<slug>.png`, todas padronizadas do mesmo jeito: margem em volta
recortada, mesmo formato (PNG) e no máximo 128px de altura, que é 2x o maior tamanho usado na tela.

as logos são marca dos respectivos mercados, então o certo é usar com autorização deles.

## Ideias pra depois

- servidor pro envio de preço pelas pessoas (login, fotos e confirmação)
- ler o preço da foto da etiqueta pra conferir com o que a pessoa digitou
- histórico de preços por produto
- cesta otimizada dividindo as compras entre mercados
