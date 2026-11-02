// Formulir jurnal yang ramah untuk orang awam akuntansi.
// Pengguna memilih "apa yang terjadi" dengan bahasa sehari-hari; sistem menentukan
// akun Debit & Kredit secara otomatis. Mode Akuntan tetap tersedia untuk input bebas.
import React, { useMemo, useState } from 'react';
import { BookOpen, Check, FileText, HelpCircle, X } from 'lucide-react';

export interface CoaAccount {
  code: string;
  name: string;
  category: string;
  // Terisi untuk rekening dari "Rekening Kas & Bank Terhubung"
  bankId?: string;
  balance?: number;
}

type JournalCategory = 'Kas/Bank' | 'Utang' | 'Piutang' | 'Biaya Operasional' | 'Pendapatan' | 'Aset Tetap';

export interface JournalInput {
  description: string;
  reference: string;
  accountDebit: string;
  accountCredit: string;
  amount: number;
  category: JournalCategory;
}

// Pemilih akun: daftar kode tertentu atau semua akun pada kategori tertentu
type Pick = { codes?: string[]; categories?: string[] };

interface Template {
  id: string;
  emoji: string;
  title: string;
  example: string;
  category: JournalCategory;
  debit: Pick & { label: string; def: string };
  credit: Pick & { label: string; def: string };
  explain: (debit: string, credit: string) => string;
}

// Kas & bank diambil dari data Rekening Kas & Bank Terhubung
export const BANK_CATEGORY = 'Kas & Bank';
const CASH: Pick = { categories: [BANK_CATEGORY] };
const EXPENSE: Pick = { categories: ['Beban Operasional'] };
const REVENUE: Pick = { categories: ['Pendapatan'] };

const TEMPLATES: Template[] = [
  {
    id: 'expense', emoji: '💸', title: 'Bayar biaya / belanja', example: 'Beli ATK, bayar listrik, sewa, iklan, gaji',
    category: 'Biaya Operasional',
    debit: { ...EXPENSE, label: 'Untuk keperluan apa?', def: '6090' },
    credit: { ...CASH, label: 'Dibayar pakai uang dari mana?', def: '1010' },
    explain: (d, c) => `Biaya "${d}" bertambah dan saldo "${c}" berkurang.`,
  },
  {
    id: 'income', emoji: '💰', title: 'Terima uang dari klien', example: 'Klien bayar tunai / transfer saat itu juga',
    category: 'Pendapatan',
    debit: { ...CASH, label: 'Uangnya masuk ke mana?', def: '1010' },
    credit: { ...REVENUE, label: 'Dari penjualan apa?', def: '4020' },
    explain: (d, c) => `Saldo "${d}" bertambah dan pendapatan "${c}" tercatat.`,
  },
  {
    id: 'invoice', emoji: '🧾', title: 'Kirim tagihan (klien belum bayar)', example: 'Acara sudah jalan, invoice dikirim, pembayaran menyusul',
    category: 'Piutang',
    debit: { codes: ['1120'], label: 'Dicatat sebagai', def: '1120' },
    credit: { ...REVENUE, label: 'Dari penjualan apa?', def: '4020' },
    explain: (_d, c) => `Klien punya utang ke kita (piutang) dan pendapatan "${c}" tercatat.`,
  },
  {
    id: 'collect', emoji: '✅', title: 'Klien melunasi tagihan', example: 'Pembayaran atas invoice yang dikirim sebelumnya',
    category: 'Piutang',
    debit: { ...CASH, label: 'Uangnya masuk ke mana?', def: '1010' },
    credit: { codes: ['1120'], label: 'Melunasi', def: '1120' },
    explain: (d) => `Saldo "${d}" bertambah dan tagihan klien (piutang) berkurang.`,
  },
  {
    id: 'credit-buy', emoji: '🛒', title: 'Beli dulu, bayar nanti (utang vendor)', example: 'Vendor kirim barang/jasa, tagihan dibayar belakangan',
    category: 'Utang',
    debit: { categories: ['Beban Operasional', 'Aset Tetap'], codes: ['1310'], label: 'Membeli apa?', def: '6090' },
    credit: { codes: ['2010'], label: 'Dicatat sebagai', def: '2010' },
    explain: (d) => `"${d}" bertambah dan utang ke vendor bertambah.`,
  },
  {
    id: 'pay-debt', emoji: '🏦', title: 'Bayar utang / pajak', example: 'Melunasi tagihan vendor atau setor pajak',
    category: 'Utang',
    debit: { codes: ['2010', '2020'], label: 'Utang apa yang dibayar?', def: '2010' },
    credit: { ...CASH, label: 'Dibayar pakai uang dari mana?', def: '1010' },
    explain: (d, c) => `"${d}" berkurang dan saldo "${c}" berkurang.`,
  },
  {
    id: 'asset', emoji: '🖥️', title: 'Beli aset / peralatan', example: 'Laptop, kamera, printer photobooth, furnitur',
    category: 'Aset Tetap',
    debit: { codes: ['1510', '1310'], label: 'Jenis barang', def: '1510' },
    credit: { ...CASH, label: 'Dibayar pakai uang dari mana?', def: '1010' },
    explain: (d, c) => `Nilai "${d}" bertambah dan saldo "${c}" berkurang.`,
  },
  {
    id: 'transfer', emoji: '🔁', title: 'Pindah uang antar rekening', example: 'Isi kas kecil dari BCA, pindah ke rekening payroll',
    category: 'Kas/Bank',
    debit: { ...CASH, label: 'Dipindah KE', def: '1030' },
    credit: { ...CASH, label: 'Diambil DARI', def: '1010' },
    explain: (d, c) => `Saldo "${d}" bertambah dan saldo "${c}" berkurang (total uang perusahaan tetap).`,
  },
  {
    id: 'capital', emoji: '🏢', title: 'Setoran modal pemilik', example: 'Pemilik menambah dana ke perusahaan',
    category: 'Kas/Bank',
    debit: { ...CASH, label: 'Uangnya masuk ke mana?', def: '1010' },
    credit: { codes: ['3010'], label: 'Dicatat sebagai', def: '3010' },
    explain: (d) => `Saldo "${d}" bertambah dan modal pemilik bertambah.`,
  },
];

export const accountLabel = (a: CoaAccount) => `${a.code} - ${a.name}`;
const label = accountLabel;
const pickAccounts = (accounts: CoaAccount[], p: Pick) =>
  accounts.filter((a) => (p.codes ?? []).includes(a.code) || (p.categories ?? []).includes(a.category));
// Akun bawaan: kode default bila ada di pilihan, selain itu pilihan pertama
const defaultLabel = (accounts: CoaAccount[], p: Pick & { def: string }) => {
  const list = pickAccounts(accounts, p);
  const a = list.find((x) => x.code === p.def) ?? list[0];
  return a ? label(a) : '';
};
const shortName = (full: string) => full.replace(/^\d+\s*-\s*/, '');

// Dropdown akun, dikelompokkan per kategori
const AccountSelect: React.FC<{ value: string; onChange: (v: string) => void; accounts: CoaAccount[] }> = ({ value, onChange, accounts }) => {
  const groups = accounts.reduce<Record<string, CoaAccount[]>>((g, a) => ((g[a.category] ??= []).push(a), g), {});
  return (
    <select
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
    >
      <option value="">Pilih akun…</option>
      {Object.entries(groups).map(([cat, list]) => (
        <optgroup key={cat} label={cat}>
          {list.map((a) => (
            <option key={a.code} value={label(a)}>
              {label(a)}{a.bankId ? ` · saldo Rp ${Math.round(a.balance ?? 0).toLocaleString('id-ID')}` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

const ACCOUNT_HINT: Record<string, string> = {
  'Aset Lancar': 'Uang & tagihan milik perusahaan',
  'Aset Tetap': 'Barang berharga jangka panjang',
  Kewajiban: 'Utang yang harus dibayar',
  Ekuitas: 'Modal pemilik',
  Pendapatan: 'Uang yang dihasilkan',
  'Beban Operasional': 'Biaya yang dikeluarkan',
};

export const EasyJournalModal: React.FC<{
  accounts: CoaAccount[];
  onClose: () => void;
  onSubmit: (input: JournalInput) => void;
}> = ({ accounts, onClose, onSubmit }) => {
  const [mode, setMode] = useState<'easy' | 'expert'>('easy');
  const [tplId, setTplId] = useState('expense');
  const tpl = TEMPLATES.find((t) => t.id === tplId)!;
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState(0);
  const [debit, setDebit] = useState(defaultLabel(accounts, tpl.debit));
  const [credit, setCredit] = useState(defaultLabel(accounts, tpl.credit));
  const [category, setCategory] = useState<JournalCategory>(tpl.category);
  const [showHelp, setShowHelp] = useState(false);

  const debitOptions = useMemo(() => (mode === 'easy' ? pickAccounts(accounts, tpl.debit) : accounts), [accounts, tpl, mode]);
  const creditOptions = useMemo(() => (mode === 'easy' ? pickAccounts(accounts, tpl.credit) : accounts), [accounts, tpl, mode]);

  const chooseTemplate = (t: Template) => {
    setTplId(t.id);
    setDebit(defaultLabel(accounts, t.debit));
    setCredit(t.id === 'transfer' ? (pickAccounts(accounts, t.credit).map(label).find((l) => l !== defaultLabel(accounts, t.debit)) ?? '') : defaultLabel(accounts, t.credit));
    setCategory(t.category);
  };

  const same = !!debit && debit === credit;
  const creditBank = accounts.find((a) => a.bankId && label(a) === credit);
  const insufficient = !!creditBank && amount > (creditBank.balance ?? 0);
  const noBank = !accounts.some((a) => a.bankId);
  const valid = description.trim() && amount > 0 && debit && credit && !same && !insufficient;
  const rupiah = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-emerald-600" />
            Catat Transaksi
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5 text-[11px] font-semibold">
              {(['easy', 'expert'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-2.5 py-1 rounded-md ${mode === m ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-500'}`}
                >
                  {m === 'easy' ? 'Mode Mudah' : 'Mode Akuntan'}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSubmit({ description: description.trim(), reference: reference.trim(), accountDebit: debit, accountCredit: credit, amount, category });
          }}
          className="overflow-y-auto px-6 py-4 space-y-4 text-xs"
        >
          {mode === 'easy' && (
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">1. Apa yang terjadi?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => chooseTemplate(t)}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      tplId === t.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">{t.emoji} {t.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{t.example}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {mode === 'easy' && <p className="font-semibold text-gray-700 dark:text-gray-200">2. Isi detailnya</p>}
            <div>
              <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Keterangan</label>
              <input
                type="text"
                required
                placeholder="Misal: Beli contoh bingkai photostrip 2R"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">
                  {mode === 'easy' ? tpl.debit.label : 'Akun Debit'}
                  {mode === 'expert' && <span className="text-gray-400 font-normal"> (sisi kiri)</span>}
                </label>
                <AccountSelect value={debit} onChange={setDebit} accounts={debitOptions} />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">
                  {mode === 'easy' ? tpl.credit.label : 'Akun Kredit'}
                  {mode === 'expert' && <span className="text-gray-400 font-normal"> (sisi kanan)</span>}
                </label>
                <AccountSelect value={credit} onChange={setCredit} accounts={creditOptions} />
              </div>
            </div>
            {same && <p className="text-rose-600">Akun debit dan kredit tidak boleh sama.</p>}
            {insufficient && (
              <p className="text-rose-600">
                Saldo {creditBank!.name} tidak cukup (sisa Rp {Math.round(creditBank!.balance ?? 0).toLocaleString('id-ID')}).
              </p>
            )}
            {noBank && (
              <p className="text-amber-600">Belum ada rekening. Tambahkan dulu di "Rekening Kas & Bank Terhubung" (tombol + Rekening).</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                />
                {amount > 0 && <p className="text-[10px] text-gray-500 mt-0.5">{rupiah(amount)}</p>}
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">No. Nota / Invoice <span className="text-gray-400 font-normal">(opsional)</span></label>
                <input
                  type="text"
                  placeholder="INV-001 / BKK-001"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as JournalCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {(['Kas/Bank', 'Utang', 'Piutang', 'Biaya Operasional', 'Pendapatan', 'Aset Tetap'] as const).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ringkasan dalam bahasa sehari-hari */}
          {debit && credit && !same && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"><BookOpen size={13} /> Yang akan dicatat</p>
              {mode === 'easy' && <p className="text-gray-700 dark:text-gray-200">{tpl.explain(shortName(debit), shortName(credit))}</p>}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-white dark:bg-gray-900"><span className="text-gray-400">Debit</span><br />{debit}<br /><b>{rupiah(amount)}</b></div>
                <div className="p-2 rounded-lg bg-white dark:bg-gray-900"><span className="text-gray-400">Kredit</span><br />{credit}<br /><b>{rupiah(amount)}</b></div>
              </div>
            </div>
          )}

          <button type="button" onClick={() => setShowHelp(!showHelp)} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-emerald-600">
            <HelpCircle size={12} /> Apa itu debit & kredit?
          </button>
          {showHelp && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-[11px] text-gray-600 dark:text-gray-300 space-y-1">
              <p>Setiap transaksi dicatat di dua sisi dengan nominal sama: <b>Debit</b> (kiri) dan <b>Kredit</b> (kanan).</p>
              <p>• <b>Debit</b> = uang/barang <b>masuk</b> atau biaya <b>bertambah</b>. Contoh: kas bertambah, beli ATK.</p>
              <p>• <b>Kredit</b> = uang <b>keluar</b>, utang bertambah, atau pendapatan diterima. Contoh: kas berkurang, penjualan.</p>
              <p>Gunakan <b>Mode Mudah</b>: cukup pilih kejadiannya, sistem yang menentukan debit & kredit.</p>
              <div className="pt-1 grid grid-cols-2 gap-1">
                {Object.entries(ACCOUNT_HINT).map(([k, v]) => <span key={k}><b>{k}</b>: {v}</span>)}
              </div>
            </div>
          )}

          <div className="pt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={!valid} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-40">
              <Check size={13} /> Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
