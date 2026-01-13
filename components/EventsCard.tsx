"use client";

import React from 'react';
import Image from 'next/image';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

interface AcaraCardProps {
  event: EventItem;
}

export const EventsCard = ({ event }: AcaraCardProps) => {
  return (
    <div className="card-secondary flex flex-col p-6 rounded-[2.5rem] bg-white border-2 border-pink-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      {/* Container Gambar */}
      <div className="relative w-full h-52 rounded-3xl overflow-hidden mb-6">
        <img 
          src={event.image} 
          alt={event.title} 
          className="w-full h-full object-cover"
          width={400}
          height={200}
        />
      </div>

      {/* Konten Teks */}
      <div className="flex flex-col grow px-2">
        <h3 className="text-xl font-black text-gray-800 mb-3 leading-tight">
          {event.title}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3">
          {event.description}
        </p>
        
        {/* Tombol Pelajari Lebih Lanjut */}
        <div className="">  
          <button 
            onClick={() => window.open(event.link, '_blank')}
            className="btn btn-primary-stroke float-right"
          >
            Pelajari Lebih Lanjut
          </button>
        </div>
      </div>
    </div>
  );
};