'use client'
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation'; // Tambahkan useSearchParams
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPerson, faPersonDress } from '@fortawesome/free-solid-svg-icons';

export const GenderBtn = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Ambil value dari query parameter 'role'
  const currentRole = searchParams.get('role');

  const profiles = [
    { id: 'Man', icon: faPerson, role: 'man', href: '/profile?role=Man' },
    { id: 'Woman', icon: faPersonDress, role: 'woman', href: '/profile?role=Woman' }
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-primary-hovered font-bold text-sm md:text-base">Profile :</h4>
      <div className="flex gap-4 md:gap-6 items-center justify-center">
        {profiles.map((p) => {
          // LOGIKA BARU: 
          // 1. Cek apakah path sesuai (/profile)
          // 2. Cek apakah query role sesuai (man/woman)
          // Jika currentRole kosong (default), kita anggap 'man' yang aktif
          const isActive = pathname === '/profile' && (currentRole === p.role || (!currentRole && p.role === 'Man'));

          return (
            <Link 
              key={p.id} 
              href={p.href}
              className={`flex flex-col items-center gap-2 transition-all duration-300 ${
                isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'
              }`}
            >
              <div className={`w-16 h-20 md:w-20 md:h-24 rounded-2xl flex items-center justify-center transition-all ${
                isActive 
                  ? 'bg-primary text-white shadow-md scale-105' 
                  : 'border-2 border-primary text-primary-hovered hover:border-primary-hovered'
              }`}>
                <FontAwesomeIcon icon={p.icon} className="text-3xl" />
              </div>
              
              <span className={`font-medium text-xs md:text-sm ${
                isActive ? 'text-primary-hovered font-bold' : 'text-primary-hovered/70'
              }`}>
                {p.id}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};