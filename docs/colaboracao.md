# Preço de gôndola enviado por pessoas

o que dá pra coletar dos sites dos mercados é preço de e-commerce. preço de loja física só vem de quem
está no mercado, então o projeto tem uma tela (`/contribuir`) pra pessoa fotografar a etiqueta e mandar o preço.

**estado atual: modo demonstração.** não existe servidor, então os envios ficam só no navegador de quem
mandou (`localStorage`). a lógica de validação já está pronta e testada; falta o servidor (veja o fim).

## como um envio é tratado

1. a pessoa escolhe o produto (por nome ou pelo código de barras, que só serve pra achar o produto e
   não aparece na tela), o mercado, o preço e tira a foto da etiqueta.
2. **foto pela câmera do app**: a hora e a localização são gravadas no momento do clique. foto de galeria
   é aceita, mas não prova nada e vai pra revisão manual. metadados EXIF não são confiáveis (dá pra apagar
   ou editar), então não dependo deles.
3. **triagem automática** (`src/colaboracao/regras.ts`):
   - rejeita: preço inválido, sem foto, mais de 30 envios no dia
   - revisão manual: foto de arquivo, foto com mais de 15 min, sem localização ou fora de Cascavel, preço
     fora de 0,4x a 2,5x do preço mediano que a base já tem, chave de nota fiscal inválida
   - passou: fica "em análise"
4. **confirmação** (`confirmacao.ts`): o preço só vira "confirmado" quando 2 pessoas diferentes mandam
   valores até 3% distantes, pro mesmo produto e mercado, em até 7 dias.
5. **pontos** (`regras.ts`, `pontosDoEnvio`): só contam quando o envio é confirmado. 1 ponto base, +2 se o
   produto estava sem confirmação há mais de 14 dias, +3 se for o primeiro envio confirmado daquele mercado,
   +1 com nota fiscal válida. **não há troca por dinheiro nem Pix**: antes disso falta resolver custo,
   fraude e questões legais e fiscais (que eu não sei responder).

## nota fiscal (opcional)

a NFC-e tem uma chave de acesso de 44 dígitos (`src/colaboracao/nfce.ts`). dela dá pra ler, sem consultar a SEFAZ:
estado, mês, CNPJ do mercado e o dígito verificador. confere o dígito da chave e o do CNPJ. **só guardo
CNPJ e mês**: não guardo CPF, itens da compra nem o link do QR code.

limite: isso mostra que a chave é *bem formada*, não que a nota existe. confirmar na SEFAZ exigiria acesso
que eu não tenho.

## LGPD (não é parecer jurídico)

- a foto e a localização do envio são dado pessoal. por isso a tela pede consentimento antes de enviar
- a localização é usada pra checar se foi em Cascavel; num servidor, o ideal é guardar só isso (dentro/fora) e
  não a coordenada exata
- não pedir nem guardar CPF
- antes de lançar de verdade, vale passar por alguém de jurídico, principalmente por causa de recompensa
  em dinheiro

## o que falta pra funcionar de verdade

- **servidor**: o esquema em `supabase/schema.sql` descreve as tabelas e as regras de acesso. **não foi
  testado**: serve de ponto de partida. precisa de login (pelo menos anônimo) e de armazenamento das fotos
- **implementar a interface `Repositorio`** (`src/colaboracao/repositorio.ts`) chamando o servidor no lugar do
  `localStorage`, e rodar a confirmação no servidor (nunca no navegador)
- **revisão manual**: hoje é o "modo revisor" da tela Meus envios, aberto pra qualquer um. num servidor, só
  quem for revisor pode ver a fila
- **OCR da etiqueta**: conferir se o número da foto bate com o preço digitado. não implementei
