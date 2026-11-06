-- Agenda dapat ditandai selesai dari Dashboard
alter table public.event_reminders add column if not exists completed boolean default false;
alter table public.event_reminders add column if not exists completed_at text;
