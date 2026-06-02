import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  MapPin, 
  Edit, 
  Trash2, 
  FileDown, 
  Filter, 
  X,
  Boxes
} from 'lucide-react';
import { InventoryItem, TabId } from '../types';
import { formatIndoDate } from '../utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryProps {
  inventory: InventoryItem[];
  borrowings: any[]; // to check active borrows
  onSave: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  triggerConfirm: (msg: string, callback: () => void) => void;
  rooms: string[];
}

export default function Inventory({
  inventory,
  borrowings,
  onSave,
  onDelete,
  showToast,
  triggerConfirm,
  rooms,
}: InventoryProps) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form Fields State
  const [formNama, setFormNama] = useState('');
  const [formMerk, setFormMerk] = useState('');
  const [formBahan, setFormBahan] = useState('');
  const [formJumlah, setFormJumlah] = useState<number>(1);
  const [formUkuran, setFormUkuran] = useState<'Kecil' | 'Sedang' | 'Besar'>('Sedang');
  const [formKeadaan, setFormKeadaan] = useState<
    'Sangat Baik' | 'Baik' | 'Rusak Ringan' | 'Rusak Berat'
  >('Baik');
  const [formTahun, setFormTahun] = useState('');
  const [formRuang, setFormRuang] = useState('');

  // Get Room list options dynamically
  const roomOptions = useMemo(() => {
    const list = inventory.map((item) => item.ruangan.trim()).filter(Boolean);
    return [...new Set(list)].sort();
  }, [inventory]);

  // Filter listings
  const filteredList = useMemo(() => {
    return inventory.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.nama.toLowerCase().includes(q) ||
        (item.merk && item.merk.toLowerCase().includes(q)) ||
        item.bahan.toLowerCase().includes(q) ||
        item.ruangan.toLowerCase().includes(q) ||
        item.tahun_anggaran.includes(q);

      const matchesSize = !sizeFilter || item.ukuran === sizeFilter;
      const matchesCondition = !conditionFilter || item.keadaan === conditionFilter;
      const matchesRoom = !roomFilter || item.ruangan.trim() === roomFilter;

      return matchesSearch && matchesSize && matchesCondition && matchesRoom;
    });
  }, [inventory, searchQuery, sizeFilter, conditionFilter, roomFilter]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormNama('');
    setFormMerk('');
    setFormBahan('');
    setFormJumlah(1);
    setFormUkuran('Sedang');
    setFormKeadaan('Baik');
    setFormTahun(new Date().getFullYear().toString());
    setFormRuang(rooms[0] || '');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormMerk(item.merk || '');
    setFormBahan(item.bahan);
    setFormJumlah(item.jumlah);
    setFormUkuran(item.ukuran);
    setFormKeadaan(item.keadaan);
    setFormTahun(item.tahun_anggaran);
    setFormRuang(item.ruangan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNama.trim() || !formBahan.trim() || !formRuang.trim() || !formTahun.trim()) {
      showToast('Harap isi semua kolom formulir wajib!', 'error');
      return;
    }

    const itemData: InventoryItem = {
      id: editingItem ? editingItem.id : 'inv-' + Date.now(),
      nama: formNama.trim(),
      merk: formMerk.trim(),
      bahan: formBahan.trim(),
      jumlah: formJumlah,
      ukuran: formUkuran,
      keadaan: formKeadaan,
      tahun_anggaran: formTahun,
      ruangan: formRuang.trim(),
    };

    onSave(itemData);
    showToast(
      editingItem ? 'Alat berhasil diperbarui!' : 'Alat baru berhasil ditambahkan!',
      'success'
    );
    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string, name: string) => {
    // Check if item is currently borrowed
    const isBorrowed = borrowings.some((bor) => {
      return (
        (bor.status === 'Dipinjam' || bor.status === 'Kembali Sebagian') &&
        bor.items.some((it: any) => it.alatId === id && !it.returned)
      );
    });

    if (isBorrowed) {
      showToast('Gagal menghapus: Alat ini sedang aktif dipinjam!', 'error');
      return;
    }

    triggerConfirm(
      `Apakah Anda yakin ingin menghapus alat "${name}" secara permanen dari sistem inventaris?`,
      () => {
        onDelete(id);
        showToast('Alat berhasil dihapus dari sistem', 'success');
      }
    );
  };

  // --- REPORT EXPORTS ---
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      showToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }

    const exportedColumns = filteredList.map((item) => ({
      ID: item.id,
      'Nama Alat': item.nama,
      Merk: item.merk || '-',
      Bahan: item.bahan,
      Ukuran: item.ukuran,
      Jumlah: item.jumlah,
      Keadaan: item.keadaan,
      'Tahun Anggaran': item.tahun_anggaran,
      Ruangan: item.ruangan,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportedColumns);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaris Alat');
    XLSX.writeFile(
      workbook,
      `Inventaris_Alat_InveTrak_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('Berhasil mengekspor data ke Excel!', 'success');
  };

  const handleExportPDF = () => {
    if (filteredList.length === 0) {
      showToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }

    const headers = [['ID', 'Nama Alat', 'Merk', 'Bahan', 'Ukuran', 'Jumlah', 'Keadaan', 'Thn Angg.', 'Ruangan']];
    const dataRows = filteredList.map((item) => [
      item.id,
      item.nama,
      item.merk || '-',
      item.bahan,
      item.ukuran,
      item.jumlah,
      item.keadaan,
      item.tahun_anggaran,
      item.ruangan,
    ]);

    const title = 'Laporan Inventaris Alat Kerja - InveTrak';
    const fileName = `Inventaris_Alat_InveTrak_${new Date().toISOString().split('T')[0]}.pdf`;

    const doc = new jsPDF('l', 'pt', 'a4');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 40, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Diekspor pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 40, 70);

    autoTable(doc, {
      head: headers,
      body: dataRows,
      startY: 90,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8, cellPadding: 6 },
      margin: { left: 40, right: 40 },
    });

    doc.save(fileName);
    showToast('Berhasil mengekspor data ke PDF!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar (Bento Premium) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-xs">
        <div className="flex flex-1 flex-col lg:flex-row gap-2">
          {/* Search box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama alat, merk, bahan, atau ruangan..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Direct filter drop-downs */}
          <div className="flex flex-wrap gap-2">
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Ukuran</option>
              <option value="Kecil">Kecil</option>
              <option value="Sedang">Sedang</option>
              <option value="Besar">Besar</option>
            </select>

            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Keadaan</option>
              <option value="Sangat Baik">Sangat Baik</option>
              <option value="Baik">Baik</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
            </select>

            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] cursor-pointer"
            >
              <option value="">Semua Ruangan</option>
              {roomOptions.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Export and Add */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleExportPDF}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-3.5 py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
            title="Ekspor Laporan PDF"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3.5 py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer"
            title="Ekspor Laporan Excel"
          >
            <Boxes className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Alat</span>
          </button>
        </div>
      </div>

      {/* Main Table view (Bento Premium) */}
      <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Nama Alat</th>
                <th className="px-6 py-4">Merk</th>
                <th className="px-6 py-4">Jenis Bahan</th>
                <th className="px-6 py-4">Ukuran</th>
                <th className="px-6 py-4 text-center">Jumlah</th>
                <th className="px-6 py-4">Keadaan</th>
                <th className="px-6 py-4">Thn Angg.</th>
                <th className="px-6 py-4">Ruangan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada alat inventaris yang cocok dengan kriteria pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  if (item.keadaan === 'Rusak Ringan') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                  } else if (item.keadaan === 'Rusak Berat') {
                    badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800 text-sm block">
                          {item.nama}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600">
                        {item.merk || <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {item.bahan}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-lg">
                          {item.ukuran}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-indigo-600">
                        {item.jumlah}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 border rounded-full text-xs font-semibold ${badgeClass}`}>
                          {item.keadaan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        {item.tahun_anggaran}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={item.ruangan}>
                            {item.ruangan}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Alat"
                          >
                            <Edit className="w-4.5 h-4.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.nama)}
                            className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Alat"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DIALOG */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white rounded-[2.5rem] border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-800 text-lg">
                  {editingItem ? 'Edit Alat Inventaris' : 'Tambah Alat Inventaris'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Nama Alat <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="Contoh: Mikroskop Binokuler"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Merk / Brand
                    </label>
                    <input
                      type="text"
                      value={formMerk}
                      onChange={(e) => setFormMerk(e.target.value)}
                      placeholder="Contoh: Olympus, BenQ, Goot"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Jenis Bahan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formBahan}
                      onChange={(e) => setFormBahan(e.target.value)}
                      placeholder="Contoh: Logam & Kaca"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Jumlah Unit <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formJumlah}
                      onChange={(e) => setFormJumlah(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Ukuran Alat <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formUkuran}
                      onChange={(e) => setFormUkuran(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border-slate-200"
                    >
                      <option value="Kecil">Kecil</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Besar">Besar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Keadaan Fisik <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formKeadaan}
                      onChange={(e) => setFormKeadaan(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border-slate-200"
                    >
                      <option value="Sangat Baik">Sangat Baik</option>
                      <option value="Baik">Baik</option>
                      <option value="Rusak Ringan">Rusak Ringan</option>
                      <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tahun Anggaran <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1990}
                      max={2099}
                      value={formTahun}
                      onChange={(e) => setFormTahun(e.target.value)}
                      placeholder="Contoh: 2024"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tempat Simpan (Ruang) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formRuang}
                      onChange={(e) => setFormRuang(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {rooms.map((room) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
