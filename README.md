# Mercavel

Site pra comparar preços de supermercados em Cascavel/PR. A ideia é pesquisar um produto e ver quanto
cada mercado cobra, olhar a média por categoria e montar uma cesta pra ver onde a compra fica mais barata.

**Os preços são reais**, coletados automaticamente nos sites dos mercados. São preços de e-commerce e
podem mudar a qualquer momento. Nem todo produto tem preço em todo mercado: depende do que cada loja
vende online, e cada preço guarda a data da coleta e o link da oferta.

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

## O que tem no site

- home com busca, categorias, mercados e destaques
- página de produto com tabela de preços por mercado (preço, tipo, origem do dado, data da coleta e diferença)
- página de categoria com média por mercado
- página de cada mercado com os produtos e preços dele
- cesta de compras que compara o total em cada mercado (diferença em R$ e %)
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
o Compre Mais ainda está sem logo, então aparece o escudo `CM`.

as logos são marca dos respectivos mercados, então o certo é usar com autorização deles.

## Coleta de preços reais

Os preços do site vêm dos scripts desta pasta. A coleta cobre os mercados que usam **VTEX**
(Super Muffato, Festval e Atacadão), que expõem uma API pública de catálogo:

```
node scripts/coletar.mjs --mercados=muffato
```

O script busca cada produto do catálogo pelo nome, pontua os candidatos por nome e por **tamanho da
embalagem** — comparar 5 kg com 1 kg é o erro que estraga a comparação de preço — e escreve uma lista
de conferência em `dados/revisao.json`. Ele **não altera o catálogo**.

A coleta tem duas fases, uma em cada script:

1. `scripts/coletar.mjs` — busca cada produto pelo nome, pontua os candidatos e monta a lista de
   conferência em `dados/revisao.json`.
2. `scripts/coletar-precos.mjs` — aprova só os casamentos sem dúvida (`dados/vinculos.json`), coleta
   cada um pelo código de barras e escreve `src/data/prices.json`. O que ficou duvidoso vai para
   `dados/pendentes.json`.

os códigos de barras são das lojas: o nosso produto é genérico ("Arroz Branco Tipo 1 5 kg") e não tem
código próprio. Por isso o campo `ean` do catálogo é nulo e cada preço guarda o código, a marca e o nome
do produto naquela loja — Muffato, Festval e Atacadão vendem marcas diferentes do mesmo item.

Detalhe da API da VTEX que custa caro errar: o filtro por código de barras é
`fq=alternateIds_Ean:<ean>` — com **dois pontos**. Com sinal de igual a API ignora o filtro em
silêncio e devolve o catálogo inteiro.

Situação de cada mercado:

| Mercado | Coleta |
|---|---|
| Super Muffato, Festval, Atacadão | automática (API VTEX) |
| Irani | por raspagem da página de ofertas |
| Super Puppo | manual — a loja só existe no app Mercadapp, sem catálogo web |
| Compre Mais | manual — não tem site |

preço de e-commerce não é o mesmo preço da loja física, por isso o site separa por tipo de preço.

## Ideias pra depois

- API + banco de dados no lugar dos jsons
- histórico de preços por produto
- coleta automática nos sites dos mercados
- cesta otimizada dividindo as compras entre mercados
