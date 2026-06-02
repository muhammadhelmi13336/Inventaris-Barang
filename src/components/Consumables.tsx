import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  MapPin, 
  Edit, 
  Trash2, 
  FileDown, 
  Boxes, 
  X,
  CalendarDays
} from 'lucide-react';
import { ConsumableItem } from '../types';
import { formatIndoDate } from '../utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ConsumablesProps {
  consumables: ConsumableItem[];
  onSave: (item: ConsumableItem) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  triggerConfirm: (msg: string, callback: () => void) => void;
}

// Function to calculate expiry status relative to 2026-06-02
export function checkExpiryStatus(expiryDateStr: string) {
  if (!expiryDateStr) {
    return { label: 'Aman / Baik', class: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  }
  
  // Set today as 2026-06-02 based on system context
  const today = new Date('2026-06-02');
  today.setHours(0, 0, 0, 0);
  
  const expiryDate = new Date(expiryDateStr);
  expiryDate.setHours(0, 0, 0, 0);
  
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { label: 'Kadaluarsa', class: 'bg-rose-50 text-rose-700 border-rose-100' };
  } else if (diffDays <= 30) {
    return { label: `Hampir Kadaluarsa (${diffDays} Hari)`, class: 'bg-amber-50 text-amber-700 border-amber-100' };
  } else {
    return { label: 'Aman / Baik', class: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  }
}

interface ConsumablesProps {
  consumables: ConsumableItem[];
  onSave: (item: ConsumableItem) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  triggerConfirm: (msg: string, callback: () => void) => void;
  rooms: string[];
}

export default function Consumables({
  consumables,
  onSave,
  onDelete,
  showToast,
  triggerConfirm,
  rooms,
}: ConsumablesProps) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');
  const [keadaanFilter, setKeadaanFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsumableItem | null>(null);

  // Form Fields State
  const [formNama, setFormNama] = useState('');
  const [formMerk, setFormMerk] = useState('');
  const [formJenis, setFormJenis] = useState<'Makanan' | 'Non Makanan'>('Non Makanan');
  const [formJumlah, setFormJumlah] = useState<number>(1);
  const [formKeadaan, setFormKeadaan] = useState<'Baru' | 'Digunakan Sebagian'>('Baru');
  const [formKadaluarsa, setFormKadaluarsa] = useState('');
  const [formRuang, setFormRuang] = useState('');

  // Filter listings
  const filteredList = useMemo(() => {
    return consumables.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.nama.toLowerCase().includes(q) ||
        item.merk.toLowerCase().includes(q) ||
        item.jenis.toLowerCase().includes(q) ||
        (item.ruangan && item.ruangan.toLowerCase().includes(q));

      const matchesJenis = !jenisFilter || item.jenis === jenisFilter;
      const matchesKeadaan = !keadaanFilter || item.keadaan === keadaanFilter;

      let matchesExpiry = true;
      if (expiryFilter) {
        const info = checkExpiryStatus(item.kadaluarsa);
        if (expiryFilter === 'aman') matchesExpiry = info.label === 'Aman / Baik';
        if (expiryFilter === 'hampir') matchesExpiry = info.label.includes('Hampir Kadaluarsa');
        if (expiryFilter === 'kadaluarsa') matchesExpiry = info.label === 'Kadaluarsa';
      }

      return matchesSearch && matchesJenis && matchesKeadaan && matchesExpiry;
    });
  }, [consumables, searchQuery, jenisFilter, keadaanFilter, expiryFilter]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormNama('');
    setFormMerk('');
    setFormJenis('Non Makanan');
    setFormJumlah(1);
    setFormKeadaan('Baru');
    setFormKadaluarsa('');
    setFormRuang(rooms[0] || '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ConsumableItem) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormMerk(item.merk || '');
    setFormJenis(item.jenis);
    setFormJumlah(item.jumlah);
    setFormKeadaan(item.keadaan);
    setFormKadaluarsa(item.kadaluarsa || '');
    setFormRuang(item.ruangan || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNama.trim() || !formMerk.trim() || !formRuang.trim()) {
      showToast('Harap isi semua kolom formulir wajib yang ditandai bintang!', 'error');
      return;
    }

    const itemData: ConsumableItem = {
      id: editingItem ? editingItem.id : 'con-' + Date.now(),
      nama: formNama.trim(),
      merk: formMerk.trim(),
      jenis: formJenis,
      jumlah: formJumlah,
      keadaan: formKeadaan,
      kadaluarsa: formKadaluarsa,
      ruangan: formRuang.trim(),
    };

    onSave(itemData);
    showToast(
      editingItem ? 'Barang Habis Pakai diperbarui!' : 'Barang Habis Pakai ditambahkan!',
      'success'
    );
    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string, name: string) => {
    triggerConfirm(
      `Apakah Anda yakin ingin menghapus Barang Habis Pakai (BHP) "${name}" secara permanen dari sistem?`,
      () => {
        onDelete(id);
        showToast('BHP berhasil dihapus dari sistem', 'success');
      }
    );
  };

  // --- REPORT EXPORTS ---
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      showToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }

    const exportedColumns = filteredList.map((item) => {
      const exp = checkExpiryStatus(item.kadaluarsa);
      return {
        ID: item.id,
        'Nama Barang': item.nama,
        Merk: item.merk || '-',
        'Jenis Barang': item.jenis,
        Jumlah: item.jumlah,
        Keadaan: item.keadaan,
        'Tanggal Kadaluarsa': item.kadaluarsa ? formatIndoDate(item.kadaluarsa) : '-',
        'Status Masa': exp.label,
        Ruangan: item.ruangan || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportedColumns);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Barang Habis Pakai');
    XLSX.writeFile(
      workbook,
      `BHP_InveTrak_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('Berhasil mengekspor data ke Excel!', 'success');
  };

  const handleExportPDF = () => {
    if (filteredList.length === 0) {
      showToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }

    const headers = [['ID', 'Nama Barang', 'Merk', 'Jenis', 'Jumlah', 'Keadaan', 'Tgl Kadaluarsa', 'Ruangan']];
    const dataRows = filteredList.map((item) => [
      item.id,
      item.nama,
      item.merk || '-',
      item.jenis,
      item.jumlah,
      item.keadaan,
      item.kadaluarsa ? formatIndoDate(item.kadaluarsa) : '-',
      item.ruangan || '-',
    ]);

    const title = 'Laporan Barang Habis Pakai (BHP) - InveTrak';
    const fileName = `BHP_InveTrak_${new Date().toISOString().split('T')[0]}.pdf`;

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
      {/* Search & Actions Bar (Bento style) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-xs">
        <div className="flex flex-1 flex-col lg:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama barang, merk, jenis, atau ruangan..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap gap-2">
            <select
              value={jenisFilter}
              onChange={(e) => setJenisFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Jenis</option>
              <option value="Makanan">Makanan</option>
              <option value="Non Makanan">Non Makanan</option>
            </select>

            <select
              value={keadaanFilter}
              onChange={(e) => setKeadaanFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Keadaan</option>
              <option value="Baru">Baru</option>
              <option value="Digunakan Sebagian">Digunakan Sebagian</option>
            </select>

            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Masa Kadaluarsa</option>
              <option value="aman">Aman / Baik</option>
              <option value="hampir">Hampir Kadaluarsa</option>
              <option value="kadaluarsa">Sudah Kadaluarsa</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
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
            <span>Tambah BHP</span>
          </button>
        </div>
      </div>

      {/* Main Table view (Bento Style) */}
      <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Nama Barang</th>
                <th className="px-6 py-4">Merk</th>
                <th className="px-6 py-4">Jenis Barang</th>
                <th className="px-6 py-4 text-center">Jumlah</th>
                <th className="px-6 py-4">Keadaan</th>
                <th className="px-6 py-4">Tgl Kadaluarsa</th>
                <th className="px-6 py-4">Status Masa</th>
                <th className="px-6 py-4">Ruangan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada barang habis pakai yang cocok dengan kriteria pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const expiryInfo = checkExpiryStatus(item.kadaluarsa);
                  const isFood = item.jenis === 'Makanan';
                  
                  let stateClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  if (item.keadaan === 'Digunakan Sebagian') {
                    stateClass = 'bg-amber-50 text-amber-700 border-amber-100';
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
                        {item.merk}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${
                          isFood 
                            ? 'bg-orange-50 border-orange-100 text-orange-700' 
                            : 'bg-blue-50 border-blue-100 text-blue-700'
                        }`}>
                          {item.jenis}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-indigo-600">
                        {item.jumlah}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 border rounded-full text-xs font-semibold ${stateClass}`}>
                          {item.keadaan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-semibold text-xs">
                        {item.kadaluarsa ? (
                          formatIndoDate(item.kadaluarsa)
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 border rounded-full text-xs font-semibold ${expiryInfo.class}`}>
                          {expiryInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]" title={item.ruangan}>
                            {item.ruangan || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit BHP"
                          >
                            <Edit className="w-4.5 h-4.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.nama)}
                            className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus BHP"
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
                  {editingItem ? 'Edit Barang Habis Pakai' : 'Tambah Barang Habis Pakai'}
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
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Nama Barang <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="Contoh: Kertas A4 HVS 80gr"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Merk / Brand <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formMerk}
                      onChange={(e) => setFormMerk(e.target.value)}
                      placeholder="Contoh: PaperOne, Kenko, Aqua"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Jenis Barang <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formJenis}
                      onChange={(e) => setFormJenis(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border-slate-200"
                    >
                      <option value="Makanan">Makanan</option>
                      <option value="Non Makanan">Non Makanan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Jumlah <span className="text-rose-500">*</span>
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
                      Keadaan Barang <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formKeadaan}
                      onChange={(e) => setFormKeadaan(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border-slate-200"
                    >
                      <option value="Baru">Baru</option>
                      <option value="Digunakan Sebagian">Digunakan Sebagian</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tanggal Kadaluarsa (Kosongkan jika tidak ada)
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formKadaluarsa}
                        onChange={(e) => setFormKadaluarsa(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30 block"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
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
                    Simpan BHP
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
