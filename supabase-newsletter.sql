create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'homepage',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Public can create newsletter subscribers" on public.newsletter_subscribers;
create policy "Public can create newsletter subscribers"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (
  email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);

drop policy if exists "Admins can read newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can read newsletter subscribers"
on public.newsletter_subscribers
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can update newsletter subscribers"
on public.newsletter_subscribers
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
