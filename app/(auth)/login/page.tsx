'use client'
import Image from "next/image";
import login1 from "pub/assets/login1.png";
import login2 from "pub/assets/login2.png";
import { LoginCard } from "@/components/LoginCard";
import { useEffect } from "react";
import { redirect } from 'next/navigation';

export default function Home() {
  const session = localStorage.getItem('papin_session');
  useEffect(() => {
    if (session) {
      redirect('/dashboard'); // Tendang balik ke login jika tidak ada session
    }
  }, [session]);
  return (
    <section className="relative z-0 h-screen bg-cream p-4 md:p-7 overflow-hidden">
      <Image src={login2} className="absolute top-0 right-0 -z-10 opacity-50 md:opacity-100" alt="bg login 2" width={400} height={400}/>
      <LoginCard/>
      <Image src={login1} className="absolute bottom-0 left-0 -z-10 opacity-50 md:opacity-100" alt="bg login 1" width={400} height={400}/>
    </section>
  );
}