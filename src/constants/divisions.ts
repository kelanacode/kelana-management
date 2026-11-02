// Daftar divisi resmi Ruang Kelana (dipakai di seluruh aplikasi)
export const DIVISIONS = ['Teknologi & IT', 'HR & GA', 'Produk & Desain', 'Financial', 'Operasional', 'Marketing', 'Bisnis'] as const;

export type DivisionName = (typeof DIVISIONS)[number];
