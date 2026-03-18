-- Remove deprecated karma score column from users.
alter table public.users drop column if exists karma_score;
