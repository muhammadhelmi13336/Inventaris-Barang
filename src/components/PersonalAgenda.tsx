import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MapPin, 
  Calendar, 
  Edit, 
  Trash2, 
  X,
  CheckCircle,
  ClipboardList
} from 'lucide-react';
import { PersonalAgenda, ChecklistItem } from '../types';
import { formatIndoDate } from '../utils';

interface PersonalAgendaProps {
  agendas: PersonalAgenda[];
  onSave: (agenda: PersonalAgenda) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onToggleChecklistItem: (agendaId: string, itemIdx: number) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  triggerConfirm: (msg: string, callback: () => void) => void;
}

export default function PersonalAgendaPanel({
  agendas,
  onSave,
  onDelete,
  onToggleStatus,
  onToggleChecklistItem,
  showToast,
  triggerConfirm,
}: PersonalAgendaProps) {
  // Filters state
  const [activeTabFilter, setActiveTabFilter] = useState<'semua' | 'aktif' | 'selesai'>('semua');
  const [bulanFilter, setBulanFilter] = useState('');
  const [tahunFilter, setTahunFilter] = useState('');

  // Agenda Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<PersonalAgenda | null>(null);

  // Form Fields State
  const [formJudul, setFormJudul] = useState('');
  const [formTanggal, setFormTanggal] = useState('');
  const [formPrioritas, setFormPrioritas] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Sedang');
  const [formTipe, setFormTipe] = useState<'Biasa' | 'Harian'>('Biasa');
  const [formKeterangan, setFormKeterangan] = useState('');
  
  // Temporary checklist draft builder state
  const [tempChecklistText, setTempChecklistText] = useState('');
  const [draftChecklist, setDraftChecklist] = useState<ChecklistItem[]>([]);

  // Filter listings
  const filteredList = useMemo(() => {
    let list = agendas;

    // 1. Tab filter
    if (activeTabFilter === 'aktif') {
      list = agendas.filter((a) => !a.selesai);
    } else if (activeTabFilter === 'selesai') {
      list = agendas.filter((a) => a.selesai);
    }

    // 2. Month and Year Filters
    return list.filter((a) => {
      let matchesBulan = true;
      let matchesTahun = true;

      if (a.tanggal) {
        const parts = a.tanggal.split('-'); // YYYY-MM-DD
        if (parts.length === 3) {
          if (bulanFilter) {
            matchesBulan = parts[1] === bulanFilter;
          }
          if (tahunFilter) {
            matchesTahun = parts[0] === tahunFilter;
          }
        }
      }

      return matchesBulan && matchesTahun;
    });
  }, [agendas, activeTabFilter, bulanFilter, tahunFilter]);

  // --- FORM CHECKLIST DRAFT BUILDER ---
  const handleAddChecklistItemToDraft = () => {
    const text = tempChecklistText.trim();
    if (!text) {
      showToast('Tuliskan rincian kegiatan terlebih dahulu!', 'error');
      return;
    }
    setDraftChecklist([...draftChecklist, { text, selesai: false }]);
    setTempChecklistText('');
  };

  const handleRemoveChecklistItemFromDraft = (index: number) => {
    setDraftChecklist(draftChecklist.filter((_, idx) => idx !== index));
  };

  // --- MODAL UTILITIES ---
  const handleOpenCreate = () => {
    setEditingAgenda(null);
    setFormJudul('');
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormPrioritas('Sedang');
    setFormTipe('Biasa');
    setFormKeterangan('');
    setDraftChecklist([]);
    setTempChecklistText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agenda: PersonalAgenda) => {
    setEditingAgenda(agenda);
    setFormJudul(agenda.judul);
    setFormTanggal(agenda.tanggal);
    setFormPrioritas(agenda.prioritas);
    setFormTipe(agenda.tipe);
    setFormKeterangan(agenda.keterangan || '');
    setDraftChecklist(agenda.checklist ? [...agenda.checklist] : []);
    setTempChecklistText('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formJudul.trim() || !formTanggal) {
      showToast('Harap isi Judul Agenda dan Tanggal yang benar!', 'error');
      return;
    }

    if (formTipe === 'Harian' && draftChecklist.length === 0) {
      showToast('Harap tambahkan minimal 1 ceklist kegiatan untuk Agenda Harian!', 'error');
      return;
    }

    const agendaData: PersonalAgenda = {
      id: editingAgenda ? editingAgenda.id : 'age-' + Date.now(),
      judul: formJudul.trim(),
      tanggal: formTanggal,
      prioritas: formPrioritas,
      tipe: formTipe,
      keterangan: formTipe === 'Biasa' ? formKeterangan.trim() : '',
      checklist: formTipe === 'Harian' ? draftChecklist : [],
      selesai: editingAgenda ? editingAgenda.selesai : false,
    };

    onSave(agendaData);
    showToast(
      editingAgenda ? 'Agenda berhasil diperbarui!' : 'Agenda baru berhasil ditambahkan!',
      'success'
    );
    setIsModalOpen(false);
  };

  const handleDeleteAgenda = (id: string, name: string) => {
    triggerConfirm(`Apakah Anda yakin ingin menghapus agenda "${name}" secara permanen?`, () => {
      onDelete(id);
      showToast('Agenda berhasil dihapus dari sistem', 'success');
    });
  };

  return (
    <div className="space-y-6">
      {/* Top filter Controls Bar (Bento style) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row flex-1 gap-4 items-start sm:items-center justify-between">
          {/* Status Tab buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTabFilter('semua')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                activeTabFilter === 'semua'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('aktif')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                activeTabFilter === 'aktif'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Belum Selesai
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('selesai')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                activeTabFilter === 'selesai'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Sudah Selesai
            </button>
          </div>

          {/* Month / Year Filters */}
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={bulanFilter}
              onChange={(e) => setBulanFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 sm:flex-initial cursor-pointer"
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
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 sm:flex-initial cursor-pointer"
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

        {/* Create Trigger */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 w-full xl:w-auto cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Agenda</span>
        </button>
      </div>

      {/* Main Grid agenda items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredList.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white border border-slate-200 rounded-[2rem]">
            Tidak ada agenda pribadi yang cocok dengan kriteria filter.
          </div>
        ) : (
          filteredList.map((a) => {
            let priorityBadge = 'bg-slate-100 text-slate-700 border-slate-200';
            if (a.prioritas === 'Sedang') {
              priorityBadge = 'bg-amber-100 text-amber-800 border-amber-200';
            } else if (a.prioritas === 'Tinggi') {
              priorityBadge = 'bg-rose-100 text-rose-800 border-rose-250';
            }

            // Calculation for checklist and progress info
            let percentProgress = 0;
            let checkCompletedCount = 0;
            let checkTotalLength = 0;

            if (a.tipe === 'Harian' && a.checklist && a.checklist.length > 0) {
              checkTotalLength = a.checklist.length;
              checkCompletedCount = a.checklist.filter((i) => i.selesai).length;
              percentProgress = Math.round((checkCompletedCount / checkTotalLength) * 100);
            }

            return (
              <div
                key={a.id}
                className={`p-6 bg-white border border-slate-200/85 rounded-[2rem] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex gap-4 ${
                  a.selesai ? 'bg-slate-50/70 border-slate-150' : ''
                }`}
              >
                {/* Completion tick trigger checkbox banner */}
                <div className="mt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleStatus(a.id)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                      a.selesai
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'border-slate-300 hover:border-indigo-600 bg-white'
                    }`}
                  >
                    {a.selesai && <CheckCircle className="w-4 h-4 text-white" />}
                  </button>
                </div>

                {/* Main Content Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4
                        className={`font-bold text-slate-800 text-base leading-snug truncate ${
                          a.selesai ? 'line-through text-slate-400 font-medium' : ''
                        }`}
                      >
                        {a.judul}
                      </h4>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 border rounded-full shrink-0 ${priorityBadge}`}>
                        {a.prioritas}
                      </span>
                    </div>

                    <p className="text-[10px] text-indigo-500 font-bold mb-1.5 uppercase tracking-wider">
                      {a.tipe === 'Harian' ? 'AGENDA HARIAN' : 'AGENDA BIASA'}
                    </p>

                    {/* Rendering text description if Biasa */}
                    {a.tipe === 'Biasa' ? (
                      <p className={`text-sm text-slate-500 leading-relaxed ${a.selesai ? 'text-slate-400 line-through' : ''}`}>
                        {a.keterangan || 'Tidak ada keterangan tambahan.'}
                      </p>
                    ) : (
                      // Checklist list with Progress Bar if Harian
                      <div className="space-y-3">
                        {/* Progress Bar banner */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                            <span>KEMAJUAN CEKLIST</span>
                            <span>
                              {percentProgress}% ({checkCompletedCount}/{checkTotalLength})
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${percentProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Checklist sub-list items */}
                        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                          {a.checklist.map((item, idx) => (
                            <label
                              key={idx}
                              className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-800 cursor-pointer py-0.5"
                            >
                              <input
                                type="checkbox"
                                checked={item.selesai}
                                onChange={() => onToggleChecklistItem(a.id, idx)}
                                className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 shrink-0 cursor-pointer"
                              />
                              <span className={`font-semibold ${item.selesai ? 'line-through text-slate-400 font-medium' : ''}`}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Controls and Dates footer */}
                  <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 shrink-0" />
                      {formatIndoDate(a.tanggal)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(a)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Agenda"
                      >
                        <Edit className="w-4.5 h-4.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAgenda(a.id, a.judul)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Agenda"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AGENDA CREATOR MODAL DIALOG */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white rounded-[2.5rem] border border-slate-200 shadow-xl w-full max-w-md overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-800 text-lg">
                  {editingAgenda ? 'Edit Agenda Pribadi' : 'Tambah Agenda Pribadi'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Judul Agenda <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    placeholder="Contoh: Stok opname lemari laboratorium B"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formTanggal}
                      onChange={(e) => setFormTanggal(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Prioritas <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formPrioritas}
                      onChange={(e) => setFormPrioritas(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border-slate-200"
                    >
                      <option value="Rendah">Rendah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Tinggi">Tinggi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tipe Agenda <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTipe}
                    onChange={(e) => setFormTipe(e.target.value as any)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border-slate-200"
                  >
                    <option value="Biasa">Agenda Biasa (Catatan)</option>
                    <option value="Harian">Agenda Harian (Ceklist Runtutan)</option>
                  </select>
                </div>

                {/* Ordinary fields */}
                {formTipe === 'Biasa' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Keterangan / Deskripsi
                    </label>
                    <textarea
                      rows={3}
                      value={formKeterangan}
                      onChange={(e) => setFormKeterangan(e.target.value)}
                      placeholder="Tulis catatan atau rincian agenda Anda di sini..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
                    />
                  </div>
                ) : (
                  // Daily Checklist Elements Block
                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Ceklist Runtutan Kegiatan
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tempChecklistText}
                        onChange={(e) => setTempChecklistText(e.target.value)}
                        placeholder="Contoh: Ambil reagen di lemari es"
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white border-slate-250"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddChecklistItemToDraft();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddChecklistItemToDraft}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shrink-0 cursor-pointer"
                      >
                        Tambah
                      </button>
                    </div>

                    <div className="max-h-28 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg bg-white p-2">
                      <ul className="divide-y divide-slate-100 space-y-1">
                        {draftChecklist.length === 0 ? (
                          <li className="text-slate-400 text-[11px] text-center py-2">
                            Belum ada runtutan agenda ditambahkan
                          </li>
                        ) : (
                          draftChecklist.map((item, idx) => (
                            <li key={idx} className="flex items-center justify-between text-xs py-1">
                              <span className="text-slate-700 font-medium truncate flex-1 pr-2">
                                {item.text}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveChecklistItemFromDraft(idx)}
                                className="text-rose-500 hover:text-rose-700 text-[11px] font-bold shrink-0 cursor-pointer"
                              >
                                Hapus
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                  >
                    Simpan Agenda
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
