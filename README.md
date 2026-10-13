# Mercavel

Site pra comparar preços de supermercados em Cascavel/PR. A ideia é pesquisar um produto e ver quanto
cada mercado cobra, olhar a média por categoria e montar uma cesta pra ver onde a compra fica mais barata.

**Importante: os produtos e preços são todos fictícios.** Coloquei esses dados só pra o site ter conteúdo,
não é preço real de nenhum mercado. Mais pra frente a intenção é puxar isso de uma API que coleta os
preços nos sites dos supermercados.

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

## Ideias pra depois

- API + banco de dados no lugar dos jsons
- histórico de preços por produto
- coleta automática nos sites dos mercados
- cesta otimizada dividindo as compras entre mercados
