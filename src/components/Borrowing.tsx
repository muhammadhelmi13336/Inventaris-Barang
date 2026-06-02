import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  History, 
  CheckCircle, 
  Trash2, 
  X,
  FileDown,
  Boxes,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  SlidersHorizontal,
  Clock,
  Users
} from 'lucide-react';
import { BorrowingTransaction, InventoryItem, BorrowedItem, TabId } from '../types';
import { formatIndoDate } from '../utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BorrowingProps {
  inventory: InventoryItem[];
  borrowings: BorrowingTransaction[];
  onSaveBorrowing: (newBorrow: BorrowingTransaction) => void;
  onReturnProcess: (borrowId: string, itemUpdates: BorrowedItem[]) => void;
  onDeleteBorrowing: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  triggerConfirm: (msg: string, callback: () => void) => void;
}

export default function Borrowing({
  inventory,
  borrowings,
  onSaveBorrowing,
  onReturnProcess,
  onDeleteBorrowing,
  showToast,
  triggerConfirm,
}: BorrowingProps) {
  // Search and month/year filters
  const [searchQuery, setSearchQuery] = useState('');
  const [bulanFilter, setBulanFilter] = useState('');
  const [tahunFilter, setTahunFilter] = useState('');

  // --- CALENDAR STATE & HELPERS ---
  const [viewMode, setViewMode] = useState<'calendar' | 'card'>('calendar');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(() => {
    const mockDate = new Date('2026-06-02T04:59:36Z');
    const today = new Date();
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

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

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

  const selectedDateReservations = useMemo(() => {
    return borrowings.filter((b) => {
      const isActiveOnDate = selectedCalendarDate >= b.tanggalPinjam && selectedCalendarDate <= b.tanggalKembali;
      
      const toolsString = b.items
        .map((it) => {
          const matched = inventory.find((inv) => inv.id === it.alatId);
          return matched ? matched.nama.toLowerCase() : '';
        })
        .join(' ');

      const q = searchQuery.toLowerCase();
      const matchesSearch = q ? (
        b.namaPeminjam.toLowerCase().includes(q) ||
        b.keperluan.toLowerCase().includes(q) ||
        b.ruangan.toLowerCase().includes(q) ||
        toolsString.includes(q)
      ) : true;

      return isActiveOnDate && matchesSearch;
    });
  }, [borrowings, selectedCalendarDate, inventory, searchQuery]);

  const handleQuickBookOnSelectedDate = () => {
    setFormPeminjam('');
    setFormKeperluan('');
    setFormTglPinjam(selectedCalendarDate);
    setFormTglKembali(selectedCalendarDate);
    setDraftItems([]);
    setSelectedAlatId('');
    setFormTempJumlah('');
    setIsBorrowModalOpen(true);
  };

  // Modals state
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // New Borrowing form fields
  const [formPeminjam, setFormPeminjam] = useState('');
  const [formKeperluan, setFormKeperluan] = useState('');
  const [formTglPinjam, setFormTglPinjam] = useState('');
  const [formTglKembali, setFormTglKembali] = useState('');

  // Temporary item builder for draft items
  const [selectedAlatId, setSelectedAlatId] = useState('');
  const [formTempJumlah, setFormTempJumlah] = useState<number | ''>('');
  const [draftItems, setDraftItems] = useState<BorrowedItem[]>([]);

  // Return process state
  const [selectedBorrowingForReturn, setSelectedBorrowingForReturn] = useState<BorrowingTransaction | null>(null);
  const [returnFormChecked, setReturnFormChecked] = useState<boolean[]>([]);
  const [returnFormConditions, setReturnFormConditions] = useState<('Lengkap' | 'Rusak' | 'Tidak Lengkap')[]>([]);

  // List of active equipment from inventory (not heavily damaged)
  const availableEquipmentOptions = useMemo(() => {
    return inventory.filter((item) => item.keadaan !== 'Rusak Berat');
  }, [inventory]);

  // Combined room location based on drafted items
  const formRuangGabungan = useMemo(() => {
    if (draftItems.length === 0) return '';
    const roomsSet = new Set<string>();
    draftItems.forEach((it) => {
      const match = inventory.find((inv) => inv.id === it.alatId);
      if (match) roomsSet.add(match.ruangan);
    });
    return Array.from(roomsSet).join(' & ');
  }, [draftItems, inventory]);

  // Filter listings
  const filteredList = useMemo(() => {
    return borrowings.filter((bor) => {
      // Find tool names borrowed
      const toolsString = bor.items
        .map((it) => {
          const matched = inventory.find((inv) => inv.id === it.alatId);
          return matched ? matched.nama.toLowerCase() : '';
        })
        .join(' ');

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        bor.namaPeminjam.toLowerCase().includes(q) ||
        bor.keperluan.toLowerCase().includes(q) ||
        bor.ruangan.toLowerCase().includes(q) ||
        toolsString.includes(q);

      let matchesBulan = true;
      let matchesTahun = true;

      if (bor.tanggalPinjam) {
        const parts = bor.tanggalPinjam.split('-'); // format YYYY-MM-DD
        if (parts.length === 3) {
          if (bulanFilter) {
            matchesBulan = parts[1] === bulanFilter;
          }
          if (tahunFilter) {
            matchesTahun = parts[0] === tahunFilter;
          }
        }
      }

      return matchesSearch && matchesBulan && matchesTahun;
    });
  }, [borrowings, inventory, searchQuery, bulanFilter, tahunFilter]);

  // --- DRAFT ITEMS BUILDER OPERATIONS ---
  const handleAddToolToDraft = () => {
    if (!selectedAlatId) {
      showToast('Silakan pilih alat terlebih dahulu!', 'error');
      return;
    }
    const jumlah = parseInt(formTempJumlah as any);
    if (!jumlah || jumlah < 1) {
      showToast('Jumlah alat harus bernilai minimal 1!', 'error');
      return;
    }

    const originalAlat = inventory.find((i) => i.id === selectedAlatId);
    if (!originalAlat) return;

    const existingInDraft = draftItems.find((it) => it.alatId === selectedAlatId);
    const draftQty = existingInDraft ? existingInDraft.jumlah : 0;
    const totalRequested = draftQty + jumlah;

    if (originalAlat.jumlah < totalRequested) {
      showToast(
        `Stok tidak mencukupi! Tersedia ${originalAlat.jumlah} unit, Anda telah meminta total ${totalRequested} unit di draf.`,
        'error'
      );
      return;
    }

    if (existingInDraft) {
      setDraftItems(
        draftItems.map((it) =>
          it.alatId === selectedAlatId ? { ...it, jumlah: totalRequested } : it
        )
      );
    } else {
      setDraftItems([
        ...draftItems,
        {
          alatId: selectedAlatId,
          jumlah: jumlah,
          returned: false,
          returnCondition: 'Lengkap',
        },
      ]);
    }

    // Reset temporary states
    setSelectedAlatId('');
    setFormTempJumlah('');
  };

  const handleRemoveFromDraft = (alatId: string) => {
    setDraftItems(draftItems.filter((it) => it.alatId !== alatId));
  };

  // --- SAVE BORROWING ACTION ---
  const handleOpenBorrowModal = () => {
    setFormPeminjam('');
    setFormKeperluan('');
    setFormTglPinjam(new Date().toISOString().split('T')[0]);
    setFormTglKembali('');
    setDraftItems([]);
    setSelectedAlatId('');
    setFormTempJumlah('');
    setIsBorrowModalOpen(true);
  };

  const handleSaveBorrowingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPeminjam.trim() || !formKeperluan.trim() || !formTglPinjam || !formTglKembali) {
      showToast('Harap lengkapi seluruh isian formulir peminjaman!', 'error');
      return;
    }

    if (draftItems.length === 0) {
      showToast('Harap tambahkan minimal 1 alat kerja ke dalam daftar peminjaman!', 'error');
      return;
    }

    // Perform final check of inventory stocks
    for (const dItem of draftItems) {
      const orig = inventory.find((i) => i.id === dItem.alatId);
      if (!orig || orig.jumlah < dItem.jumlah) {
        showToast(
          `Gagal: Stok untuk alat "${orig ? orig.nama : 'tidak dikenal'}" tiba-tiba tidak mencukupi!`,
          'error'
        );
        return;
      }
    }

    const newTransaction: BorrowingTransaction = {
      id: 'bor-' + Date.now(),
      namaPeminjam: formPeminjam.trim(),
      keperluan: formKeperluan.trim(),
      tanggalPinjam: formTglPinjam,
      tanggalKembali: formTglKembali,
      status: 'Dipinjam',
      ruangan: formRuangGabungan,
      items: draftItems,
    };

    onSaveBorrowing(newTransaction);
    showToast('Peminjaman multi-alat berhasil dijadwalkan!', 'success');
    setIsBorrowModalOpen(false);
  };

  // --- RETURN MODAL PROCESS ACTIONS ---
  const handleOpenReturnModal = (bor: BorrowingTransaction) => {
    setSelectedBorrowingForReturn(bor);
    // Initialize checkboxes for unticked items
    setReturnFormChecked(bor.items.map((it) => it.returned));
    setReturnFormConditions(bor.items.map((it) => it.returnCondition || 'Lengkap'));
    setIsReturnModalOpen(true);
  };

  const handleToggleReturnFormCheck = (idx: number) => {
    const origReturnState = selectedBorrowingForReturn?.items[idx].returned;
    if (origReturnState) return; // cannot untick what was previously locked inside storage

    const nextC = [...returnFormChecked];
    nextC[idx] = !nextC[idx];
    setReturnFormChecked(nextC);
  };

  const handleReturnFormConditionChange = (idx: number, cond: 'Lengkap' | 'Rusak' | 'Tidak Lengkap') => {
    const nextConds = [...returnFormConditions];
    nextConds[idx] = cond;
    setReturnFormConditions(nextConds);
  };

  const handleSaveReturnProcess = () => {
    if (!selectedBorrowingForReturn) return;

    const currentItems = selectedBorrowingForReturn.items;
    let anyNewReturns = false;

    const nextItems: BorrowedItem[] = currentItems.map((item, idx) => {
      const checkState = returnFormChecked[idx];
      const selectedCond = returnFormConditions[idx];

      // If it is newly checked
      if (checkState && !item.returned) {
        anyNewReturns = true;
        return {
          ...item,
          returned: true,
          returnCondition: selectedCond,
        };
      }
      return item;
    });

    if (!anyNewReturns) {
      showToast('Tidak ada aset baru yang dicentang kembali!', 'error');
      return;
    }

    onReturnProcess(selectedBorrowingForReturn.id, nextItems);
    setIsReturnModalOpen(false);
  };

  // --- DELETE TRANSACTION ---
  const handleDeleteBorrowing = (id: string, name: string) => {
    triggerConfirm(
      `Apakah Anda ingin menghapus transaksi peminjaman atas nama "${name}"? Ini akan mengembalikan sisa alat yang belum dikembalikan ke stok.`,
      () => {
        onDeleteBorrowing(id);
        showToast('Transaksi peminjaman berhasil dihapus.', 'success');
      }
    );
  };

  // --- REPORT EXPORTS ---
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      showToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }

    const exportedColumns = filteredList.map((bor) => {
      const itemSummaries = bor.items
        .map((it) => {
          const matched = inventory.find((inv) => inv.id === it.alatId);
          const name = matched ? matched.nama : 'Alat tidak dikenal';
          const rets = it.returned ? `(Kembali - ${it.returnCondition})` : '(Dipinjam)';
          return `${name} [x${it.jumlah}] ${rets}`;
        })
        .join(', ');

      return {
        ID: bor.id,
        'Nama Peminjam': bor.namaPeminjam,
        Keperluan: bor.keperluan,
        'Daftar Alat (Qty & Status)': itemSummaries,
        Status: bor.status,
        Lokasi: bor.ruangan,
        'Tanggal Pinjam': formatIndoDate(bor.tanggalPinjam),
        'Tanggal Kembali': formatIndoDate(bor.tanggalKembali),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportedColumns);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Peminjaman Alat');
    XLSX.writeFile(
      workbook,
      `Peminjaman_InveTrak_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('Berhasil mengekspor data ke Excel!', 'success');
  };

  const handleExportPDF = () => {
    if (filteredList.length === 0) {
      showToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }

    const headers = [['ID', 'Nama Peminjam', 'Keperluan', 'Alat Dipinjam', 'Status', 'Lokasi', 'Tgl Pinjam', 'Tgl Kembali']];
    const dataRows = filteredList.map((bor) => {
      const itemSummaries = bor.items
        .map((it) => {
          const matched = inventory.find((inv) => inv.id === it.alatId);
          const name = matched ? matched.nama : 'Alat';
          const stat = it.returned ? `(K-${it.returnCondition.charAt(0)})` : '(D)';
          return `${name} (${it.jumlah}x)${stat}`;
        })
        .join(', ');

      return [
        bor.id,
        bor.namaPeminjam,
        bor.keperluan,
        itemSummaries,
        bor.status,
        bor.ruangan,
        formatIndoDate(bor.tanggalPinjam),
        formatIndoDate(bor.tanggalKembali),
      ];
    });

    const title = 'Laporan Agenda Peminjaman Alat - InveTrak';
    const fileName = `Peminjaman_InveTrak_${new Date().toISOString().split('T')[0]}.pdf`;

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
      {/* Top Filter & Actions Bar (Bento style) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {/* Search box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama peminjam, keperluan atau alat..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Month / Year Filters */}
          <div className="flex gap-2">
            <select
              value={bulanFilter}
              onChange={(e) => setBulanFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Bulan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>

            <select
              value={tahunFilter}
              onChange={(e) => setTahunFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Tahun</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>
        </div>

        {/* PDF / Excel Exports & Booking trigger */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 mr-1 shrink-0">
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
            onClick={handleOpenBorrowModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Peminjaman</span>
          </button>
        </div>
      </div>

      {/* Grid listing or Calendar view based on viewMode */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white border border-slate-200 rounded-[2rem]">
              Tidak ada agenda peminjaman yang terdaftar.
            </div>
          ) : (
            filteredList.map((bor) => {
              const totalQty = bor.items.reduce((sum, item) => sum + item.jumlah, 0);
              
              // Set today relative to context 2026-06-02
              const todayContext = new Date('2026-06-02');
              const returnLimitDate = new Date(bor.tanggalKembali);
              const isOverdue = 
                returnLimitDate < todayContext && 
                (bor.status === 'Dipinjam' || bor.status === 'Kembali Sebagian');

              let statusBadge = 'bg-amber-50 text-amber-700 border-amber-100';
              if (bor.status === 'Kembali') {
                statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
              } else if (bor.status === 'Kembali Sebagian') {
                statusBadge = 'bg-blue-50 text-blue-700 border-blue-100';
              }

              if (isOverdue) {
                statusBadge = 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse';
              }

              return (
                <div
                  key={bor.id}
                  className="bg-white rounded-[2rem] border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative text-left"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusBadge}`}>
                        {isOverdue ? 'Terlambat Kembali' : bor.status}
                      </span>
                      <span className="text-xs text-slate-400 font-bold bg-slate-50 px-2.5 py-1 rounded-lg">
                        Total: {totalQty} Unit
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-base leading-snug">
                      {bor.namaPeminjam}
                    </h4>
                    <p className="text-xs text-indigo-600 font-semibold mt-1">
                      Keperluan: {bor.keperluan}
                    </p>

                    <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-500 truncate" title={bor.ruangan}>
                        Ruang: {bor.ruangan}
                      </span>
                    </div>

                    {/* Borrowed items subtable block */}
                    <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Aset Yang Dipinjam
                      </p>
                      {bor.items.map((it, idx) => {
                        const matched = inventory.find((inv) => inv.id === it.alatId);
                        const name = matched ? matched.nama : 'Peralatan terhapus';

                        let itemStatusHtml = null;
                        if (it.returned) {
                          let condBadge = 'bg-emerald-100 text-emerald-800';
                          if (it.returnCondition === 'Rusak') {
                            condBadge = 'bg-rose-100 text-rose-800';
                          } else if (it.returnCondition === 'Tidak Lengkap') {
                            condBadge = 'bg-amber-100 text-amber-800';
                          }
                          itemStatusHtml = (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${condBadge}`}>
                              Kembali ({it.returnCondition})
                            </span>
                          );
                        } else {
                          itemStatusHtml = (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800">
                              Dipinjam
                            </span>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0"
                          >
                            <span className="text-slate-700 font-medium truncate flex-1 pr-2">
                              {name} ({it.jumlah}x)
                            </span>
                            {itemStatusHtml}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">
                          Tgl Pinjam
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          {formatIndoDate(bor.tanggalPinjam)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">
                          Tgl Kembali
                        </span>
                        <span className={`text-xs text-slate-600 font-medium ${isOverdue ? 'text-rose-600 font-bold' : ''}`}>
                          {formatIndoDate(bor.tanggalKembali)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-50">
                    {(bor.status === 'Dipinjam' || bor.status === 'Kembali Sebagian') && (
                      <button
                        type="button"
                        onClick={() => handleOpenReturnModal(bor)}
                        className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200"
                      >
                        <ClipboardList className="w-4 h-4" />
                        Proses Pengembalian
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteBorrowing(bor.id, bor.namaPeminjam)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Agenda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">Kalender Peminjaman</span>
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
                  const dayReservations = borrowings.filter((b) => {
                    return cell.dateString >= b.tanggalPinjam && cell.dateString <= b.tanggalKembali;
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
                        {dayReservations.slice(0, 2).map((res) => {
                          const toolCount = res.items.reduce((sum, item) => sum + item.jumlah, 0);
                          return (
                            <div
                              key={res.id}
                              className="hidden md:block truncate text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 leading-tight w-full hover:bg-indigo-100 transition-colors"
                              title={`${res.namaPeminjam}: ${res.keperluan}`}
                            >
                              {res.namaPeminjam} ({toolCount}a)
                            </div>
                          );
                        })}
                        {dayReservations.length > 2 && (
                          <div className="hidden md:block text-[8px] font-black text-slate-400 pl-1">
                            +{dayReservations.length - 2} lagi
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
                Pilih tanggal pada kalender untuk melihat daftar peminjaman di panel sebelah kanan.
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
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block mb-0.5">Daftar Peminjaman Alat</span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <h4 className="text-base font-extrabold text-white truncate">
                    {formatIndoDate(selectedCalendarDate)}
                  </h4>
                  <span className="px-2.5 py-1 bg-white/10 rounded-xl text-[10px] font-black text-indigo-300 uppercase shrink-0">
                    {selectedDateReservations.length} Transaksi
                  </span>
                </div>
              </div>

              {selectedDateReservations.length === 0 ? (
                <div className="py-12 px-2 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-white/5 text-slate-400 rounded-full flex items-center justify-center font-bold">
                    <CalendarDays className="w-6 h-6 text-indigo-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">Tidak ada peminjaman alat</p>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xs leading-relaxed">
                    Semua peralatan kerja tersedia penuh untuk dipinjam pada tanggal ini. Tidak ada draf pengeluaran terjadwal.
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickBookOnSelectedDate}
                    className="mt-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl border border-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 animate-none mx-auto w-full"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pinjam Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                  {selectedDateReservations.map((bor) => {
                    const totalQty = bor.items.reduce((sum, item) => sum + item.jumlah, 0);
                    
                    const todayContext = new Date('2026-06-02');
                    const returnLimitDate = new Date(bor.tanggalKembali);
                    const isOverdue = 
                      returnLimitDate < todayContext && 
                      (bor.status === 'Dipinjam' || bor.status === 'Kembali Sebagian');

                    let statusBadge = 'bg-white/10 text-amber-300 border-white/5';
                    if (bor.status === 'Kembali') {
                      statusBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20';
                    } else if (bor.status === 'Kembali Sebagian') {
                      statusBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/20';
                    }
                    if (isOverdue) {
                      statusBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse';
                    }

                    return (
                      <div
                        key={bor.id}
                        className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 relative text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${statusBadge}`}>
                            {isOverdue ? 'Terlambat' : bor.status}
                          </span>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {(bor.status === 'Dipinjam' || bor.status === 'Kembali Sebagian') && (
                              <button
                                type="button"
                                onClick={() => handleOpenReturnModal(bor)}
                                className="p-1 px-1.5 bg-white/5 hover:bg-white/15 text-indigo-300 hover:text-white rounded-md border border-white/10 transition-all cursor-pointer"
                                title="Kembalikan"
                              >
                                <ClipboardList className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteBorrowing(bor.id, bor.namaPeminjam)}
                              className="p-1 px-1.5 bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 hover:text-rose-200 rounded-md border border-rose-500/30 transition-all cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-extrabold text-white text-sm tracking-tight truncate leading-tight">
                            {bor.namaPeminjam}
                          </h5>
                          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mt-1">
                            Keperluan: {bor.keperluan}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            Lokasi: {bor.ruangan}
                          </p>
                        </div>

                        {/* List items */}
                        <div className="bg-white/5 p-2 rounded-xl text-[10.5px] border border-white/5 space-y-1">
                          {bor.items.map((it, idx) => {
                            const matched = inventory.find((inv) => inv.id === it.alatId);
                            const name = matched ? matched.nama : 'Peralatan';
                            return (
                              <div key={idx} className="flex justify-between text-slate-300">
                                <span className="truncate flex-1 pr-2 font-medium">{name} ({it.jumlah}x)</span>
                                <span className={`text-[9px] font-bold ${it.returned ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {it.returned ? `Kembali (${it.returnCondition})` : 'Dipinjam'}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap items-center justify-between border-t border-white/5 pt-2.5 text-[9px] font-bold text-slate-400">
                          <span>Pinjam: {formatIndoDate(bor.tanggalPinjam)}</span>
                          <span className={isOverdue ? 'text-rose-400' : ''}>Target: {formatIndoDate(bor.tanggalKembali)}</span>
                        </div>
                      </div>
                    );
                  })}
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
                  <span>Pinjam Alat Tambahan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW BORROW TRANSACTION CREATOR DIALOG */}
      <AnimatePresence>
        {isBorrowModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBorrowModalOpen(false)}
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
                <h3 className="font-bold text-slate-800 text-lg">Buat Agenda Peminjaman</h3>
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveBorrowingSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Nama Peminjam <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formPeminjam}
                      onChange={(e) => setFormPeminjam(e.target.value)}
                      placeholder="Contoh: Dr. Hermawan"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Keperluan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formKeperluan}
                      onChange={(e) => setFormKeperluan(e.target.value)}
                      placeholder="Contoh: Praktikum Fisika"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tanggal Pinjam <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formTglPinjam}
                      onChange={(e) => setFormTglPinjam(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tanggal Pengembalian <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formTglKembali}
                      onChange={(e) => setFormTglKembali(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                </div>

                {/* Equipment Picker Subtable Draft Builder */}
                <div className="border-t border-slate-150 pt-4 space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm">Daftar Alat Yang Akan Dipinjam</h4>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">
                          Pilih Alat
                        </label>
                        <select
                          value={selectedAlatId}
                          onChange={(e) => setSelectedAlatId(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none cursor-pointer border-slate-250"
                        >
                          <option value="">-- Pilih Alat --</option>
                          {availableEquipmentOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nama} (Stok: {item.jumlah} - {item.ruangan})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">
                          Jumlah Unit
                        </label>
                        <input
                          type="number"
                          placeholder="Qty"
                          min={1}
                          value={formTempJumlah}
                          onChange={(e) => setFormTempJumlah(e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none border-slate-250 bg-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddToolToDraft}
                      className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                    >
                      + Tambahkan ke Daftar Pinjam
                    </button>
                  </div>

                  {/* Draft List */}
                  <div className="max-h-36 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl bg-slate-50/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Nama Alat</th>
                          <th className="px-3 py-2 text-center">Jumlah</th>
                          <th className="px-3 py-2 text-center">Ruang</th>
                          <th className="px-3 py-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draftItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-5 text-slate-400">
                              Belum ada alat yang ditambahkan.
                            </td>
                          </tr>
                        ) : (
                          draftItems.map((item) => {
                            const match = inventory.find((inv) => inv.id === item.alatId);
                            return (
                              <tr key={item.alatId}>
                                <td className="px-3 py-2 font-semibold text-slate-700">
                                  {match ? match.nama : 'Peralatan tidak dikenal'}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-indigo-600">
                                  {item.jumlah}
                                </td>
                                <td className="px-3 py-2 text-center text-slate-500">
                                  {match ? match.ruangan : '-'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromDraft(item.alatId)}
                                    className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Ruang Lokasi Alat (Terbaca Otomatis)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formRuangGabungan}
                    placeholder="Gabungan ruangan alat yang dipilih"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 font-semibold cursor-not-allowed border-slate-200"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBorrowModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                  >
                    Simpan Peminjaman
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROCESS RETURN TRANSACTION DIALOG */}
      <AnimatePresence>
        {isReturnModalOpen && selectedBorrowingForReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReturnModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Proses Pengembalian Alat</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Peminjam: {selectedBorrowingForReturn.namaPeminjam} ({selectedBorrowingForReturn.keperluan})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <p className="text-xs text-slate-600 leading-relaxed bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                  Silakan centang alat yang dikembalikan, dan tentukan kondisinya. Alat yang dilaporkan <strong>Rusak</strong> akan dikembalikan ke stok namun mengubah kondisi aset menjadi Rusak Ringan. Alat yang dilaporkan <strong>Tidak Lengkap</strong> tidak akan mengembalikan sisa stok yang hilang ke inventaris.
                </p>

                <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                      <tr>
                        <th className="px-3 py-2 text-center w-12">Kembali</th>
                        <th className="px-3 py-2">Nama Alat</th>
                        <th className="px-3 py-2 text-center">Jumlah</th>
                        <th className="px-3 py-2">Status / Kondisi Pengembalian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedBorrowingForReturn.items.map((it, idx) => {
                        const originalAlat = inventory.find((inv) => inv.id === it.alatId);
                        const isChecked = returnFormChecked[idx];

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={it.returned}
                                onChange={() => handleToggleReturnFormCheck(idx)}
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                              />
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-700">
                              {originalAlat ? originalAlat.nama : 'Peralatan terhapus'}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-slate-800">
                              {it.jumlah} Unit
                            </td>
                            <td className="px-3 py-3">
                              <select
                                value={returnFormConditions[idx]}
                                disabled={!isChecked || it.returned}
                                onChange={(e) => handleReturnFormConditionChange(idx, e.target.value as any)}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-slate-200"
                              >
                                <option value="Lengkap">Lengkap (Kembali Utuh)</option>
                                <option value="Rusak">Rusak (Kembali Rusak)</option>
                                <option value="Tidak Lengkap">Tidak Lengkap (Ada Unit Hilang)</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReturnProcess}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                  >
                    Simpan Pengembalian
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
