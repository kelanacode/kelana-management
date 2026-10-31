-- Waktu kirim chat ditentukan server, bukan jam perangkat pengirim.
-- (Tabel chat_messages kemudian digantikan oleh chat_room_messages di migrasi berikutnya;
--  blok ini dilewati bila tabel lama sudah tidak ada.)
do $mig$
begin
  if to_regclass('public.chat_messages') is null then
    return;
  end if;

  create or replace function public.chat_messages_server_time()
  returns trigger language plpgsql as $fn$
  begin
    if tg_op = 'INSERT' then
      new."timestamp" := now();
    else
      new."timestamp" := old."timestamp";
    end if;
    return new;
  end;
  $fn$;

  drop trigger if exists chat_messages_server_time on public.chat_messages;
  create trigger chat_messages_server_time
    before insert or update on public.chat_messages
    for each row execute function public.chat_messages_server_time();

  alter table public.chat_messages disable trigger chat_messages_server_time;
  update public.chat_messages set "timestamp" = inserted_at where "timestamp" is distinct from inserted_at;
  alter table public.chat_messages enable trigger chat_messages_server_time;
end $mig$;
