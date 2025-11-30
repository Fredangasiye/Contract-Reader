-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
  user_id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null, -- In a real Supabase Auth setup, Supabase handles this, but for your custom auth we store it here
  subscription_tier text default 'free',
  subscription_expiry timestamptz,
  scan_count int default 0,
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- ANALYSES TABLE (Stores contract analysis results)
create table public.analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(user_id), -- Optional: link to user if logged in
  source text default 'file',
  source_url text,
  full_text text, -- Will store encrypted text
  summary text,
  flags jsonb default '[]'::jsonb,
  bounding_boxes jsonb default '{}'::jsonb,
  ocr_confidence float,
  rules_version text,
  llm_model text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- LETTERS TABLE
create table public.letters (
  letter_id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(user_id) not null,
  contract_id uuid references public.analyses(id),
  letter_type text not null,
  generated_content text, -- Will store encrypted content
  customizations jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ADVICE TABLE (Optional: if you want to manage advice in DB instead of JSON)
create table public.advice (
  id uuid primary key default uuid_generate_v4(),
  contract_type text not null,
  section text not null,
  title text not null,
  content text not null,
  icon text,
  created_at timestamptz default now()
);

-- SECURITY POLICIES (Row Level Security)
-- These ensure users can only see their own data
alter table public.users enable row level security;
alter table public.analyses enable row level security;
alter table public.letters enable row level security;

-- Policy: Users can only see their own profile
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = user_id);

-- Policy: Users can only see their own analyses
create policy "Users can view own analyses" on public.analyses
  for select using (auth.uid() = user_id);

-- Policy: Users can only see their own letters
create policy "Users can view own letters" on public.letters
  for select using (auth.uid() = user_id);
