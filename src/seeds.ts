import { InventoryItem, ConsumableItem, BorrowingTransaction, PersonalAgenda, PeminjamanRuangan } from './types';

export const dummyInventory: InventoryItem[] = [
  { id: "inv-1", nama: "Mikroskop Binokuler XS-100", merk: "Olympus", bahan: "Logam & Kaca", jumlah: 8, ukuran: "Sedang", keadaan: "Sangat Baik", tahun_anggaran: "2024", ruangan: "Laboratorium Biologi" },
  { id: "inv-2", nama: "Proyektor BenQ MX535", merk: "BenQ", bahan: "Plastik & Elektronik", jumlah: 4, ukuran: "Sedang", keadaan: "Baik", tahun_anggaran: "2023", ruangan: "Ruang Pertemuan Utama" },
  { id: "inv-3", nama: "Solder Listrik Goot KX-40R", merk: "Goot", bahan: "Logam & Karet", jumlah: 15, ukuran: "Kecil", keadaan: "Sangat Baik", tahun_anggaran: "2025", ruangan: "Lab Teknik Elektro" },
  { id: "inv-4", nama: "Osiloskop Digital Rigol", merk: "Rigol", bahan: "Logam & Plastik", jumlah: 2, ukuran: "Besar", keadaan: "Rusak Ringan", tahun_anggaran: "2022", ruangan: "Gudang Peralatan Utama" }
];

export const dummyConsumables: ConsumableItem[] = [
  { id: "con-1", nama: "Kertas A4 HVS 80gr", jenis: "Non Makanan", kadaluarsa: "", keadaan: "Baru", jumlah: 12, merk: "PaperOne", ruangan: "Tata Usaha" },
  { id: "con-2", nama: "Air Mineral Gelas 240ml", jenis: "Makanan", kadaluarsa: "2026-07-15", keadaan: "Baru", jumlah: 5, merk: "Aqua", ruangan: "Ruang Guru" },
  { id: "con-3", nama: "Sabun Hand Sanitizer Gel 5L", jenis: "Non Makanan", kadaluarsa: "2025-12-01", keadaan: "Digunakan Sebagian", jumlah: 2, merk: "Dettol", ruangan: "Laboratorium Biologi" },
  { id: "con-4", nama: "Biskuit Gandum Rapat Staf", jenis: "Makanan", kadaluarsa: "2026-06-10", keadaan: "Digunakan Sebagian", jumlah: 3, merk: "Roma", ruangan: "Gudang Konsumsi" }
];

export const dummyBorrowings: BorrowingTransaction[] = [
  { 
    id: "bor-1", 
    namaPeminjam: "Prof. Hermawan S.T", 
    keperluan: "Penelitian Jaringan Sel Daun",
    tanggalPinjam: "2026-06-01", 
    tanggalKembali: "2026-06-05", 
    status: "Dipinjam",
    ruangan: "Laboratorium Biologi",
    items: [
      { alatId: "inv-1", jumlah: 2, returned: false, returnCondition: "Lengkap" }
    ]
  },
  { 
    id: "bor-2", 
    namaPeminjam: "Ibu Amanda S.Pd", 
    keperluan: "Presentasi Kelompok Kelas XII",
    tanggalPinjam: "2025-05-25", 
    tanggalKembali: "2025-05-28", 
    status: "Kembali",
    ruangan: "Ruang Pertemuan Utama",
    items: [
      { alatId: "inv-2", jumlah: 1, returned: true, returnCondition: "Lengkap" }
    ]
  }
];

export const dummyAgendas: PersonalAgenda[] = [
  { id: "age-1", judul: "Pengecekan Bulanan Kaca Pembesar", tanggal: "2026-06-04", keterangan: "Cek berkala semua lensa pembesar agar terhindar dari jamur", prioritas: "Sedang", tipe: "Biasa", selesai: false, checklist: [] },
  { id: "age-2", judul: "Kalibrasi Ulang Osiloskop Digital", tanggal: "2026-06-10", keterangan: "Memanggil teknisi vendor luar untuk kalibrasi tahunan", prioritas: "Tinggi", tipe: "Biasa", selesai: false, checklist: [] },
  {
    id: "age-3",
    judul: "Persiapan Laboratorium Kimia Pagi",
    tanggal: "2026-06-02",
    keterangan: "",
    prioritas: "Tinggi",
    tipe: "Harian",
    selesai: false,
    checklist: [
      { text: "Nyalakan blower / lemari asam", selesai: true },
      { text: "Persiapkan larutan H2SO4 encer", selesai: false },
      { text: "Buka lemari penyimpanan jas laboratorium", selesai: false }
    ]
  }
];

export const dummyRoomBorrowings: PeminjamanRuangan[] = [
  {
    id: "room-1",
    namaPeminjam: "Dr. Eng. Rian Wicaksono",
    keperluan: "Seminar Nasional IoT & Smart City",
    jumlahPeserta: 50,
    tanggalMulai: "2026-06-05",
    tanggalSelesai: "2026-06-05",
    jamMulai: "09:00",
    jamSelesai: "15:30",
    namaRuangan: "Aula Utama Lantai 3"
  },
  {
    id: "room-2",
    namaPeminjam: "Sari Handayani M.T.",
    keperluan: "Workshop Pemrograman Web React & Node",
    jumlahPeserta: 25,
    tanggalMulai: "2026-06-08",
    tanggalSelesai: "2026-06-10",
    jamMulai: "08:00",
    jamSelesai: "12:00",
    namaRuangan: "Laboratorium Komputer C"
  }
];

export const INITIAL_ROOMS: string[] = [
  "Aula Utama Lantai 3",
  "Laboratorium Komputer C",
  "Ruang Pertemuan Utama",
  "Laboratorium Biologi",
  "Lab Teknik Elektro",
  "Ruang Seminar Gedung A",
  "Ruang Rapat Direksi",
  "Gudang Peralatan Utama",
  "Tata Usaha",
  "Ruang Guru",
  "Gudang Konsumsi",
  "Lab Kimia",
  "Gudang Utama"
];
