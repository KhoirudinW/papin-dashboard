"use client"; // Wajib karena menggunakan state

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/Navbar";
import { Menu, X } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 overflow-hidden relative">
        {/* Sidebar - Desktop: Selalu tampil | Mobile: Slide-in */}
        <div className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <Sidebar />
        </div>

        {/* Overlay untuk Mobile saat Sidebar terbuka */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Area Konten Kanan */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center bg-white md:bg-transparent">
            {/* Tombol Hamburger Mobile */}
            <button 
              className="p-4 md:hidden text-primary-hovered"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={28} />
            </button>
            
            <div className="flex-1">
              <TopNav />
            </div>
          </div>

          <main className="p-2 md:p-8 pt-3 overflow-y-auto custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}