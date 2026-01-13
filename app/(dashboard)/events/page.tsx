"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EventsCard } from '@/components/EventsCard';

const dummyEvents = [
  {
    id: '1',
    title: 'Header Acara 1',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna...',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800',
    link: '#'
  },
  {
    id: '2',
    title: 'Header Acara 2',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna...',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800',
    link: '#'
  },
  {
    id: '3',
    title: 'Header Acara 3',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna...',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800',
    link: '#'
  },
  {
    id: '4',
    title: 'Header Acara 4',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna...',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800',
    link: '#'
  },
  // Tambahkan data lainnya di sini...
];

export default function AcaraPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10;

  return (
    <div className="min-h-screen p-6">
      {/* Judul Halaman */}
      <h1 className="header-primary-2 mb-4 tracking-tight">
        Acara
      </h1>

      {/* Grid Acara */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 lg:px-16">
        {dummyEvents.map((event) => (
          <EventsCard key={event.id} event={event} />
        ))}
      </div>

      {/* Pagination Bar (Sesuai Gambar) */}
      <div className="flex justify-center items-center">
        <div className="flex items-center gap-4">
          <button 
            className="p-2 rounded-full bg-white hover:bg-pink-50 text-gray-400 hover:text-primary-hovered transition-all shadow-sm border border-gray-100"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            <ChevronLeft size={20} strokeWidth={3} />
          </button>

          <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-full border border-gray-100">
            <span className="text-sm font-black text-gray-700">{currentPage}</span>
            <span className="text-xs font-bold text-gray-300">/</span>
            <span className="text-sm font-black text-gray-400">{totalPages}</span>
          </div>

          <button 
            className="p-2 rounded-full bg-white hover:bg-pink-50 text-gray-400 hover:text-primary-hovered transition-all shadow-sm border border-gray-100"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}