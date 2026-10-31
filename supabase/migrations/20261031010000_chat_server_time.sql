-- Waktu kirim chat ditentukan server, bukan jam perangkat pengirim.
-- Jam perangkat bisa meleset (mis. zona waktu salah), sehingga urutan percakapan kacau.

create or replace function public.chat_messages_server_time()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new."timestamp" := now();
  else
    -- Update (mis. tanda sudah dibaca) tidak boleh mengubah waktu kirim
    new."timestamp" := old."timestamp";
  end if;
  return new;
end;
$$;

drop trigger if exists chat_messages_server_time on public.chat_messages;
create trigger chat_messages_server_time
  before insert or update on public.chat_messages
  for each row execute function public.chat_messages_server_time();

-- Koreksi pesan lama memakai waktu server saat pesan disimpan
alter table public.chat_messages disable trigger chat_messages_server_time;
update public.chat_messages set "timestamp" = inserted_at where "timestamp" is distinct from inserted_at;
alter table public.chat_messages enable trigger chat_messages_server_time;
