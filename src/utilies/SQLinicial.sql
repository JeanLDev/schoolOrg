create table public.users (
  id uuid not null default gen_random_uuid (),
  email text null,
  created_at timestamp with time zone not null default (now() AT TIME ZONE 'America/Sao_Paulo'::text),
  user_id uuid null,
  name text null,
  cep numeric null,
  constraint users_pkey primary key (id),
  constraint users_user_id_key unique (user_id)
) TABLESPACE pg_default;

create table public.roles (
  id uuid not null default gen_random_uuid (),
  name text null,
  created_at timestamp with time zone not null default now(),
  constraint roles_pkey primary key (id)
) TABLESPACE pg_default;

create table public.collaborators (
  id uuid not null default gen_random_uuid (),
  email text not null,
  role text null default 'Colaborador'::text,
  created_at timestamp with time zone null default (now() AT TIME ZONE 'America/Sao_Paulo'::text),
  user_id uuid null,
  role_id uuid null,
  constraint collaborators_pkey primary key (id),
  constraint collaborators_email_key unique (email),
  constraint collaborators_role_id_fkey foreign KEY (role_id) references roles (id),
  constraint collaborators_user_id_fkey foreign KEY (user_id) references users (user_id)
) TABLESPACE pg_default;

create table public.permissions_collaborators (
  id uuid not null default gen_random_uuid (),
  "canViewSidebar" jsonb null,
  "canViewKanban" jsonb null,
  created_at timestamp with time zone not null default now(),
  role_id uuid null,
  constraint permissions_pkey primary key (id),
  constraint permissions_collaborators_role_id_fkey foreign KEY (role_id) references roles (id)
) TABLESPACE pg_default;

create table public.role_permissions (
  id uuid not null default gen_random_uuid (),
  role_name text not null,
  allowed_menu_ids text[] not null default '{}'::text[],
  allowed_submenu_ids text[] not null default '{}'::text[],
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  user_id uuid null,
  constraint role_permissions_pkey primary key (id),
  constraint role_permissions_role_name_key unique (role_name),
  constraint role_permissions_user_id_fkey foreign KEY (user_id) references users (user_id)
) TABLESPACE pg_default;

create index IF not exists idx_role_permissions_role_name on public.role_permissions using btree (role_name) TABLESPACE pg_default;
