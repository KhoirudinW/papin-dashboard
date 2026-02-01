'use client'
export const dynamic = 'force-dynamic';


import React from 'react'
import { LoginCard } from '@/components/LoginCard';
import Image from 'next/image';
import login1 from "pub/assets/login1.png";
import login2 from "pub/assets/login2.png";

function page() {
  
    return (
        <section className="relative z-0 h-screen bg-cream p-4 md:p-7 overflow-hidden">
          <Image
            src={login2} 
            className="absolute top-0 right-0 -z-10 opacity-50 md:opacity-100" 
            alt="bg login 2" 
            width={400} 
            height={400}
            priority // Tambahkan priority untuk image yang muncul di atas
          />
          
          <LoginCard/>
          
          <Image
            src={login1} 
            className="absolute bottom-0 left-0 -z-10 opacity-50 md:opacity-100" 
            alt="bg login 1" 
            width={400} 
            height={400}
          />
        </section>
      );
}

export default page