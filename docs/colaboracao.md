# Preço de gôndola enviado pelas pessoas

o que dá pra coletar dos sites dos mercados é preço de e-commerce. o preço da loja física só vem de quem
está lá, por isso existe a tela `/contribuir`: a pessoa fotografa a etiqueta e manda o preço.

hoje isso é uma demonstração. não existe servidor, então os envios ficam no navegador de quem mandou
(`localStorage`). as regras de validação já estão prontas e testadas, falta ligar um servidor.

## como um envio é tratado

1. a pessoa escolhe o produto (pelo nome ou pelo código de barras, que só serve pra achar o produto),
   o mercado, o preço e tira a foto da etiqueta.
2. a foto sai da câmera do próprio app, que grava hora e localização no momento do clique. foto de galeria
   é aceita, mas vai pra revisão manual. os metadados EXIF não servem de prova, porque dá pra apagar e
   editar.
3. a triagem automática está em `src/colaboracao/regras.ts`:
   - rejeita preço inválido, envio sem foto e mais de 30 envios no mesmo dia
   - manda pra revisão manual foto de arquivo, foto com mais de 15 minutos, envio sem localização ou fora
     de Cascavel, preço fora de 0,4x a 2,5x do preço mediano que a base já tem e chave de nota fiscal inválida
   - o que passa fica "em análise"
4. o preço só vira "confirmado" quando 2 pessoas diferentes mandam valores até 3% distantes, para o mesmo
   produto e mercado, em até 7 dias (`confirmacao.ts`).
5. os pontos só contam quando o envio é confirmado: 1 de base, 2 a mais se o produto estava sem confirmação
   há mais de 14 dias, 3 a mais se for o primeiro envio confirmado daquele mercado e 1 a mais com nota
   fiscal válida. não há troca por dinheiro nem Pix. antes disso é preciso resolver custo, fraude e as
   questões legais e fiscais, que eu não sei responder.

## nota fiscal (opcional)

a chave de acesso da NFC-e tem 44 dígitos (`nfce.ts`). dela dá pra ler o estado, o mês, o CNPJ do mercado
e o dígito verificador, sem consultar a SEFAZ. o app confere o dígito da chave e o do CNPJ e guarda só o
CNPJ e o mês. CPF, itens da compra e o link do QR code não são guardados.

isso mostra que a chave está bem formada, não que a nota existe. confirmar na SEFAZ exigiria um acesso
que o projeto não tem.

## LGPD

não é parecer jurídico. a foto e a localização do envio são dado pessoal, e por isso a tela pede
consentimento antes de enviar. num servidor, o melhor é guardar só se a localização estava dentro ou fora
de Cascavel, e não a coordenada exata. CPF nunca é pedido. antes de lançar de verdade, principalmente se
houver recompensa em dinheiro, vale falar com alguém de jurídico.

## o que falta

- um servidor. `supabase/schema.sql` descreve as tabelas e as regras de acesso, mas nunca foi testado e
  serve só de ponto de partida. também precisa de login (nem que seja anônimo) e de onde guardar as fotos.
- implementar a interface `Repositorio` (`src/colaboracao/repositorio.ts`) chamando o servidor no lugar do
  `localStorage`, e rodar a confirmação no servidor.
- restringir a revisão manual. hoje o "modo revisor" da tela Meus envios está aberto pra qualquer um.
- ler o número da foto da etiqueta (OCR) e conferir com o preço digitado. isso não foi feito.
