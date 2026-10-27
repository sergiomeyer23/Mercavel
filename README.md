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

## Scripts

```
npm run dev              servidor de desenvolvimento
npm run build            build de produção
npm test                 testes (vitest)
npm run lint             eslint
npm run coletar          fase 1: compara o catálogo com as ofertas dos sites e gera dados/revisao.json
npm run coletar:precos   fase 2: aprova os casamentos seguros, consulta cada código de barras e grava
                         src/data/prices.json, dados/vinculos.json, dados/pendentes.json e dados/coleta.json
npm run coletar:irani    abre a loja online do Irani num navegador, busca cada item e guarda o mais barato que
                         for equivalente ao catálogo (mesmo tipo e tamanho)
```

a pasta `dados/` guarda o que é intermediário da coleta (revisão, vínculos, pendentes e o resumo da última
coleta). o que o site lê de verdade fica em `src/data`.

## Puppo e Irani

o **Irani** vende pelo irani.delivery (loja da Av. Brasil, Cascavel) e não tem API: o `coletar-irani.mjs`
abre a loja num navegador, busca cada produto e só aceita oferta do mesmo tipo e tamanho do item do
catálogo (as regras estão no próprio script). entre as equivalentes fica a mais barata. se aparece
desconto, o preço vai como promoção.

o **Puppo** não tem loja online, só encarte em PDF: os preços de `dados/encarte-puppo.json` foram lidos
à mão e valem só na validade do encarte (preço do Clube Puppo).

## Automação

- `.github/workflows/ci.yml`: lint, testes e build em cada push e pull request
- `.github/workflows/coletar-precos.yml`: roda a fase 2 todo dia e faz commit se os preços mudaram
  (também dá pra disparar na mão pela aba Actions)
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

preço de e-commerce não é o mesmo preço da loja física, por isso o site separa por tipo de preço.

## Ideias pra depois

- API + banco de dados no lugar dos jsons
- histórico de preços por produto
- coleta automática nos sites dos mercados
- cesta otimizada dividindo as compras entre mercados
