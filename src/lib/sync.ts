// Sinkronisasi dua arah antara store Zustand dan tabel Supabase.
//
// - loadAll(): ambil semua baris tiap tabel dan isi store.
// - Setiap perubahan array di store dibandingkan (per id) lalu di-upsert/delete ke tabel.
// - Perubahan dari pengguna lain masuk lewat Supabase Realtime.
//
// Store tetap menjadi sumber kebenaran untuk UI, sehingga kode halaman tidak perlu diubah.
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { StoreApi, UseBoundStore } from 'zustand';
import { supabase } from './supabase';
import { TABLES, type ColumnMap, type TableSpec } from './dbSchema';
import { useAppStore } from '../stores/appStore';
import { useAssetStore } from '../stores/assetStore';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useBoardStore } from '../stores/boardStore';
import { useBudgetRequisitionStore } from '../stores/budgetRequisitionStore';
import { useDatabaseStore } from '../stores/databaseStore';
import { useFinanceStore } from '../stores/financeStore';
import { useGoogleDriveStore } from '../stores/googleDriveStore';
import { useNotesStore } from '../stores/notesStore';
import { useProcureToPayStore } from '../stores/procureToPayStore';
import { useReminderStore } from '../stores/reminderStore';
import { useTaskStore } from '../stores/taskStore';

type AnyStore = UseBoundStore<StoreApi<any>>;
type Item = { id: string } & Record<string, any>;

const STORES: Record<string, AnyStore> = {
  app: useAppStore,
  asset: useAssetStore,
  attendance: useAttendanceStore,
  board: useBoardStore,
  budgetRequisition: useBudgetRequisitionStore,
  database: useDatabaseStore,
  finance: useFinanceStore,
  googleDrive: useGoogleDriveStore,
  notes: useNotesStore,
  procureToPay: useProcureToPayStore,
  reminder: useReminderStore,
  task: useTaskStore,
};

const FLUSH_DELAY_MS = 400;
// Event realtime untuk id yang baru saja kita tulis sendiri diabaikan selama jeda ini,
// supaya echo dari server tidak menimpa ketikan yang lebih baru.
const ECHO_IGNORE_MS = 4000;
const PAGE_SIZE = 1000;

// Urutan item di store untuk tabel yang tampilannya bergantung pada urutan.
// Tabel lain: item terbaru di depan.
const SORTERS: Record<string, (a: Item, b: Item) => number> = {};

const ordered = (table: string, list: Item[]) => {
  const sorter = SORTERS[table];
  return sorter ? [...list].sort(sorter) : list;
};

// Field yang nilainya ditentukan server (trigger). Setelah disimpan, nilai server
// disalin kembali ke store agar tampilan pengirim sama dengan pengguna lain.
const SERVER_FIELDS: Record<string, string[]> = {};

// ---------------- Konversi baris <-> objek ----------------

export function toRow(item: Record<string, any>, columns: ColumnMap, withId = true): Record<string, any> {
  const row: Record<string, any> = withId ? { id: item.id } : {};
  for (const [field, [col, type]] of Object.entries(columns)) {
    let v = item[field];
    if (v === undefined) v = null;
    if (type !== 'text' && v === '') v = null;
    if (type === 'timestamptz' && v !== null && Number.isNaN(new Date(v).getTime())) v = null;
    if (type === 'numeric' && v !== null) v = Number.isFinite(Number(v)) ? Number(v) : null;
    row[col] = v;
  }
  return row;
}

export function fromRow(row: Record<string, any>, columns: ColumnMap): Item {
  const item: Item = { id: row.id };
  for (const [field, [col, type]] of Object.entries(columns)) {
    const v = row[col];
    if (v === null || v === undefined) continue;
    if (type === 'numeric') item[field] = Number(v);
    else if (type === 'timestamptz') item[field] = new Date(v).toISOString();
    else item[field] = v;
  }
  return item;
}

// ---------------- State sinkronisasi ----------------

interface TableState {
  spec: TableSpec;
  store: AnyStore;
  pending: Map<string, Record<string, any> | null>; // null = hapus
  timer: ReturnType<typeof setTimeout> | null;
  recentWrites: Map<string, number>;
}

let tables: TableState[] = [];
let unsubscribers: (() => void)[] = [];
let channel: RealtimeChannel | null = null;
let applyingRemote = false;
let running = false;

const reportError = (context: string, error: unknown) => {
  console.error(`[sync] ${context}:`, error);
  window.dispatchEvent(new CustomEvent('kelana:sync-error', { detail: { context, error } }));
};

function setFromRemote(store: AnyStore, patch: Record<string, any>) {
  applyingRemote = true;
  try {
    store.setState(patch);
  } finally {
    applyingRemote = false;
  }
}

async function flush(ts: TableState) {
  ts.timer = null;
  if (ts.pending.size === 0) return;
  const batch = new Map(ts.pending);
  ts.pending.clear();

  const upserts: Record<string, any>[] = [];
  const deletes: string[] = [];
  for (const [id, row] of batch) {
    ts.recentWrites.set(id, Date.now());
    if (row) upserts.push(row);
    else deletes.push(id);
  }

  if (upserts.length) {
    const serverFields = SERVER_FIELDS[ts.spec.table];
    const query = supabase.from(ts.spec.table).upsert(upserts, { onConflict: 'id' });
    const { data, error } = serverFields ? await query.select() : await query;
    if (error) reportError(`simpan ${ts.spec.table}`, error);
    else if (serverFields && data?.length) applyServerFields(ts, data, serverFields);
  }
  if (deletes.length) {
    const { error } = await supabase.from(ts.spec.table).delete().in('id', deletes);
    if (error) reportError(`hapus ${ts.spec.table}`, error);
  }
}

function applyServerFields(ts: TableState, rows: Record<string, any>[], fields: string[]) {
  const byId = new Map(rows.map((r) => [r.id, fromRow(r, ts.spec.columns)]));
  const list: Item[] = ts.store.getState()[ts.spec.key] ?? [];
  let changed = false;
  const next = list.map((item) => {
    const server = byId.get(item.id);
    if (!server || fields.every((f) => item[f] === server[f])) return item;
    changed = true;
    const patch: Record<string, any> = {};
    for (const f of fields) patch[f] = server[f];
    return { ...item, ...patch };
  });
  if (changed) setFromRemote(ts.store, { [ts.spec.key]: ordered(ts.spec.table, next) });
}

function queue(ts: TableState, id: string, row: Record<string, any> | null) {
  ts.pending.set(id, row);
  if (!ts.timer) ts.timer = setTimeout(() => void flush(ts), FLUSH_DELAY_MS);
}

function diff(ts: TableState, next: Item[] = [], prev: Item[] = []) {
  const prevById = new Map(prev.map((i) => [i.id, i]));
  const nextIds = new Set<string>();
  for (const item of next) {
    if (!item?.id) continue;
    nextIds.add(item.id);
    if (prevById.get(item.id) !== item) queue(ts, item.id, toRow(item, ts.spec.columns));
  }
  for (const id of prevById.keys()) {
    if (!nextIds.has(id)) queue(ts, id, null);
  }
}

async function fetchAll(table: string) {
  const rows: Record<string, any>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('inserted_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

function handleRealtime(ts: TableState, payload: any) {
  const id: string | undefined = payload.new?.id ?? payload.old?.id;
  if (!id) return;
  const last = ts.recentWrites.get(id);
  if (ts.pending.has(id) || (last && Date.now() - last < ECHO_IGNORE_MS)) return;

  const list: Item[] = ts.store.getState()[ts.spec.key] ?? [];
  let next: Item[];
  if (payload.eventType === 'DELETE') {
    next = list.filter((i) => i.id !== id);
  } else {
    const item = fromRow(payload.new, ts.spec.columns);
    const idx = list.findIndex((i) => i.id === id);
    next = idx === -1 ? [item, ...list] : list.map((i) => (i.id === id ? { ...i, ...item } : i));
  }
  setFromRemote(ts.store, { [ts.spec.key]: ordered(ts.spec.table, next) });
}

// ---------------- API publik ----------------

export async function startSync() {
  if (running) return;
  running = true;

  tables = TABLES.map((spec) => ({
    spec,
    store: STORES[spec.store],
    pending: new Map(),
    timer: null,
    recentWrites: new Map(),
  }));

  // 1. Kirim perubahan lokal ke Supabase. Dipasang sebelum memuat data,
  //    supaya input yang dibuat selama proses memuat tidak hilang.
  const byStore = new Map<AnyStore, TableState[]>();
  for (const ts of tables) byStore.set(ts.store, [...(byStore.get(ts.store) ?? []), ts]);
  for (const [store, list] of byStore) {
    unsubscribers.push(
      store.subscribe((state: any, prev: any) => {
        if (applyingRemote) return;
        for (const ts of list) {
          if (state[ts.spec.key] !== prev[ts.spec.key]) diff(ts, state[ts.spec.key], prev[ts.spec.key]);
        }
      })
    );
  }

  // 2. Muat semua data dari Supabase, digabung dengan perubahan lokal yang belum/baru tersimpan
  const results = await Promise.allSettled(tables.map((ts) => fetchAll(ts.spec.table)));
  if (!running) return; // logout saat sedang memuat
  results.forEach((res, i) => {
    const ts = tables[i];
    if (res.status === 'rejected') {
      reportError(`muat ${ts.spec.table}`, res.reason);
      return;
    }
    const isLocalChange = (id: string) => ts.pending.has(id) || ts.recentWrites.has(id);
    const local: Item[] = ts.store.getState()[ts.spec.key] ?? [];
    const localById = new Map(local.map((item) => [item.id, item]));
    const remote = res.value.map((r) => fromRow(r, ts.spec.columns));
    const remoteIds = new Set(remote.map((item) => item.id));
    const merged = [
      ...local.filter((item) => isLocalChange(item.id) && !remoteIds.has(item.id)),
      ...remote
        .filter((item) => !(ts.pending.get(item.id) === null)) // dihapus lokal
        .map((item) => (isLocalChange(item.id) ? (localById.get(item.id) ?? item) : item)),
    ];
    setFromRemote(ts.store, { [ts.spec.key]: ordered(ts.spec.table, merged) });
  });

  // 3. Terima perubahan dari pengguna lain (WebSocket memakai token login agar lolos RLS)
  const { data: auth } = await supabase.auth.getSession();
  if (auth.session) await supabase.realtime.setAuth(auth.session.access_token);
  channel = supabase.channel('kelana-data');
  for (const ts of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: ts.spec.table }, (payload) =>
      handleRealtime(ts, payload)
    );
  }
  channel.subscribe();
}

export async function stopSync() {
  if (!running) return;
  running = false;
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  // Simpan perubahan yang masih tertunda sebelum berhenti
  await Promise.all(
    tables.map((ts) => {
      if (ts.timer) clearTimeout(ts.timer);
      return flush(ts);
    })
  );
  if (channel) await supabase.removeChannel(channel);
  channel = null;

  // Kosongkan data agar tidak terlihat oleh pengguna berikutnya di browser yang sama
  for (const ts of tables) setFromRemote(ts.store, { [ts.spec.key]: [] });
  tables = [];
}
