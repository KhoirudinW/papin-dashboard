'use client'
export const dynamic = 'force-dynamic';

import Image from "next/image";
import login1 from "pub/assets/login1.png";
import login2 from "pub/assets/login2.png";
import { LoginCard } from "@/components/LoginCard";
import { useEffect } from "react";
import { useRouter } from 'next/navigation'; // Gunakan useRouter untuk Client Component
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const localSession = localStorage.getItem("papin_session");
      if (data.session?.user || localSession) {
        router.push('/dashboard');
      }
    };

    checkSession();
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
        priority
      />
    </section>
  );
}
