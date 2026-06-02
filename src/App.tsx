import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Clock, 
  Package, 
  Layers, 
  ClipboardList, 
  CalendarDays, 
  LayoutDashboard,
  Home
} from 'lucide-react';
import { TabId, InventoryItem, ConsumableItem, BorrowingTransaction, PersonalAgenda, BorrowedItem, PeminjamanRuangan } from './types';
import { dummyInventory, dummyConsumables, dummyBorrowings, dummyAgendas, dummyRoomBorrowings, INITIAL_ROOMS } from './seeds';
import { getLiveClockString } from './utils';

// Import our customized sub-components
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Consumables from './components/Consumables';
import Borrowing from './components/Borrowing';
import PersonalAgendaPanel from './components/PersonalAgenda';
import RoomBorrowing from './components/RoomBorrowing';
import ConfirmationDialog from './components/ConfirmationDialog';
import ToastContainer, { Toast } from './components/ToastContainer';

export default function App() {
  // Navigation active state
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Time & Live Clock Synchronization State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Master lists, fallback to mock seeds if none exists in localStorage
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const local = localStorage.getItem('invetrak_inventory');
    return local ? JSON.parse(local) : dummyInventory;
  });

  const [consumables, setConsumables] = useState<ConsumableItem[]>(() => {
    const local = localStorage.getItem('invetrak_consumables');
    return local ? JSON.parse(local) : dummyConsumables;
  });

  const [borrowings, setBorrowings] = useState<BorrowingTransaction[]>(() => {
    const local = localStorage.getItem('invetrak_borrowings');
    return local ? JSON.parse(local) : dummyBorrowings;
  });

  const [agendas, setAgendas] = useState<PersonalAgenda[]>(() => {
    const local = localStorage.getItem('invetrak_agendas');
    return local ? JSON.parse(local) : dummyAgendas;
  });

  const [roomBorrowings, setRoomBorrowings] = useState<PeminjamanRuangan[]>(() => {
    const local = localStorage.getItem('invetrak_room_borrowings');
    return local ? JSON.parse(local) : dummyRoomBorrowings;
  });

  const [rooms, setRooms] = useState<string[]>(() => {
    const local = localStorage.getItem('invetrak_rooms');
    return local ? JSON.parse(local) : INITIAL_ROOMS;
  });

  // Toast System State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    message: '',
    onConfirm: null,
  });

  // Synchronize live clock every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Per-entity localStorage serialization helpers (independent prevents looping resets)
  useEffect(() => {
    localStorage.setItem('invetrak_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('invetrak_consumables', JSON.stringify(consumables));
  }, [consumables]);

  useEffect(() => {
    localStorage.setItem('invetrak_borrowings', JSON.stringify(borrowings));
  }, [borrowings]);

  useEffect(() => {
    localStorage.setItem('invetrak_agendas', JSON.stringify(agendas));
  }, [agendas]);

  useEffect(() => {
    localStorage.setItem('invetrak_room_borrowings', JSON.stringify(roomBorrowings));
  }, [roomBorrowings]);

  useEffect(() => {
    localStorage.setItem('invetrak_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // --- TOAST TRIGGER FACTORY ---
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss toast after 3.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- CONFIRM DIALOG TRIGGER FACTORY ---
  const triggerConfirmation = (message: string, callback: () => void) => {
    setConfirmDialog({
      isOpen: true,
      message,
      onConfirm: callback,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      message: '',
      onConfirm: null,
    });
  };

  const handleExecuteConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
    closeConfirmDialog();
  };

  const handleAddRoom = (newRoom: string) => {
    const trimmed = newRoom.trim();
    if (!trimmed) {
      showToast('Nama ruangan tidak boleh kosong!', 'error');
      return false;
    }
    // Case insensitive duplication check
    if (rooms.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Ruangan "${trimmed}" sudah terdaftar!`, 'warning');
      return false;
    }
    setRooms((prev) => [...prev, trimmed]);
    showToast(`Ruangan "${trimmed}" berhasil ditambahkan ke daftar!`, 'success');
    return true;
  };

  const handleDeleteRoom = (roomToDelete: string) => {
    // Count dependencies
    const invCount = inventory.filter((item) => item.ruangan === roomToDelete).length;
    const conCount = consumables.filter((item) => item.ruangan === roomToDelete).length;
    const roomCount = roomBorrowings.filter((item) => item.namaRuangan === roomToDelete).length;

    let warningMessage = `Apakah Anda yakin ingin menghapus ruangan "${roomToDelete}" dari daftar terdaftar?`;
    
    if (invCount > 0 || conCount > 0 || roomCount > 0) {
      const details = [];
      if (invCount > 0) details.push(`${invCount} item inventaris`);
      if (conCount > 0) details.push(`${conCount} barang habis pakai`);
      if (roomCount > 0) details.push(`${roomCount} peminjaman ruangan`);
      warningMessage = `Perhatian: Ruangan "${roomToDelete}" saat ini masih digunakan oleh ${details.join(', ')}. Jika tetap dihapus, data tersebut akan tetap ada tetapi pilihan ruangan ini tidak akan muncul lagi di formulir baru. Apakah Anda yakin ingin menghapus ruangan ini?`;
    }

    triggerConfirmation(warningMessage, () => {
      setRooms((prev) => prev.filter((r) => r !== roomToDelete));
      showToast(`Ruangan "${roomToDelete}" berhasil dihapus!`, 'success');
    });
  };

  // --- GLOBAL MUTATOR HANDLERS ---

  // Inventory Save/Create/Update Mutator
  const handleSaveInventoryItem = (item: InventoryItem) => {
    setInventory((prev) => {
      const exists = prev.some((it) => it.id === item.id);
      if (exists) {
        return prev.map((it) => (it.id === item.id ? item : it));
      } else {
        return [...prev, item];
      }
    });
  };

  const handleDeleteInventoryItem = (id: string) => {
    setInventory((prev) => prev.filter((it) => it.id !== id));
  };

  // Consumables Save/Create/Update Mutator
  const handleSaveConsumableItem = (item: ConsumableItem) => {
    setConsumables((prev) => {
      const exists = prev.some((it) => it.id === item.id);
      if (exists) {
        return prev.map((it) => (it.id === item.id ? item : it));
      } else {
        return [...prev, item];
      }
    });
  };

  const handleDeleteConsumableItem = (id: string) => {
    setConsumables((prev) => prev.filter((it) => it.id !== id));
  };

  // Pemiandulan Borrow Transaction Save & Deduct Inventory Stock Mutator
  const handleSaveBorrowing = (newBorrow: BorrowingTransaction) => {
    setBorrowings((prev) => [...prev, newBorrow]);
    
    // Deduct quantity from stock
    setInventory((prev) => {
      return prev.map((orig) => {
        const transItem = newBorrow.items.find((it) => it.alatId === orig.id);
        if (transItem) {
          return {
            ...orig,
            jumlah: Math.max(0, orig.jumlah - transItem.jumlah),
          };
        }
        return orig;
      });
    });
  };

  // Returning Process item checking & stock replenish logic
  const handleReturnProcess = (borrowId: string, updatedItems: BorrowedItem[]) => {
    const targetBorrow = borrowings.find((b) => b.id === borrowId);
    if (!targetBorrow) return;

    // Collect elements being returned newly
    const quantityReplenishments: { [key: string]: { qty: number; cond: string } } = {};

    updatedItems.forEach((it, idx) => {
      const oldItem = targetBorrow.items[idx];
      // If was dipinjam and now ticked returned
      if (it.returned && !oldItem?.returned) {
        quantityReplenishments[it.alatId] = { qty: it.jumlah, cond: it.returnCondition };
      }
    });

    // Update Transaction Database State
    setBorrowings((prev) =>
      prev.map((b) => {
        if (b.id === borrowId) {
          const allReturned = updatedItems.every((i) => i.returned);
          const statusResult = allReturned ? 'Kembali' : 'Kembali Sebagian';
          return {
            ...b,
            status: statusResult,
            items: updatedItems,
          };
        }
        return b;
      })
    );

    // Replenish inventory stocks with physical condition variations
    setInventory((prev) =>
      prev.map((orig) => {
        const repl = quantityReplenishments[orig.id];
        if (repl) {
          let nextQty = orig.jumlah;
          let nextCondition = orig.keadaan;

          if (repl.cond === 'Lengkap') {
            nextQty += repl.qty;
          } else if (repl.cond === 'Rusak') {
            nextQty += repl.qty;
            if (orig.keadaan === 'Sangat Baik' || orig.keadaan === 'Baik') {
              nextCondition = 'Rusak Ringan';
            }
          } else if (repl.cond === 'Tidak Lengkap') {
            showToast(
              `Aset "${orig.nama}" dilaporkan Tidak Lengkap. Sisa fisik tidak dipulihkan ke stok.`,
              'warning'
            );
          }

          return {
            ...orig,
            jumlah: nextQty,
            keadaan: nextCondition,
          };
        }
        return orig;
      })
    );

    const checkAllDone = updatedItems.every((i) => i.returned);
    if (checkAllDone) {
      showToast('Selamat! Seluruh peralatan peminjaman telah sukses dikembalikan!', 'success');
    } else {
      showToast('Berhasil mengembalikan sebagian peralatan peminjaman!', 'success');
    }
  };

  // Delete Borrowing transaction history & auto replenish stock if unreturned
  const handleDeleteBorrowing = (id: string) => {
    const targetBorrow = borrowings.find((b) => b.id === id);
    if (targetBorrow) {
      // Put back unreturned items quantities
      setInventory((prev) =>
        prev.map((orig) => {
          const unreturnedBorrowItem = targetBorrow.items.find(
            (it) => it.alatId === orig.id && !it.returned
          );
          if (unreturnedBorrowItem) {
            return {
              ...orig,
              jumlah: orig.jumlah + unreturnedBorrowItem.jumlah,
            };
          }
          return orig;
        })
      );
    }
    setBorrowings((prev) => prev.filter((b) => b.id !== id));
  };

  // Save Agenda mutator
  const handleSaveAgendaObj = (agenda: PersonalAgenda) => {
    setAgendas((prev) => {
      const exists = prev.some((a) => a.id === agenda.id);
      if (exists) {
        return prev.map((a) => (a.id === agenda.id ? agenda : a));
      } else {
        return [...prev, agenda];
      }
    });
  };

  // Toggle Agenda status
  const handleToggleAgendaStatus = (id: string) => {
    setAgendas((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextVal = !a.selesai;
          const nextChecklist =
            a.tipe === 'Harian' && a.checklist
              ? a.checklist.map((item) => ({ ...item, selesai: nextVal }))
              : a.checklist;

          showToast(
            nextVal ? 'Agenda ditandai SELESAI!' : 'Agenda diaktifkan kembali!',
            'success'
          );
          return {
            ...a,
            selesai: nextVal,
            checklist: nextChecklist,
          };
        }
        return a;
      })
    );
  };

  // Toggle checklist sub-item of Harian agendas
  const handleToggleAgendaChecklistItem = (agendaId: string, itemIdx: number) => {
    setAgendas((prev) =>
      prev.map((a) => {
        if (a.id === agendaId) {
          const nextChecklist = a.checklist.map((item, idx) =>
            idx === itemIdx ? { ...item, selesai: !item.selesai } : item
          );
          const totalLength = nextChecklist.length;
          const completedCount = nextChecklist.filter((it) => it.selesai).length;
          const allDone = totalLength > 0 && completedCount === totalLength;

          return {
            ...a,
            checklist: nextChecklist,
            selesai: allDone,
          };
        }
        return a;
      })
    );
  };

  const handleDeleteAgendaObj = (id: string) => {
    setAgendas((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveRoomBorrowing = (item: PeminjamanRuangan) => {
    setRoomBorrowings((prev) => {
      const exists = prev.some((it) => it.id === item.id);
      if (exists) {
        return prev.map((it) => (it.id === item.id ? item : it));
      } else {
        return [...prev, item];
      }
    });
  };

  const handleDeleteRoomBorrowing = (id: string) => {
    setRoomBorrowings((prev) => prev.filter((it) => it.id !== id));
  };


  // Helpers for switching tabs
  const handleSwitchTab = (tab: TabId) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="bg-[#F8FAFC] text-slate-800 min-h-screen flex flex-col md:flex-row font-sans md:p-8 md:gap-8">
      
      {/* Toast Notification Mount */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Confirmation Dialog Modal Mount */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={handleExecuteConfirm}
        onCancel={closeConfirmDialog}
      />

      {/* SIDEBAR FOR DESKTOP & SLIDE DRAWER FOR MOBILE */}
      <aside className="w-full md:w-68 bg-white md:rounded-[2.5rem] text-slate-800 flex flex-col border-b md:border border-slate-200/70 shrink-0 select-none md:shadow-sm overflow-hidden">
        
        {/* Logo Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100/50">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wide leading-none text-slate-900">InveTrak</h1>
              <span className="text-[10px] text-slate-400 font-medium">Sistem Inventaris & Agenda</span>
            </div>
          </div>
          
          {/* Mobile menu toggle button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none cursor-pointer"
          >
            <Menu className="w-6 h-6 shrink-0" />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 p-4 space-y-1`}>
          
          <button
            type="button"
            onClick={() => handleSwitchTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/60'
                : 'text-slate-500 hover:bg-slate-55 hover:text-slate-950'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('inventaris')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left cursor-pointer ${
              activeTab === 'inventaris'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/60'
                : 'text-slate-500 hover:bg-slate-55 hover:text-slate-950'
            }`}
          >
            <Package className="w-5 h-5 shrink-0" />
            <span>Inventaris Alat</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('consumables')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left cursor-pointer ${
              activeTab === 'consumables'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/60'
                : 'text-slate-500 hover:bg-slate-55 hover:text-slate-950'
            }`}
          >
            <Layers className="w-5 h-5 shrink-0" />
            <span>Barang Habis Pakai</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('ruangan')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left cursor-pointer ${
              activeTab === 'ruangan'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/60'
                : 'text-slate-500 hover:bg-slate-55 hover:text-slate-950'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span>Peminjaman Ruangan</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('peminjaman')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left cursor-pointer ${
              activeTab === 'peminjaman'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/60'
                : 'text-slate-500 hover:bg-slate-55 hover:text-slate-950'
            }`}
          >
            <ClipboardList className="w-5 h-5 shrink-0" />
            <span>Agenda Peminjaman</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('pribadi')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left cursor-pointer ${
              activeTab === 'pribadi'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/60'
                : 'text-slate-500 hover:bg-slate-55 hover:text-slate-950'
            }`}
          >
            <CalendarDays className="w-5 h-5 shrink-0" />
            <span>Agenda Pribadi</span>
          </button>
        </nav>

        {/* Sidebar persistent footer info */}
        <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 mt-auto hidden md:block">
          <p className="font-semibold">Versi Aplikasi 1.4.0</p>
          <p className="mt-0.5">&copy; 2026 InveTrak App</p>
        </div>
      </aside>

      {/* CORE WORKSPACE INTERFACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen md:h-full custom-scrollbar relative gap-5 pb-24 md:pb-6">
        
        {/* Header toolbar */}
        <header className="bg-white md:bg-transparent border-b md:border-b-0 border-slate-200 px-6 md:px-0 py-4 flex items-center justify-between shrink-0 select-none">
          <div className="min-w-0 pr-2">
            <h2 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none truncate">
              {activeTab === 'dashboard' && 'Ringkasan Dashboard'}
              {activeTab === 'inventaris' && 'Inventaris Alat Kerja'}
              {activeTab === 'consumables' && 'Barang Habis Pakai (BHP)'}
              {activeTab === 'peminjaman' && 'Agenda Peminjaman Alat'}
              {activeTab === 'pribadi' && 'Daftar Agenda & Kegiatan Pribadi'}
              {activeTab === 'ruangan' && 'Peminjaman & Reservasi Ruangan'}
            </h2>
            <p className="text-[11px] md:text-sm text-slate-500 font-medium mt-1 md:mt-2 truncate">
              {activeTab === 'dashboard' && 'Analisis status inventaris dan agenda saat ini'}
              {activeTab === 'inventaris' && 'Daftar unit barang berdasarkan ukuran, keadaan, anggaran, dan ruangan'}
              {activeTab === 'consumables' && 'Kelola ketersediaan, merk, jenis barang, dan masa kadaluarsa BHP'}
              {activeTab === 'peminjaman' && 'Atur peminjaman, pengembalian, dan lokasi multi-ruangan alat kerja'}
              {activeTab === 'pribadi' && 'Daftar periksa agenda, perawatan rutin, atau to-do list pribadi Anda'}
              {activeTab === 'ruangan' && 'Kelola agenda pemakaian, jumlah peserta, dan reservasi ruangan sarana prasarana'}
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hidden sm:flex items-center gap-2 shadow-xs">
              <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse text-indigo-500" />
              <span>{getLiveClockString(currentTime)}</span>
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-sm border border-indigo-100 shadow-md shadow-indigo-150/20 select-none">
              AD
            </div>
          </div>
        </header>

        {/* ACTIVE MODULE CONTAINER MOUNT */}
        <div className="flex-1">
          {activeTab === 'dashboard' && (
            <Dashboard
              inventory={inventory}
              consumables={consumables}
              borrowings={borrowings}
              agendas={agendas}
              onSwitchTab={handleSwitchTab}
            />
          )}

          {activeTab === 'inventaris' && (
            <Inventory
              inventory={inventory}
              borrowings={borrowings}
              onSave={handleSaveInventoryItem}
              onDelete={handleDeleteInventoryItem}
              showToast={showToast}
              triggerConfirm={triggerConfirmation}
              rooms={rooms}
            />
          )}

          {activeTab === 'consumables' && (
            <Consumables
              consumables={consumables}
              onSave={handleSaveConsumableItem}
              onDelete={handleDeleteConsumableItem}
              showToast={showToast}
              triggerConfirm={triggerConfirmation}
              rooms={rooms}
            />
          )}

          {activeTab === 'peminjaman' && (
            <Borrowing
              inventory={inventory}
              borrowings={borrowings}
              onSaveBorrowing={handleSaveBorrowing}
              onReturnProcess={handleReturnProcess}
              onDeleteBorrowing={handleDeleteBorrowing}
              showToast={showToast}
              triggerConfirm={triggerConfirmation}
            />
          )}

          {activeTab === 'pribadi' && (
            <PersonalAgendaPanel
              agendas={agendas}
              onSave={handleSaveAgendaObj}
              onDelete={handleDeleteAgendaObj}
              onToggleStatus={handleToggleAgendaStatus}
              onToggleChecklistItem={handleToggleAgendaChecklistItem}
              showToast={showToast}
              triggerConfirm={triggerConfirmation}
            />
          )}

          {activeTab === 'ruangan' && (
            <RoomBorrowing
              roomBorrowings={roomBorrowings}
              onSave={handleSaveRoomBorrowing}
              onDelete={handleDeleteRoomBorrowing}
              showToast={showToast}
              triggerConfirm={triggerConfirmation}
              rooms={rooms}
              onAddRoom={handleAddRoom}
              onDeleteRoom={handleDeleteRoom}
            />
          )}
        </div>
      </main>

      {/* BOTTOM NAVIGATION BAR FOR MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/85 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] px-1 py-1.5 flex items-center justify-around z-40">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inventaris', label: 'Inventaris', icon: Package },
          { id: 'consumables', label: 'BHP', icon: Layers },
          { id: 'ruangan', label: 'Ruangan', icon: Home },
          { id: 'peminjaman', label: 'Peminjaman', icon: ClipboardList },
          { id: 'pribadi', label: 'Pribadi', icon: CalendarDays },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSwitchTab(item.id as TabId)}
              className={`flex flex-col items-center justify-center py-1 flex-1 text-center cursor-pointer transition-all ${
                isActive 
                  ? 'text-indigo-600 scale-105 font-extrabold' 
                  : 'text-slate-400 hover:text-slate-650 font-medium'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'
              }`}>
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span className="text-[9px] mt-0.5 tracking-tight leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
