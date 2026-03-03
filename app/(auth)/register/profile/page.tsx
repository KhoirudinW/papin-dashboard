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
        className="absolute top-0 right-0 -z-10 h-auto w-[240px] opacity-50 md:w-[400px] md:opacity-100"
        alt="bg login 2"
        sizes="(max-width: 768px) 240px, 400px"
        priority
      />

      <LoginCard />

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

export default page
