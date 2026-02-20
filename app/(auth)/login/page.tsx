'use client'
export const dynamic = 'force-dynamic';

import Image from "next/image";
import login1 from "pub/assets/login1.png";
import login2 from "pub/assets/login2.png";
import { LoginCard } from "@/components/LoginCard";
import { useEffect } from "react";
import { useRouter } from 'next/navigation'; // Gunakan useRouter untuk Client Component

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Cek session hanya setelah komponen masuk ke browser (mount)
    const sessionStr = localStorage.getItem('papin_session');
    
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        // Jika session ada dan valid, arahkan ke dashboard
        if (session.data) {
          router.push('/dashboard');
        }
      } catch {
        console.error("Invalid session format");
      }
    }
  }, [router]);

  return (
    <section className="relative z-0 h-screen bg-cream p-4 md:p-7 overflow-hidden">
      <Image 
        src={login2} 
        className="absolute top-0 right-0 -z-10 h-auto w-[240px] opacity-50 md:w-[400px] md:opacity-100" 
        alt="bg login 2" 
        sizes="(max-width: 768px) 240px, 400px"
        priority // Tambahkan priority untuk image yang muncul di atas
      />
      
      <LoginCard/>
      
      <Image 
        src={login1} 
        className="absolute bottom-0 left-0 -z-10 h-auto w-[240px] opacity-50 md:w-[400px] md:opacity-100" 
        alt="bg login 1" 
        sizes="(max-width: 768px) 240px, 400px"
      />
    </section>
  );
}
