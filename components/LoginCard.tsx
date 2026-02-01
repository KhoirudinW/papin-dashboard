'use client'
import { useAuth } from "@/hooks/useAuth";
import { useRegister, ProfileFormData } from "@/hooks/useRegister";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Info } from "lucide-react"; 
import { usePathname, useRouter } from 'next/navigation';
import Link from "next/link";

export const LoginCard = () => {
  const pathname = usePathname();
  const router = useRouter();
  
  // Deteksi mode berdasarkan URL
  const isRegisterPage = pathname === '/register';
  const mode = isRegisterPage ? 'Register' : 'Login';

  const [showPairCode, setShowPairCode] = useState(false);
  const [role, setRole] = useState<'you' | 'partner'>('you');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false); // State untuk Checkbox TAC
  
  // State Login
  const [username, setUsername] = useState('');
  const [pairCode, setPairCode] = useState('');
  
  // Hooks
  const { loginWithHash } = useAuth();
  const { registerPairs, plainCode, loading: regLoading } = useRegister();

  // State Register Data
  const [youData, setYouData] = useState<ProfileFormData>({
    full_name: '', name: '', birthday: '', role: '', hobbies: '', bio: ''
  });
  const [partnerData, setPartnerData] = useState<ProfileFormData>({
    full_name: '', name: '', birthday: '', role: '', hobbies: '', bio: ''
  });

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    if (role === 'you') {
      setYouData(prev => ({ ...prev, [field]: value }));
    } else {
      setPartnerData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    const res = await loginWithHash(username, pairCode);
    if (!res.success) alert(res.error);
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!agreed) return alert("Silakan setujui Terms & Conditions terlebih dahulu.");
    const res = await registerPairs(youData, partnerData);
    if (!res.success) alert(res.error);
  };

  const currentData = role === 'you' ? youData : partnerData;

  return (
    <div className="card-primary w-full max-w-[600px] top-1/2 -translate-y-1/2 relative flex flex-col mx-auto gap-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* MODAL KODE SETELAH REGISTER */}
      {plainCode && (
        <div className="fixed inset-0 z-[100] bg-primary/20 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center max-w-md border-4 border-primary animate-in zoom-in duration-300">
            <h3 className="header-primary-3 mb-2">Pendaftaran Berhasil! ❤️</h3>
            <p className="text-gray-500 text-sm mb-6">Simpan & bagikan kode rahasia ini ke pasanganmu:</p>
            <div className="text-4xl font-black tracking-widest text-primary bg-pink-50 p-6 rounded-3xl mb-6 border-2 border-dashed border-primary/30">
              {plainCode}
            </div>
            <button onClick={() => router.push('/')} className="btn btn-primary-solid w-full">Selesai & Login</button>
          </div>
        </div>
      )}

      {/* Header & Path-based Toggle */}
      <div className="flex flex-col items-center gap-2">
        <h2 className="header-primary-2 text-primary">{mode}</h2>
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full max-w-[300px] mb-4">
          <Link 
            href="/" 
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${!isRegisterPage ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
          >
            LOGIN
          </Link>
          <Link 
            href="/register" 
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${isRegisterPage ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
          >
            REGISTER
          </Link>
        </div>
      </div>

      {/* LOGIN FORM */}
      {!isRegisterPage && (
        <div className="w-full space-y-5 py-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-primary font-black text-[10px] uppercase tracking-widest ml-1">Username</label>
              <input 
                type="text" 
                className="inp-primary-default w-full" 
                placeholder="Username anda" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-primary font-black text-[10px] uppercase  ml-1">Pair Code</label>
              <div className="relative group">
                <input 
                  type={showPairCode ? "text" : "password"} 
                  className="inp-primary-default w-full pr-12"
                  placeholder="PAP225" 
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                />
                <button
                  type="button"
                  onClick={() => setShowPairCode(!showPairCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-primary/40 hover:text-primary transition-colors"
                >
                  {showPairCode ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
          </div>
          <button onClick={handleLogin} disabled={loading} className="btn btn-primary-solid w-full py-4 uppercase tracking-widest font-black">
            {loading ? 'Authenticating...' : 'Masuk Ke Dashboard'}
          </button>
        </div>
      )}

      {/* REGISTER FORM */}
      {isRegisterPage && (
        <div className={`w-full transition-all border duration-300 ${role === 'partner' ? 'bg-pink-50 p-4 rounded-md border-2 border-dashed border-pink-100' : 'border-transparent p-4'}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Step {role === 'you' ? '01' : '02'}</span>
                <h4 className="font-black text-gray-800 italic">{role === 'you' ? "Data Dirimu" : "Data Pasanganmu"}</h4>
            </div>
            <div className="flex gap-1">
                <div className={`h-1.5 w-6 rounded-full transition-all ${role === 'you' ? 'bg-primary' : 'bg-gray-200'}`} />
                <div className={`h-1.5 w-6 rounded-full transition-all ${role === 'partner' ? 'bg-primary' : 'bg-gray-200'}`} />
            </div>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Nama Lengkap</label>
              <input type="text" className="inp-primary-default w-full" placeholder="Contoh: Andi Wijaya" value={currentData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Username</label>
              <input type="text" className="inp-primary-default w-full" placeholder="andi_kece" value={currentData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Tgl Lahir</label>
              <input type="date" className="inp-primary-default w-full text-xs" value={currentData.birthday} onChange={(e) => handleInputChange('birthday', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Gender</label>
              <select className="inp-primary-select w-full text-xs" value={currentData.role} onChange={(e) => handleInputChange('role', e.target.value as any)}>
                <option value="">Pilih</option>
                <option value="A">Laki-laki</option>
                <option value="B">Perempuan</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Hobi</label>
              <input type="text" className="inp-primary-default w-full" placeholder="Coding, Nonton, Traveling" value={currentData.hobbies} onChange={(e) => handleInputChange('hobbies', e.target.value)} />
            </div>
            {role === 'you' &&
              (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-primary font-bold text-sm ml-1">Bio</label>
                  <textarea className="inp-primary-default w-full min-h-10" rows={1} placeholder="Katakan beberapa hal tentang mu..." value={currentData.bio} onChange={(e) => handleInputChange('bio', e.target.value)}></textarea>
                </div>
              )
            }
          </form>

          {/* Terms and Conditions Checkbox (Hanya muncul di step 2) */}
          {role === 'partner' && (
            <div className="mt-8 pt-6 border-t border-pink-100">
                <label className="flex items-center gap-3 cursor-pointer group relative">
                    <input 
                        type="checkbox" 
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 w-5 h-5 accent-primary rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-gray-500 leading-relaxed italic">
                        Saya setuju dengan <span className="text-primary underline decoration-dotted">Kebijakan Privasi</span> & keamanan data PAPin.
                    </span>

                    {/* Tooltip TAC saat Hover */}
                    <div className="absolute bottom-full left-0 mb-4 w-72 p-5 bg-white rounded-3xl shadow-2xl border border-pink-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={14} className="text-primary" />
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Privacy Summary</p>
                        </div>
                        <ul className="text-[10px] text-gray-500 space-y-2 font-medium leading-relaxed">
                            <li className="flex gap-2"><span>•</span> <span>Media dienkripsi <strong>AES-256</strong> (Server tidak bisa melihat PAP Anda).</span></li>
                            <li className="flex gap-2"><span>•</span> <span>Data hanya dibagikan eksklusif kepada pasangan Anda.</span></li>
                            <li className="flex gap-2"><span>•</span> <span>Data dihapus permanen maksimal 30 hari setelah hapus akun.</span></li>
                        </ul>
                        <div className="absolute top-full left-4 border-8 border-transparent border-t-white"></div>
                    </div>
                </label>
            </div>
          )}

          <div className="flex items-center gap-4 mt-8">
            {role === 'partner' && (
                <button className="btn btn-secondary-stroke px-6 py-4" onClick={() => setRole('you')}>Back</button>
            )}
            
            {role === 'you' ? (
                <button className="btn btn-primary-solid w-full py-4 font-black uppercase tracking-widest shadow-lg" onClick={() => setRole('partner')}>Lanjut ke Data Pasangan</button>
            ) : (
                <button 
                    onClick={handleRegister} 
                    disabled={regLoading || !agreed} 
                    className={`btn w-full py-4 font-black uppercase tracking-widest shadow-lg transition-all ${agreed ? 'btn-primary-solid' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                    {regLoading ? 'Processing...' : 'Daftar Sekarang'}
                </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}