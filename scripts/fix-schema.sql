drop table if exists classics cascade;
drop function if exists search_classics;

create table classics (
  id          bigserial primary key,
  source      text not null,
  chapter     text not null,
  content     text not null,
  scene       text not null,
  keywords    text[] default '{}',
  embedding   vector(2048),
  created_at  timestamptz default now()
);

create index classics_embedding_idx
  on classics using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create or replace function search_classics(
  query_embedding vector(2048),
  scene_filter    text default 'ALL',
  match_count     int  default 8,
  match_threshold float default 0.5
)
returns table (
  id        bigint,
  source    text,
  chapter   text,
  content   text,
  scene     text,
  keywords  text[],
  similarity float
)
language sql stable
as $$
  select
    c.id, c.source, c.chapter, c.content, c.scene, c.keywords,
    1 - (c.embedding <=> query_embedding) as similarity
  from classics c
  where
    (scene_filter = 'ALL' or c.scene = scene_filter or c.scene = 'ALL')
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

alter table classics enable row level security;
create policy "classics_read" on classics for select using (true);
