-- Esquema de partida pro servidor dos envios de preço (ver docs/colaboracao.md).
-- NAO FOI TESTADO: revisar antes de usar. Pensado pro Postgres do Supabase.

create table if not exists envios (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  produto_id    text not null,                 -- id do produto no site (o EAN fica so no servidor)
  mercado_id    text not null,                 -- id do mercado ou 'outro'
  preco         numeric(10, 2) not null check (preco > 0),
  criado_em     timestamptz not null default now(),
  foto_path     text,                          -- caminho no storage, nao a imagem
  captura_em    timestamptz not null,
  captura_lat   double precision,
  captura_lng   double precision,
  captura_origem text not null check (captura_origem in ('camera_app', 'arquivo')),
  nota_cnpj     text,                          -- so CNPJ e mes da nota; nunca CPF
  nota_emissao  text,
  nota_valida   boolean,
  status        text not null default 'em_analise'
                check (status in ('em_analise', 'confirmado', 'revisao_manual', 'rejeitado')),
  motivos       text[] not null default '{}',
  pontos        integer not null default 0
);

create index if not exists envios_produto_mercado on envios (produto_id, mercado_id, criado_em desc);
create index if not exists envios_usuario_dia on envios (usuario_id, criado_em desc);

alter table envios enable row level security;

-- cada pessoa insere e le os proprios envios; status e pontos NAO podem ser escolhidos por quem envia
create policy "insere o proprio envio" on envios for insert
  with check (usuario_id = auth.uid() and status = 'em_analise' and pontos = 0);

create policy "le o proprio envio" on envios for select
  using (usuario_id = auth.uid());

-- precos confirmados sao publicos (sem foto, sem usuario, sem localizacao)
create or replace view precos_confirmados as
  select produto_id, mercado_id, preco, criado_em
  from envios
  where status = 'confirmado';

-- a triagem (limite diario, faixa de preco, localizacao) e a confirmacao por 2 pessoas devem rodar numa
-- funcao do servidor com a chave de servico, repetindo as regras de src/colaboracao/regras.ts.
-- revisores: criar um papel proprio e uma policy de select/update so pra ele.
