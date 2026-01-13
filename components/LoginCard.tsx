'use client'
import { useAuth } from "@/hooks/useAuth";
import { useRegister, ProfileFormData } from "@/hooks/useRegister";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react"; // Import ikon

export const LoginCard = () => {
  const [mode, setMode] = useState<'Login' | 'Register'>('Login');
  const [showPairCode, setShowPairCode] = useState(false);
  const [role, setRole] = useState<'you' | 'partner'>('you');
  const [loading, setLoading] = useState(false);
  
  // State Login
  const [username, setUsername] = useState('');
  const [pairCode, setPairCode] = useState('');
  
  // Hooks
  const { loginWithHash } = useAuth();
  const { registerPairs, plainCode, loading: regLoading } = useRegister();

  // State Register
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
    if (!res.success) {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    const res = await registerPairs(youData, partnerData);
    if (!res.success) {
      alert(res.error);
    }
  };

  const handleNext = () => setRole('partner');
  const handlePrev = () => setRole('you');

  const currentData = role === 'you' ? youData : partnerData;

  return (
    <div className="card-primary max-w-150 relative top-1/2 -translate-y-1/2 scale-90 md:scale-100 flex flex-col mx-auto gap-4 shadow-xl">
      
      {/* MODAL KODE SETELAH REGISTER */}
      {plainCode && (
        <div className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center max-w-5xl border-4 border-primary animate-in fade-in zoom-in duration-300">
            <h3 className="header-primary-3 mb-2">Berhasil!</h3>
            <p className="text-gray-500 text-sm mb-6">Simpan & bagikan kode ini ke pasanganmu untuk login:</p>
            <div className="text-4xl font-black tracking-widest text-primary bg-cream p-5 rounded-2xl mb-6 border-2 border-dashed border-primary/30">
              {plainCode}
            </div>
            <button onClick={() => window.location.reload()} className="btn btn-primary-solid w-full">Selesai & Login</button>
          </div>
        </div>
      )}

      {/* Header & Toggle Mode */}
      <div className="flex flex-col items-center gap-4">
        <h2 className="header-primary-2">{mode}</h2>
        <div className="h-[4px] w-full bg-primary opacity-30 border-full"></div>
        <div className="flex gap-2">
          <button 
            className={`btn btn-primary-${mode === 'Login' ? 'solid' : 'stroke'}`} 
            onClick={() => setMode('Login')}
          >
            Login
          </button>
          <button 
            className={`btn btn-primary-${mode === 'Register' ? 'solid' : 'stroke'}`} 
            onClick={() => setMode('Register')}
          >
            Register
          </button>
        </div>
      </div>

     {/* LOGIN FORM */}
    <div className={`${mode === 'Login' ? 'block' : 'hidden'} w-full p-3 space-y-4`}>
      <div className="flex flex-col gap-4">
        {/* Username Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-primary font-bold text-sm ml-1">Username</label>
          <input 
            type="text" 
            className="inp-primary-default w-full" 
            placeholder="Enter your username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* Pair Code Input dengan Toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-primary font-bold text-sm ml-1">Pair Code</label>
          <div className="relative group">
            <input 
              type={showPairCode ? "text" : "password"} // Toggle type
              className="inp-primary-default w-full uppercase pr-12" // Tambah padding kanan
              placeholder="Contoh: PAP225" 
              value={pairCode}
              onChange={(e) => setPairCode(e.target.value.toUpperCase())} // Paksa uppercase
            />
            <button
              type="button"
              onClick={() => setShowPairCode(!showPairCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-primary/10 text-primary/50 hover:text-primary transition-colors"
            >
              {!showPairCode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <button 
        onClick={handleLogin}
        disabled={loading}
        className="btn btn-primary-solid w-full sm:w-auto sm:float-right"
      >
        {loading ? 'Checking...' : 'Login'}
      </button>
    </div>

      {/* REGISTER FORM */}
      <div className={`${mode === 'Register' ? 'block' : 'hidden'} w-full p-3 transition-all duration-300 border ${role === 'partner' ? 'bg-primary/10 border-primary/20' : 'bg-white border-transparent'} rounded-xl`}>
        <div className="flex justify-between items-center mb-4">
          <h6 className={`header-primary-6 uppercase tracking-wider`}>
            Step: <span className="font-black">{role === 'you' ? "Your Data" : "Partner's Data"}</span>
          </h6>
          <span className="text-xs font-bold text-primary bg-white px-2 py-1 rounded-full border border-primary/20">
            {role === 'you' ? '1 / 2' : '2 / 2'}
          </span>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col gap-1.5">
            <label className="text-primary font-bold text-sm ml-1">Full Name</label>
            <input type="text" className="inp-primary-default w-full" placeholder="John Doe" value={currentData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-primary font-bold text-sm ml-1">Username</label>
            <input type="text" className="inp-primary-default w-full" placeholder="johndoe88" value={currentData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-primary font-bold text-sm ml-1">Birthday</label>
            <input type="date" className="inp-primary-default w-full" value={currentData.birthday} onChange={(e) => handleInputChange('birthday', e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-primary font-bold text-sm ml-1">Gender</label>
            <select className="inp-primary-select w-full" value={currentData.role} onChange={(e) => handleInputChange('role', e.target.value as any)}>
              <option value="">Select Gender</option>
              <option value="A">Laki-laki (Man)</option>
              <option value="B">Perempuan (Woman)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-primary font-bold text-sm ml-1">Hobbies</label>
            <input type="text" className="inp-primary-default w-full" placeholder="Coding, Reading, etc." value={currentData.hobbies} onChange={(e) => handleInputChange('hobbies', e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-primary font-bold text-sm ml-1">Bio</label>
            <textarea className="inp-primary-default w-full min-h-20" placeholder="Tell us about yourself..." value={currentData.bio} onChange={(e) => handleInputChange('bio', e.target.value)}></textarea>
          </div>
        </form>

        <div className="flex items-center justify-between border-t-3 border-primary/40 pt-4">
          <button 
            className="btn btn-secondary-stroke px-6" 
            onClick={role === 'you' ? handleNext : handlePrev}
          >
            {role === 'you' ? 'Next' : 'Back'}
          </button>
          
          {role === 'partner' && (
            <button 
              onClick={handleRegister}
              disabled={regLoading}
              className="btn btn-primary-solid px-8"
            >
              {regLoading ? 'Registering...' : 'Register'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}