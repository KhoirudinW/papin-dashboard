"use client";

import React, { useState } from 'react';
import { Trash2, Edit3, Plus, X, CheckCircle2 } from 'lucide-react';
import PricingModal from '@/components/PricingModalProps';
import { usePresetReactions, Preset } from '@/hooks/usePresetReactions';

// --- MODAL COMPONENT ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPreset: Preset | null;
  onSave: (name: string, reactions: string[]) => void;
}

const ModalPreset = ({ isOpen, onClose, editingPreset, onSave }: ModalProps) => {
  const [currentEmojis, setCurrentEmojis] = useState<string[]>([]);
  const [presetName, setPresetName] = useState("");

  React.useEffect(() => {
    if (editingPreset) {
      setCurrentEmojis(editingPreset.emojis);
      setPresetName(editingPreset.name);
    } else {
      setCurrentEmojis([]);
      setPresetName("");
    }
  }, [editingPreset, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-[90%] bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-primary">
            {editingPreset ? 'Edit Preset' : 'Tambah Preset'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-400"><X size={24} /></button>
        </div>

        <div className="overflow-y-scroll h-[90%]">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-2">Nama Preset</label>
              <input 
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Contoh: Reaksi Gemes"
                className="w-full p-4 mt-1 rounded-2xl border-2 border-pink-50 outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex justify-between items-end px-2 pt-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Emoji List</label>
              <span className={`text-xs font-bold ${currentEmojis.length >= 12 ? 'text-red-400' : 'text-primary'}`}>
                {currentEmojis.length} / 12
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 p-6 bg-pink-50/30 rounded-3xl min-h-40">
              {currentEmojis.map((emoji, index) => (
                <div key={index} className="group h-45 relative aspect-square bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-pink-100">
                  {emoji}
                  <button onClick={() => setCurrentEmojis(currentEmojis.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {currentEmojis.length < 12 && (
                <button 
                  onClick={() => {
                    const e = prompt("Masukkan emoji:");
                    if(e) setCurrentEmojis([...currentEmojis, e].slice(0,12));
                  }}
                  className="aspect-square border-2 border-dashed border-primary rounded-2xl flex items-center justify-center text-primary hover:bg-white transition-all"
                >
                  <Plus />
                </button>
              )}
            </div>

            <button 
              onClick={() => onSave(presetName, currentEmojis)}
              disabled={!presetName || currentEmojis.length === 0}
              className="w-full btn btn-secondary-solid mt-4 py-4"
            >
              Simpan Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function PresetReaksiPage() {
  const { presets, loading, addPreset, updatePreset, deletePreset, selectPreset } = usePresetReactions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetPreset, setTargetPreset] = useState<Preset | null>(null);
  const [isPricing, setIsPricing] = useState(false);

  const handleSave = async (name: string, emojis: string[]) => {
    if (targetPreset) {
      await updatePreset(targetPreset.id, name, emojis);
    } else {
      await addPreset(name, emojis);
    }
    setIsModalOpen(false);
  };

  if (loading) return <div className="p-10 text-center text-primary font-bold">Memuat Preset...</div>;

  return (
    <div className="p-6 min-h-screen">
      <h1 className="header-primary-2 mb-5">Preset Reaksi</h1>
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white rounded-4xl shadow-xl overflow-hidden border-2 border-pink-50">
            <table className="w-full text-left">
              <thead className="bg-primary text-white font-bold text-sm uppercase">
                <tr>
                  <th className="py-5 px-6">Nama & Reaksi</th>
                  <th className="py-5 px-6 text-center">Status</th>
                  <th className="py-5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((item) => (
                  <tr key={item.id} className="border-b border-pink-50 hover:bg-pink-50/20 transition-colors">
                    <td className="py-5 px-6">
                      <p className="font-black text-gray-700 text-sm mb-2">{item.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.emojis.map((emoji, i) => (
                          <span key={i} className="text-xl">{emoji}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <button onClick={() => selectPreset(item.id)}>
                        {item.selected_preset ? 
                          <CheckCircle2 className="text-secondary mx-auto" size={28} /> : 
                          <div className="w-6 h-6 border-2 border-gray-200 rounded-full mx-auto" />
                        }
                      </button>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => deletePreset(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={20} />
                        </button>
                        <button onClick={() => { setTargetPreset(item); setIsModalOpen(true); }} className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-xl transition-all">
                          <Edit3 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-8 flex justify-center bg-gray-50/50">
              <button 
                onClick={() => { setTargetPreset(null); setIsModalOpen(true); }} 
                className="bg-secondary hover:bg-secondary-hovered text-white px-10 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105"
              >
                <Plus size={18} /> Tambah Preset
              </button>
            </div>
          </div>
        </div>

        {/* HOW TO SECTION (Tetap sama) */}
        <div className="xl:col-span-5">
            <div className="card-secondary p-10 rounded-[3rem] bg-white border-2 border-pink-50 shadow-xl sticky top-6">
                <h2 className="text-4xl font-bold text-primary mb-6 flex items-center gap-3">How to</h2>
                <div className="space-y-4 text-gray-500 leading-relaxed">
                    <p>Pilih satu <strong>Preset Aktif</strong> dengan menekan tombol centang. Preset tersebut akan muncul sebagai shortcut utama saat kamu ingin membalas PAP pasanganmu.</p>
                </div>
            </div>
        </div>
      </div>

      <ModalPreset 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingPreset={targetPreset}
        onSave={handleSave}
      />
      
      <PricingModal isOpen={isPricing} onClose={() => setIsPricing(false)} />
    </div>
  );
}