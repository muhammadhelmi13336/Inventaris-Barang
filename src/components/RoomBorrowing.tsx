import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Trash2, 
  X,
  Edit,
  SlidersHorizontal,
  Home,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2
} from 'lucide-react';
import { PeminjamanRuangan } from '../types';
import { formatIndoDate } from '../utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RoomBorrowingProps {
  roomBorrowings: PeminjamanRuangan[];
  onSave: (item: PeminjamanRuangan) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  triggerConfirm: (msg: string, callback: () => void) => void;
  rooms: string[];
  onAddRoom: (room: string) => boolean;
  onDeleteRoom: (room: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function RoomBorrowing({
  roomBorrowings,
  onSave,
  onDelete,
  showToast,
  triggerConfirm,
  rooms,
  onAddRoom,
  onDeleteRoom
}: RoomBorrowingProps) {
  // Query & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('');

  // Modals state
  const [isOpenFormModal, setIsOpenFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PeminjamanRuangan | null>(null);

  // Add Room modal state
  const [isOpenAddRoomModal, setIsOpenAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  // Form states
  const [formPeminjam, setFormPeminjam] = useState('');
  const [formKeperluan, setFormKeperluan] = useState('');
  const [formRoom, setFormRoom] = useState(rooms[0] || '');
  const [formPeserta, setFormPeserta] = useState<number | ''>('');
  const [formTglMulai, setFormTglMulai] = useState('');
  const [formTglSelesai, setFormTglSelesai] = useState('');
  const [formJamMulai, setFormJamMulai] = useState('');
  const [formJamSelesai, setFormJamSelesai] = useState('');

  // --- CALENDAR STATE & HELPERS ---
  const [viewMode, setViewMode] = useState<'calendar' | 'card'>('calendar');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(() => {
    // If we're around 2026-06, we set it, otherwise standard current Date
    const mockDate = new Date('2026-06-02T04:59:36Z');
    const today = new Date();
    // Default to the mock calendar date context if the system aligns, or simply today
    if (today.getFullYear() === 2026 && today.getMonth() === 5) {
      return today;
    }
    return mockDate;
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const today = new Date();
    if (today.getFullYear() === 2026 && today.getMonth() === 5) {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '2026-06-02';
  });

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const formatDateToString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const calendarDays = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    const cells: { date: Date; isCurrentMonth: boolean; isToday: boolean; dateString: string }[] = [];

    // Mon = 1, Tue = 2, ..., Sun = 0.
    // We want Monday-start grid: Mon (1), Tue (2), ..., Sun (7 / offset calculation)
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = offset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, new Date()),
        dateString: formatDateToString(d),
      });
    }

    // Current month days
    const currentMonthDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthDays; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        isCurrentMonth: true,
        isToday: isSameDay(d, new Date()),
        dateString: formatDateToString(d),
      });
    }

    // Next month padding to complete 42 cells matrix (6 rows of 7 days)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, new Date()),
        dateString: formatDateToString(d),
      });
    }

    return cells;
  }, [currentCalendarMonth]);

  const handlePrevMonth = () => {
    setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedCalendarDate(`${y}-${m}-${d}`);
  };

  // Get active reservations on the selected date (combining current selectedRoomFilter and search queries)
  const selectedDateReservations = useMemo(() => {
    return roomBorrowings.filter((b) => {
      const isActiveOnDate = selectedCalendarDate >= b.tanggalMulai && selectedCalendarDate <= b.tanggalSelesai;
      const matchesRoom = selectedRoomFilter ? b.namaRuangan === selectedRoomFilter : true;
      const matchesSearch = searchQuery ? (
        b.namaPeminjam.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.keperluan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.namaRuangan.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;

      return isActiveOnDate && matchesRoom && matchesSearch;
    });
  }, [roomBorrowings, selectedCalendarDate, selectedRoomFilter, searchQuery]);

  const handleQuickBookOnSelectedDate = () => {
    setEditingItem(null);
    setFormPeminjam('');
    setFormKeperluan('');
    setFormRoom(selectedRoomFilter || rooms[0] || '');
    setFormPeserta('');
    setFormTglMulai(selectedCalendarDate);
    setFormTglSelesai(selectedCalendarDate);
    setFormJamMulai('');
    setFormJamSelesai('');
    setIsOpenFormModal(true);
  };

  // Filter listings
  const filteredList = useMemo(() => {
    return roomBorrowings.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.namaPeminjam.toLowerCase().includes(q) ||
        item.keperluan.toLowerCase().includes(q) ||
        item.namaRuangan.toLowerCase().includes(q);

      const matchesRoom = selectedRoomFilter ? item.namaRuangan === selectedRoomFilter : true;

      return matchesSearch && matchesRoom;
    });
  }, [roomBorrowings, searchQuery, selectedRoomFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = roomBorrowings.length;
    const totalPeserta = roomBorrowings.reduce((sum, b) => sum + (Number(b.jumlahPeserta) || 0), 0);
    const uniqueRooms = new Set(roomBorrowings.map((b) => b.namaRuangan)).size;
    return { total, totalPeserta, uniqueRooms };
  }, [roomBorrowings]);

  // Handle open modal for creation
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormPeminjam('');
    setFormKeperluan('');
    setFormRoom(rooms[0] || '');
    setFormPeserta('');
    setFormTglMulai('');
    setFormTglSelesai('');
    setFormJamMulai('');
    setFormJamSelesai('');
    setIsOpenFormModal(true);
  };

  // Handle edit item modal
  const handleOpenEdit = (item: PeminjamanRuangan) => {
    setEditingItem(item);
    setFormPeminjam(item.namaPeminjam);
    setFormKeperluan(item.keperluan);
    setFormRoom(item.namaRuangan);
    setFormPeserta(item.jumlahPeserta);
    setFormTglMulai(item.tanggalMulai);
    setFormTglSelesai(item.tanggalSelesai);
    setFormJamMulai(item.jamMulai);
    setFormJamSelesai(item.jamSelesai);
    setIsOpenFormModal(true);
  };

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoomName.trim();
    if (!trimmed) {
      showToast('Nama ruangan tidak boleh kosong!', 'error');
      return;
    }
    const success = onAddRoom(trimmed);
    if (success) {
      setFormRoom(trimmed);
      setNewRoomName('');
      setIsOpenAddRoomModal(false);
    }
  };

  // Submit handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPeminjam.trim()) {
      showToast('Nama peminjam harus diisi!', 'error');
      return;
    }
    if (!formKeperluan.trim()) {
      showToast('Keperluan acara harus diisi!', 'error');
      return;
    }
    const peserta = Number(formPeserta);
    if (isNaN(peserta) || peserta < 1) {
      showToast('Jumlah peserta harus minimal 1 orang!', 'error');
      return;
    }
    if (!formTglMulai) {
      showToast('Tanggal peminjaman harus ditentukan!', 'error');
      return;
    }
    if (!formTglSelesai) {
      showToast('Tanggal selesai acara harus ditentukan!', 'error');
      return;
    }
    if (new Date(formTglMulai) > new Date(formTglSelesai)) {
      showToast('Tanggal selesai tidak boleh sebelum tanggal peminjaman!', 'error');
      return;
    }
    if (!formJamMulai || !formJamSelesai) {
      showToast('Jam pelaksanaan dan jam selesai acara harus diisi!', 'error');
      return;
    }

    const payload: PeminjamanRuangan = {
      id: editingItem ? editingItem.id : 'room-reservation-' + Date.now(),
      namaPeminjam: formPeminjam,
      keperluan: formKeperluan,
      jumlahPeserta: peserta,
      tanggalMulai: formTglMulai,
      tanggalSelesai: formTglSelesai,
      jamMulai: formJamMulai,
      jamSelesai: formJamSelesai,
      namaRuangan: formRoom
    };

    onSave(payload);
    setIsOpenFormModal(false);
    showToast(editingItem ? 'Peminjaman ruangan berhasil diperbarui!' : 'Peminjaman ruangan baru sukses dijadwalkan!', 'success');
  };

  // Export Excel
  const handleExportExcel = () => {
    if (roomBorrowings.length === 0) {
      showToast('Tidak ada data peminjaman ruangan untuk diekspor!', 'warning');
      return;
    }

    const reportData = roomBorrowings.map((b) => ({
      'ID Booking': b.id,
      'Nama Peminjam': b.namaPeminjam,
      'Ruangan': b.namaRuangan,
      'Keperluan': b.keperluan,
      'Jumlah Peserta': `${b.jumlahPeserta} Orang`,
      'Tanggal Peminjaman': b.tanggalMulai,
      'Tanggal Selesai': b.tanggalSelesai,
      'Jam Pelaksanaan': `${b.jamMulai} - ${b.jamSelesai}`
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peminjaman Ruangan');
    XLSX.writeFile(wb, `InveTrak_Laporan_Peminjaman_Ruangan_${new Date().toISOString().substring(0, 10)}.xlsx`);
    showToast('Laporan Excel berhasil diunduh!', 'success');
  };

  // Export PDF
  const handleExportPDF = () => {
    if (roomBorrowings.length === 0) {
      showToast('Tidak ada data peminjaman ruangan untuk diekspor!', 'warning');
      return;
    }

    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Laporan Peminjaman & Reservasi Ruangan - InveTrak', 14, 15);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    const headers = [['Nama Peminjam', 'Ruangan', 'Keperluan', 'Peserta', 'Tanggal', 'Jam']];
    const data = roomBorrowings.map((b) => [
      b.namaPeminjam,
      b.namaRuangan,
      b.keperluan,
      `${b.jumlahPeserta} Orang`,
      b.tanggalMulai === b.tanggalSelesai ? b.tanggalMulai : `${b.tanggalMulai}\ns.d.${b.tanggalSelesai}`,
      `${b.jamMulai} - ${b.jamSelesai}`
    ]);

    autoTable(doc, {
      startY: 28,
      head: headers,
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
      columnStyles: {
        2: { cellWidth: 50 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 }
      }
    });

    doc.save(`InveTrak_Laporan_Peminjaman_Ruangan_${new Date().toISOString().substring(0, 10)}.pdf`);
    showToast('Laporan PDF berhasil diunduh!', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Bento Box Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Total Peminjaman</span>
            <span className="text-3xl font-extrabold text-slate-800">{stats.total}</span>
          </div>
        </div>

        <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-lg shadow-indigo-100 flex items-center gap-4 hover:scale-[1.01] transition-all relative overflow-hidden">
          <div className="p-3.5 bg-white/10 text-white rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-indigo-150 font-bold uppercase tracking-widest block">Total Peserta Terdaftar</span>
            <span className="text-3xl font-extrabold text-white">{stats.totalPeserta} <span className="text-xs font-normal text-indigo-200">Orang</span></span>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-md flex items-center gap-4 hover:scale-[1.01] transition-all">
          <div className="p-3.5 bg-emerald-500/20 text-emerald-300 rounded-2xl">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Ruangan Unik Dipakai</span>
            <span className="text-3xl font-extrabold text-emerald-400">{stats.uniqueRooms} <span className="text-xs font-normal text-slate-400">Ruang</span></span>
          </div>
        </div>
      </div>

      {/* Control Actions & Search Bar (Bento style) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-xs">
        <div className="flex flex-1 flex-col lg:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama peminjam, keperluan atau nama ruangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-semibold text-slate-800 transition-all outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Room Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-600 outline-none cursor-pointer pr-4 focus:ring-0"
              >
                <option value="">Semua Ruangan</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100/40'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Kalender</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100/40'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Daftar Kartu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global actions: Add & Exports */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-2xl font-bold text-xs transition-all cursor-pointer"
            title="Download laporan excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50 rounded-2xl font-bold text-xs transition-all cursor-pointer"
            title="Download laporan PDF"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpenAddRoomModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200/90 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-500" />
            <span>Kelola Ruangan</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs transition-all shadow-lg hover:shadow-indigo-200 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Pinjam Ruangan</span>
          </button>
        </div>
      </div>

      {/* Grid listing and list views or Calendar view based on viewMode */}
      {viewMode === 'card' ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredList.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 bg-white border border-slate-200/80 rounded-[2rem] flex flex-col items-center justify-center gap-3">
              <Home className="w-12 h-12 text-slate-300" />
              <p className="font-bold">Tidak ada agenda peminjaman ruangan yang cocok.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedRoomFilter(''); }}
                className="text-indigo-600 font-bold text-xs hover:underline cursor-pointer"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            filteredList.map((reserve) => {
              return (
                <motion.div
                  key={reserve.id}
                  variants={itemVariants}
                  className="bg-white rounded-[2rem] border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative text-left"
                >
                  <div>
                    {/* Card Header (Visible Actions) */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <MapPin className="w-4.5 h-4.5 shrink-0" />
                        <span className="text-xs font-extrabold uppercase tracking-wider leading-none">
                          {reserve.namaRuangan}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(reserve)}
                          className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg border border-slate-200 hover:border-indigo-100 transition-colors cursor-pointer"
                          title="Edit peminjaman"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerConfirm(
                              `Apakah Anda sangat yakin ingin menghapus reservasi ruangan "${reserve.namaRuangan}" oleh ${reserve.namaPeminjam}?`,
                              () => onDelete(reserve.id)
                            );
                          }}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200/55 transition-colors cursor-pointer"
                          title="Hapus peminjaman"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Borrower name */}
                    <h3 className="font-extrabold text-slate-950 text-xl tracking-tight leading-snug mb-1">
                      {reserve.namaPeminjam}
                    </h3>

                    {/* Purpose */}
                    <p className="text-slate-500 font-medium text-xs mb-4 line-clamp-2 leading-relaxed">
                      {reserve.keperluan}
                    </p>

                    <div className="space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 font-semibold">
                      {/* Participant quantity */}
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{reserve.jumlahPeserta} Peserta / Hadirin</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-start gap-2.5">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          {reserve.tanggalMulai === reserve.tanggalSelesai ? (
                            <span className="text-slate-800 font-bold">{formatIndoDate(reserve.tanggalMulai)}</span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[10px] uppercase font-bold text-indigo-500 leading-none">Tanggal Pelaksanaan</span>
                              <span className="text-slate-800 font-bold mt-0.5">
                                {formatIndoDate(reserve.tanggalMulai)} s.d.
                              </span>
                              <span className="text-slate-800 font-bold">
                                {formatIndoDate(reserve.tanggalSelesai)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-800 font-bold">Waktu: {reserve.jamMulai} - {reserve.jamSelesai} WIB</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom ID label */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>ID: {reserve.id}</span>
                    <div className="flex items-center gap-2">
                      {reserve.status === 'Selesai' ? (
                        <span className="font-sans uppercase text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg tracking-wider">✔ Selesai</span>
                      ) : (
                        <>
                          <span className="font-sans uppercase text-[9px] font-bold text-slate-400 tracking-wider">Terbuka / Aktif</span>
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm(
                                `Apakah Anda yakin ingin menyatakan peminjaman ruangan "${reserve.namaRuangan}" oleh ${reserve.namaPeminjam} ini sudah selesai digunakan?`,
                                () => {
                                  onSave({ ...reserve, status: 'Selesai' });
                                  showToast('Peminjaman ruangan berhasil ditandai selesai!', 'success');
                                }
                              );
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200/50 text-[9px] font-extrabold uppercase transition-colors cursor-pointer"
                            title="Tandai Selesai"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Selesai</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      ) : (
        /* Calendar view grid container */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-none">
          {/* Calendar Plate container (Left columns) */}
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              {/* Calendar Control bar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-950 text-lg tracking-tight leading-none mb-0.5">
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][currentCalendarMonth.getMonth()]} {currentCalendarMonth.getFullYear()}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">Kalender Reservasi</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Hari Ini
                  </button>
                  <div className="flex border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="Bulan sebelumnya"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="Bulan berikutnya"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Day Labels bar */}
              <div className="grid grid-cols-7 gap-1.5 mb-2.5">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((lbl) => (
                  <div 
                    key={lbl} 
                    className={`text-center text-[10px] font-extrabold py-1 uppercase tracking-widest ${
                      lbl === 'Min' ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {lbl}
                  </div>
                ))}
              </div>

              {/* Grid matrix Cells */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell) => {
                  const isSelected = selectedCalendarDate === cell.dateString;
                  const dayReservations = roomBorrowings.filter((b) => {
                    // Filter match
                    if (selectedRoomFilter && b.namaRuangan !== selectedRoomFilter) return false;
                    return cell.dateString >= b.tanggalMulai && cell.dateString <= b.tanggalSelesai;
                  });

                  return (
                    <div
                      key={cell.dateString}
                      onClick={() => setSelectedCalendarDate(cell.dateString)}
                      className={`min-h-[85px] sm:min-h-[105px] p-2 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all relative text-left select-none ${
                        cell.isCurrentMonth
                          ? 'bg-white border-slate-150 hover:border-slate-250'
                          : 'bg-slate-50/50 border-slate-100 text-slate-350'
                      } ${
                        isSelected
                          ? 'ring-2 ring-indigo-600 border-transparent bg-indigo-50/10'
                          : ''
                      }`}
                    >
                      {/* Cell Day Header */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold leading-none p-1 rounded-full ${
                          cell.isToday
                            ? 'bg-indigo-600 text-white w-5 h-5 flex items-center justify-center font-black shadow-md shadow-indigo-150'
                            : isSelected 
                              ? 'text-indigo-600 font-extrabold scale-105' 
                              : cell.isCurrentMonth 
                                ? 'text-slate-800' 
                                : 'text-slate-400'
                        }`}>
                          {cell.date.getDate()}
                        </span>

                        {/* Event count counter dot for mobile view */}
                        {dayReservations.length > 0 && (
                          <div className="md:hidden w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0"></div>
                        )}
                      </div>

                      {/* Desktop Event Pills */}
                      <div className="mt-1.5 w-full flex-1 flex flex-col justify-end overflow-hidden space-y-0.5">
                        {dayReservations.slice(0, 2).map((res) => (
                          <div
                            key={res.id}
                            className="hidden md:block truncate text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 leading-tight w-full hover:bg-indigo-100 transition-colors"
                            title={`${res.namaPeminjam}: ${res.keperluan}`}
                          >
                            {res.namaRuangan}
                          </div>
                        ))}
                        {dayReservations.length > 2 && (
                          <div className="hidden md:block text-[8px] font-black text-slate-400 pl-1">
                            +{dayReservations.length - 2} acara lagi
                          </div>
                        )}

                        {/* Multi-dots on mobile */}
                        <div className="flex gap-0.5 justify-center mt-1 md:hidden">
                          {dayReservations.slice(0, 3).map((res) => (
                            <span key={res.id} className="w-1 h-1 rounded-full bg-indigo-500"></span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom visual guide info */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-500 gap-3">
              <span className="font-semibold text-slate-400">
                Pilih tanggal pada kalender untuk melihat kegiatan di panel sebelah kanan.
              </span>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full inline-block"></span>
                  <span className="font-bold text-slate-600">Hari Ini</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-50 rounded-sm inline-block border border-indigo-200"></span>
                  <span className="font-bold text-slate-600">Terisi / Terjadwal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar schedule block details */}
          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-md flex flex-col justify-between">
            <div className="space-y-5">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block mb-0.5">Keterpakaian Ruangan</span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <h4 className="text-base font-extrabold text-white truncate">
                    {formatIndoDate(selectedCalendarDate)}
                  </h4>
                  <span className="px-2.5 py-1 bg-white/10 rounded-xl text-[10px] font-black text-indigo-300 uppercase shrink-0">
                    {selectedDateReservations.length} Jadwal
                  </span>
                </div>
              </div>

              {selectedDateReservations.length === 0 ? (
                <div className="py-12 px-2 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-white/5 text-slate-400 rounded-full flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-indigo-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">Semua Ruangan Tersedia</p>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xs">
                    Tidak ada benturan koordinasi / booking pada tanggal ini. Seluruh ruangan kosong dan terdaftar sebagai siap didelegasikan.
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickBookOnSelectedDate}
                    className="mt-3 text-xs font-bold bg-indigo-650 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl border border-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pinjam Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                  {selectedDateReservations.map((reserve) => (
                    <div
                      key={reserve.id}
                      className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 relative text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider shrink-0">
                            {reserve.namaRuangan}
                          </div>
                          {reserve.status === 'Selesai' && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20 leading-none">
                              ✔ Selesai
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {reserve.status !== 'Selesai' && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerConfirm(
                                  `Apakah Anda yakin ingin menyatakan peminjaman ruangan "${reserve.namaRuangan}" oleh ${reserve.namaPeminjam} ini sudah selesai digunakan?`,
                                  () => {
                                    onSave({ ...reserve, status: 'Selesai' });
                                    showToast('Peminjaman ruangan berhasil ditandai selesai!', 'success');
                                  }
                                );
                              }}
                              className="p-1 px-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-emerald-200 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                              title="Tandai Selesai"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(reserve)}
                            className="p-1 px-1.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-md border border-white/10 transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm(
                                `Apakah Anda sangat yakin ingin menghapus reservasi ruangan "${reserve.namaRuangan}" oleh ${reserve.namaPeminjam}?`,
                                () => onDelete(reserve.id)
                              );
                            }}
                            className="p-1 px-1.5 bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 hover:text-rose-200 rounded-md border border-rose-500/30 transition-all cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-extrabold text-white text-sm tracking-tight truncate leading-tight">
                          {reserve.namaPeminjam}
                        </h5>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2 mt-1">
                          {reserve.keperluan}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/5 pt-2.5 text-[10px] font-semibold text-slate-300">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-300" />
                          <span>Pukul: {reserve.jamMulai} - {reserve.jamSelesai} WIB</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-indigo-300" />
                          <span>{reserve.jumlahPeserta} Peserta</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDateReservations.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={handleQuickBookOnSelectedDate}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs transition-all cursor-pointer shadow-md shadow-indigo-950/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Pinjam Ruangan Lain</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Form Dialog Modal Overlay */}
      <AnimatePresence>
        {isOpenFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop slide-fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpenFormModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            ></motion.div>

            {/* Modal Body Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white rounded-[2.5rem] border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden z-10 flex flex-col max-h-[90vh] text-left"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-800 text-lg">
                  {editingItem ? 'Edit Agenda Peminjaman Ruangan' : 'Buat Agenda Peminjaman Ruangan'}
                </h3>
                <button
                  onClick={() => setIsOpenFormModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 shrink-0" />
                </button>
              </div>

              {/* Form Content body container */}
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar">
                
                {/* Borrower details */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Nama Peminjam / Penanggung Jawab *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Ibu/Bapak Peminjam Ruangan..."
                    value={formPeminjam}
                    onChange={(e) => setFormPeminjam(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Purpose details */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Keperluan Acara / Deskripsi Kegiatan *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Contoh: Rapat Koordinasi Anggaran Bulanan atau Workshop Programming..."
                    value={formKeperluan}
                    onChange={(e) => setFormKeperluan(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Predefined rooms & Participant counts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Pilihan Ruangan *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsOpenAddRoomModal(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Tambah Baru
                      </button>
                    </div>
                    <select
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      {rooms.map((room) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Jumlah Peserta (Orang) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Contoh: 15"
                      value={formPeserta}
                      onChange={(e) => setFormPeserta(e.target.value !== '' ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Dates Selection block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Tanggal Peminjaman *
                    </label>
                    <input
                      type="date"
                      required
                      value={formTglMulai}
                      onChange={(e) => setFormTglMulai(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer animate-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Tanggal Selesai Acara *
                    </label>
                    <input
                      type="date"
                      required
                      value={formTglSelesai}
                      onChange={(e) => setFormTglSelesai(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer animate-none"
                    />
                  </div>
                </div>

                {/* Time Pelaksanaan Acara Selection block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Jam Pelaksanaan Acara *
                    </label>
                    <input
                      type="time"
                      required
                      value={formJamMulai}
                      onChange={(e) => setFormJamMulai(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer animate-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Jam Selesai Acara *
                    </label>
                    <input
                      type="time"
                      required
                      value={formJamSelesai}
                      onChange={(e) => setFormJamSelesai(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer animate-none"
                    />
                  </div>
                </div>

                {/* Warning details on status */}
                <div className="flex gap-2 p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl text-[11px] text-slate-600 font-medium">
                  <AlertTriangle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    Pastikan jadwal yang dimasukkan telah dikoordinasikan secara internal untuk meminimalkan benturan peminjaman antar-staf / guru pada ruangan yang sama.
                  </span>
                </div>

                {/* Actions container footer */}
                <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3 shrink-0 col-span-2">
                  <button
                    type="button"
                    onClick={() => setIsOpenFormModal(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batalkan
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 cursor-pointer"
                  >
                    {editingItem ? 'Simpan Perubahan' : 'Jadwalkan Sekarang'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tambah Ruangan Dialog Modal Overlay */}
      <AnimatePresence>
        {isOpenAddRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop slide-fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpenAddRoomModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            ></motion.div>

            {/* Modal Body Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white rounded-[2rem] border border-slate-200 shadow-xl w-full max-w-md overflow-hidden z-20 flex flex-col text-left"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Home className="w-5 h-5 text-indigo-500" />
                  <span>Kelola Ruangan</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpenAddRoomModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 shrink-0" />
                </button>
              </div>

              {/* Form & List Container */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                {/* Form Content */}
                <form onSubmit={handleAddRoomSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Tambah Ruangan Baru
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Lab Kimia Terintegrasi..."
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Registered Rooms List */}
                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Daftar Ruangan Terdaftar ({rooms.length})
                  </label>
                  
                  {rooms.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada ruangan terdaftar.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                      {rooms.map((room) => (
                        <div 
                          key={room} 
                          className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-150 text-slate-700 text-sm font-medium hover:border-slate-300 transition-all shadow-xs"
                        >
                          <span className="truncate pr-2">{room}</span>
                          <button
                            type="button"
                            onClick={() => onDeleteRoom(room)}
                            className="p-1 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                            title={`Hapus ${room}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Hapus</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsOpenAddRoomModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
