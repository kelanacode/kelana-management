import fs from 'node:fs';
const edit = (f, pairs) => {
  const raw = fs.readFileSync(f, 'utf8'); const crlf = raw.includes('\r\n'); let s = raw.replace(/\r\n/g, '\n');
  for (const [a, b, all] of pairs) { if (!s.includes(a)) throw new Error(f + ': ' + a.slice(0, 70)); s = all ? s.split(a).join(b) : s.replace(a, b); }
  fs.writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s);
};
const M = 'src/components/finance/EasyJournalModal.tsx';
edit(M, [
  ["export interface CoaAccount {\n  code: string;\n  name: string;\n  category: string;\n}",
   "export interface CoaAccount {\n  code: string;\n  name: string;\n  category: string;\n  // Terisi untuk rekening dari \"Rekening Kas & Bank Terhubung\"\n  bankId?: string;\n  balance?: number;\n}"],
  ["const CASH: Pick = { codes: ['1010', '1020', '1030'] };", "// Kas & bank diambil dari data Rekening Kas & Bank Terhubung\nexport const BANK_CATEGORY = 'Kas & Bank';\nconst CASH: Pick = { categories: [BANK_CATEGORY] };"],
  ["const label = (a: CoaAccount) => `${a.code} - ${a.name}`;", "export const accountLabel = (a: CoaAccount) => `${a.code} - ${a.name}`;\nconst label = accountLabel;"],
  [`const findLabel = (accounts: CoaAccount[], code: string) => {
  const a = accounts.find((x) => x.code === code);
  return a ? label(a) : '';
};`, `// Akun bawaan: kode default bila ada di pilihan, selain itu pilihan pertama
const defaultLabel = (accounts: CoaAccount[], p: Pick & { def: string }) => {
  const list = pickAccounts(accounts, p);
  const a = list.find((x) => x.code === p.def) ?? list[0];
  return a ? label(a) : '';
};`],
  ["            <option key={a.code} value={label(a)}>{label(a)}</option>", "            <option key={a.code} value={label(a)}>\n              {label(a)}{a.bankId ? ` · saldo Rp ${Math.round(a.balance ?? 0).toLocaleString('id-ID')}` : ''}\n            </option>"],
  ["  const [debit, setDebit] = useState(findLabel(accounts, tpl.debit.def));\n  const [credit, setCredit] = useState(findLabel(accounts, tpl.credit.def));",
   "  const [debit, setDebit] = useState(defaultLabel(accounts, tpl.debit));\n  const [credit, setCredit] = useState(defaultLabel(accounts, tpl.credit));"],
  ["    setDebit(findLabel(accounts, t.debit.def));\n    setCredit(findLabel(accounts, t.credit.def));",
   "    setDebit(defaultLabel(accounts, t.debit));\n    setCredit(t.id === 'transfer' ? (pickAccounts(accounts, t.credit).map(label).find((l) => l !== defaultLabel(accounts, t.debit)) ?? '') : defaultLabel(accounts, t.credit));"],
  ["  const same = !!debit && debit === credit;\n  const valid = description.trim() && amount > 0 && debit && credit && !same;",
   `  const same = !!debit && debit === credit;
  const creditBank = accounts.find((a) => a.bankId && label(a) === credit);
  const insufficient = !!creditBank && amount > (creditBank.balance ?? 0);
  const noBank = !accounts.some((a) => a.bankId);
  const valid = description.trim() && amount > 0 && debit && credit && !same && !insufficient;`],
  ["            {same && <p className=\"text-rose-600\">Akun debit dan kredit tidak boleh sama.</p>}",
   `            {same && <p className="text-rose-600">Akun debit dan kredit tidak boleh sama.</p>}
            {insufficient && (
              <p className="text-rose-600">
                Saldo {creditBank!.name} tidak cukup (sisa Rp {Math.round(creditBank!.balance ?? 0).toLocaleString('id-ID')}).
              </p>
            )}
            {noBank && (
              <p className="text-amber-600">Belum ada rekening. Tambahkan dulu di "Rekening Kas & Bank Terhubung" (tombol + Rekening).</p>
            )}`],
]);

const F = 'src/pages/Finance.tsx';
edit(F, [
  ["import { EasyJournalModal } from '../components/finance/EasyJournalModal';",
   "import { EasyJournalModal, BANK_CATEGORY, accountLabel, type CoaAccount } from '../components/finance/EasyJournalModal';"],
  [`        <EasyJournalModal
          accounts={standardAccounts}
          onClose={() => setShowJEModal(false)}
          onSubmit={(input) => {
            finance.addJournalEntry({ ...input, status: 'Posted', createdBy: session?.user.name || 'Finance User' });
            setShowJEModal(false);
          }}
        />`,
   `        <EasyJournalModal
          accounts={journalAccounts}
          onClose={() => setShowJEModal(false)}
          onSubmit={(input) => {
            finance.addJournalEntry({ ...input, status: 'Posted', createdBy: session?.user.name || 'Finance User' });
            // Saldo rekening ikut berubah: debit = uang masuk, kredit = uang keluar
            journalAccounts.forEach((a) => {
              if (!a.bankId) return;
              const change = (accountLabel(a) === input.accountDebit ? input.amount : 0) - (accountLabel(a) === input.accountCredit ? input.amount : 0);
              const bank = finance.bankAccounts.find((b) => b.id === a.bankId);
              if (change && bank) finance.updateBankAccount(bank.id, { balance: bank.balance + change });
            });
            setShowJEModal(false);
          }}
        />`],
  ["  // Manual JE handler\n", ""],
]);
// akun jurnal: kas & bank dari rekening terhubung, akun lain dari COA standar
let s = fs.readFileSync(F, 'utf8'); const crlf = s.includes('\r\n'); s = s.replace(/\r\n/g, '\n');
const anchor = '  const totalCashBank = finance.bankAccounts.reduce';
if (!s.includes(anchor)) throw 'anchor';
s = s.replace(anchor, `  // Akun untuk formulir Catat Transaksi: kas & bank dari "Rekening Kas & Bank Terhubung"
  const journalAccounts: CoaAccount[] = [
    ...finance.bankAccounts.map((b, i) => ({
      code: \`10\${String(11 + i).padStart(2, '0')}\`,
      name: \`\${b.bankName}\${b.accountNumber ? \` (\${b.accountNumber})\` : ''}\`,
      category: BANK_CATEGORY,
      bankId: b.id,
      balance: b.balance,
    })),
    ...standardAccounts.filter((a) => !['1010', '1020', '1030'].includes(a.code)),
  ];
` + anchor);
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('ok');
