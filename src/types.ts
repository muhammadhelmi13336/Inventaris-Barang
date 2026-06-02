/**
 * Types definitions for InveTrak
 */

export interface InventoryItem {
  id: string;
  nama: string;
  merk: string;
  bahan: string;
  jumlah: number;
  ukuran: 'Kecil' | 'Sedang' | 'Besar';
  keadaan: 'Sangat Baik' | 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  tahun_anggaran: string;
  ruangan: string;
}

export interface ConsumableItem {
  id: string;
  nama: string;
  merk: string;
  jenis: 'Makanan' | 'Non Makanan';
  jumlah: number;
  keadaan: 'Baru' | 'Digunakan Sebagian';
  kadaluarsa: string; // YYYY-MM-DD format
  ruangan: string;
}

export interface BorrowedItem {
  alatId: string;
  jumlah: number;
  returned: boolean;
  returnCondition: 'Lengkap' | 'Rusak' | 'Tidak Lengkap';
}

export interface BorrowingTransaction {
  id: string;
  namaPeminjam: string;
  keperluan: string;
  tanggalPinjam: string;
  tanggalKembali: string;
  status: 'Dipinjam' | 'Kembali' | 'Kembali Sebagian';
  ruangan: string; // Combined room labels
  items: BorrowedItem[];
}

export interface ChecklistItem {
  text: string;
  selesai: boolean;
}

export interface PeminjamanRuangan {
  id: string;
  namaPeminjam: string;
  keperluan: string;
  jumlahPeserta: number;
  tanggalMulai: string;      // Tanggal Peminjaman
  tanggalSelesai: string;    // Tanggal Selesai Acara
  jamMulai: string;          // Jam Pelaksanaan Acara
  jamSelesai: string;        // Jam Selesai Acara
  namaRuangan: string;       // Nama Ruangan
  status?: 'Aktif' | 'Selesai';
}

export interface PersonalAgenda {
  id: string;
  judul: string;
  tanggal: string;
  keterangan: string;
  prioritas: 'Rendah' | 'Sedang' | 'Tinggi';
  tipe: 'Biasa' | 'Harian';
  checklist: ChecklistItem[];
  selesai: boolean;
}

export type TabId = 'dashboard' | 'inventaris' | 'consumables' | 'peminjaman' | 'pribadi' | 'ruangan';
