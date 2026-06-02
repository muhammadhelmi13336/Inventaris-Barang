import React from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  Layers, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  CheckCircle 
} from 'lucide-react';
import { InventoryItem, ConsumableItem, BorrowingTransaction, PersonalAgenda, TabId } from '../types';
import { formatIndoDate } from '../utils';

interface DashboardProps {
  inventory: InventoryItem[];
  consumables: ConsumableItem[];
  borrowings: BorrowingTransaction[];
  agendas: PersonalAgenda[];
  onSwitchTab: (tab: TabId) => void;
}

export default function Dashboard({
  inventory,
  consumables,
  borrowings,
  agendas,
  onSwitchTab,
}: DashboardProps) {
  // Statistics Calculations
  const totalAlatTypes = inventory.length;
  const totalBhpQty = consumables.reduce((sum, item) => sum + item.jumlah, 0);
  const activeBorrowsCount = borrowings.filter(
    (b) => b.status === 'Dipinjam' || b.status === 'Kembali Sebagian'
  ).length;
  const brokenAlatCount = inventory.filter(
    (item) => item.keadaan === 'Rusak Ringan' || item.keadaan === 'Rusak Berat'
  ).length;

  // Recent inventory items (last 4 added, reversed)
  const recentInventory = [...inventory].slice(-4).reverse();

  // Active borrowing transactions (max 4)
  const activeBorrowings = borrowings
    .filter((b) => b.status === 'Dipinjam' || b.status === 'Kembali Sebagian')
    .slice(0, 4);

  // Uncompleted personal/daily agendas (max 4)
  const upcomingAgendas = agendas.filter((a) => !a.selesai).slice(0, 4);

  // Animation constants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Stats Cards Grid (Bento Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat Card 1 - Pure White and crisp gray */}
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-xs flex items-center gap-4 hover:shadow-md transition-all"
        >
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Total Jenis Alat</span>
            <span className="text-3xl font-extrabold text-slate-800">{totalAlatTypes}</span>
          </div>
        </motion.div>

        {/* Stat Card 2 - Indigo solid bold statement */}
        <motion.div
          variants={itemVariants}
          className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-lg shadow-indigo-100 flex items-center gap-4 hover:scale-[1.01] transition-all"
        >
          <div className="p-3.5 bg-white/10 text-white rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-indigo-150 font-bold uppercase tracking-widest block">Total Unit BHP</span>
            <span className="text-3xl font-extrabold text-white">{totalBhpQty}</span>
          </div>
        </motion.div>

        {/* Stat Card 3 - Vibrant amber highlights */}
        <motion.div
          variants={itemVariants}
          className="bg-amber-400 text-slate-900 p-6 rounded-[2rem] shadow-sm flex items-center gap-4 hover:scale-[1.01] transition-all"
        >
          <div className="p-3.5 bg-slate-900/10 text-slate-900 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-800/80 font-bold uppercase tracking-widest block">Sedang Dipinjam</span>
            <span className="text-3xl font-extrabold text-slate-900">{activeBorrowsCount}</span>
          </div>
        </motion.div>

        {/* Stat Card 4 - Deep Charcoal-slate tech feel */}
        <motion.div
          variants={itemVariants}
          className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-md flex items-center gap-4 hover:scale-[1.01] transition-all"
        >
          <div className="p-3.5 bg-rose-500/25 text-rose-300 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Perlu Perbaikan</span>
            <span className="text-3xl font-extrabold text-rose-400">{brokenAlatCount}</span>
          </div>
        </motion.div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Inventories & Active Borrowings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Inventory added */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Alat Baru Ditambahkan</h3>
              <button
                type="button"
                onClick={() => onSwitchTab('inventaris')}
                className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest">
                    <th className="pb-3 font-bold">Nama Alat</th>
                    <th className="pb-3 font-bold">Bahan</th>
                    <th className="pb-3 font-bold">Ukuran</th>
                    <th className="pb-3 font-bold text-center">Jumlah</th>
                    <th className="pb-3 font-bold">Keadaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-55">
                  {recentInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                        Belum ada data inventaris.
                      </td>
                    </tr>
                  ) : (
                    recentInventory.map((item) => {
                      let badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                      if (item.keadaan === 'Rusak Ringan') badgeClass = 'bg-amber-50 text-amber-700 border border-amber-100';
                      else if (item.keadaan === 'Rusak Berat') badgeClass = 'bg-rose-50 text-rose-700 border border-rose-100';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 font-bold text-slate-800 max-w-[210px] truncate">
                            {item.nama}
                          </td>
                          <td className="py-3.5 text-slate-500 font-medium">{item.bahan}</td>
                          <td className="py-3.5 text-slate-500 font-medium">{item.ukuran}</td>
                          <td className="py-3.5 text-center font-extrabold text-indigo-600">
                            {item.jumlah}
                          </td>
                          <td className="py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${badgeClass}`}>
                              {item.keadaan}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Active Borrowings Overview */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Peminjaman Berlangsung</h3>
              <button
                type="button"
                onClick={() => onSwitchTab('peminjaman')}
                className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                Kelola Peminjaman <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeBorrowings.length === 0 ? (
                <div className="col-span-2 py-10 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-[1.5rem] font-medium">
                  Tidak ada aktivitas peminjaman aktif.
                </div>
              ) : (
                activeBorrowings.map((b) => {
                  const toolsSummary = b.items
                    .map((it) => {
                      const matched = inventory.find((inv) => inv.id === it.alatId);
                      return matched ? `${matched.nama} (${it.jumlah}x)` : `Alat (${it.jumlah}x)`;
                    })
                    .join(', ');

                  return (
                    <div
                      key={b.id}
                      className="p-4 border border-slate-100 rounded-[1.5rem] bg-slate-50/50 flex items-start gap-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-[1rem] mt-0.5 shrink-0 shadow-xs">
                        <Clock className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">
                          {b.namaPeminjam}
                        </h4>
                        <p className="text-xs text-indigo-600 font-extrabold mt-1 truncate">
                          {b.keperluan}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          {toolsSummary}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                          Kembali: {formatIndoDate(b.tanggalKembali)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar: Agenda Terdekat */}
        <div>
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-6 sm:p-8 flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Agenda Terdekat</h3>
              <button
                type="button"
                onClick={() => onSwitchTab('pribadi')}
                className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                Buka Agenda <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[384px] custom-scrollbar pr-1">
              {upcomingAgendas.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-[1.5rem] flex-1 flex flex-col items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold">Agenda bersih dari pekerjaan rumah.</p>
                </div>
              ) : (
                upcomingAgendas.map((a) => {
                  let priorityBadge = 'border-slate-200 text-slate-600 bg-slate-100/50';
                  if (a.prioritas === 'Sedang') {
                    priorityBadge = 'border-amber-200 text-amber-800 bg-amber-50/50';
                  } else if (a.prioritas === 'Tinggi') {
                    priorityBadge = 'border-rose-200 text-rose-800 bg-rose-50/50';
                  }

                  return (
                    <div
                      key={a.id}
                      className="p-4 border border-slate-100 rounded-[1.5rem] bg-slate-50/50 flex flex-col justify-between hover:border-slate-200 hover:shadow-2xs transition-all text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-1">
                          {a.judul}
                        </h4>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full shrink-0 ${priorityBadge}`}>
                          {a.prioritas}
                        </span>
                      </div>
                      
                      {a.tipe === 'Harian' && a.checklist.length > 0 && (
                        <div className="mt-2 text-[11px] text-slate-500 font-bold">
                          {a.checklist.filter((i) => i.selesai).length} dari {a.checklist.length} Tugas Selesai
                        </div>
                      )}

                      {a.tipe === 'Biasa' && a.keterangan && (
                        <p className="text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                          {a.keterangan}
                        </p>
                      )}

                      <div className="text-slate-400 mt-3.5 flex items-center gap-1.5 pt-2 border-t border-slate-105">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-bold">{formatIndoDate(a.tanggal)}</span>
                        <span className="text-slate-300 ml-auto font-bold uppercase text-[9px] tracking-widest text-indigo-600">
                          {a.tipe === 'Harian' ? 'Harian' : 'Biasa'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
