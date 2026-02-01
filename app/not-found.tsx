"use client"; // Wajib ditambahkan di baris pertama untuk menggunakan useRouter
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';


export default function NotFound() {
  const router = useRouter()
  return (
    <div className="min-h-screen  flex flex-col justify-center items-center bg-cream px-6 text-center">
      {/* Ilustrasi opsional */}
      <Image
        src="/assets/illustration-lost.png"
        alt="Halaman tidak ditemukan"
        width={300}
        height={300}
        className="mb-8"
        priority
      />

      <h1 className="header-primary-2 mb-3">
        Halaman ini tidak ditemukan
      </h1>

      <p className="fonts-sm text-gray max-w-[90%] mb-8">
        Sepertinya halaman yang kamu cari tidak ada atau sudah dipindahkan.
        Tidak apa-apa, mari kembali ke tempat yang familiar.
      </p>

      <button
        onClick={()=>router.back()}
        className="btn btn-primary-solid"
      >
        Kembali ke Beranda
      </button>
    </div>
  );
}
