'use client'

import Link from "next/link";
import { Eye, EyeOff, Info, UserRound, UsersRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRegister, ProfileFormData, RegisterMode } from "@/hooks/useRegister";

export const LoginCard = () => {
  const pathname = usePathname();
  const router = useRouter();

  const isRegisterPage = pathname.startsWith("/register");
  const mode = isRegisterPage ? "Register" : "Login";

  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "pair_code">("pair_code");
  const [role, setRole] = useState<"you" | "partner">("you");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pairCode, setPairCode] = useState("");

  const [registerMode, setRegisterMode] = useState<RegisterMode>("pair_now");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const { loginWithPassword, loginWithPairCode } = useAuth();
  const {
    createAuthAccount,
    loginForSetup,
    completeProfileSetup,
    refreshAuthStage,
    plainCode,
    loading: regLoading,
    authStage,
    authEmail,
  } = useRegister();

  const [youData, setYouData] = useState<ProfileFormData>({
    full_name: "",
    name: "",
    birthday: "",
    role: "",
    hobbies: "",
    bio: "",
  });
  const [partnerData, setPartnerData] = useState<ProfileFormData>({
    full_name: "",
    name: "",
    birthday: "",
    role: "",
    hobbies: "",
    bio: "",
  });

  const currentData = role === "you" ? youData : partnerData;
  const oppositeRole = youData.role === "A" ? "B" : youData.role === "B" ? "A" : "";
  const isPartnerGenderLocked = registerMode === "pair_now" && role === "partner";
  const isRegisterSetupReady = authStage === "verified";
  const isProfileSetupRoute = pathname === "/register/profile";
  const showAccountStep = !isProfileSetupRoute || !isRegisterSetupReady;

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    if (role === "you") {
      setYouData((prev) => ({ ...prev, [field]: value }));

      if (field === "role" && registerMode === "pair_now") {
        const normalizedRole = value as ProfileFormData["role"];
        const partnerRole = normalizedRole === "A" ? "B" : normalizedRole === "B" ? "A" : "";
        setPartnerData((prev) => ({ ...prev, role: partnerRole }));
      }
      return;
    }

    if (field === "role" && isPartnerGenderLocked) {
      return;
    }

    setPartnerData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    setLoading(true);
    const res =
      loginMethod === "password"
        ? await loginWithPassword(identifier, password)
        : await loginWithPairCode(identifier, pairCode);
    if (!res.success) {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleCreateAccount = async () => {
    const accountEmailInput = (registerEmail || authEmail).trim();
    const res = await createAuthAccount({
      email: accountEmailInput,
      password: registerPassword,
    });

    if (!res.success) {
      alert(res.error);
      return;
    }

    if (res.requiresEmailConfirmation) {
      alert("Akun berhasil dibuat. Cek email untuk verifikasi, lalu klik tombol 'Saya Sudah Verifikasi'.");
      return;
    }

    alert("Akun sudah terverifikasi. Lanjut ke tahap setup profile.");
  };

  const handleVerifyAndContinue = async () => {
    const accountEmailInput = (registerEmail || authEmail).trim();
    const res = await loginForSetup({
      email: accountEmailInput,
      password: registerPassword,
    });

    if (!res.success) {
      alert(res.error);
      return;
    }

    await refreshAuthStage();
    alert("Email sudah terverifikasi. Lanjut pilih mode pendaftaran profile.");
  };

  const handleCompleteRegister = async () => {
    if (!isRegisterSetupReady) {
      alert("Selesaikan tahap verifikasi email dulu.");
      return;
    }

    if (!agreed) {
      alert("Silakan setujui Terms & Conditions terlebih dahulu.");
      return;
    }

    const res = await completeProfileSetup({
      mode: registerMode,
      you: youData,
      partner: registerMode === "pair_now" ? partnerData : null,
    });

    if (!res.success) {
      alert(res.error);
      return;
    }

    if (!res.code) {
      router.push("/dashboard");
    }
  };

  const renderProfileForm = () => (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-col gap-1">
        <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Nama Lengkap</label>
        <input
          type="text"
          className="inp-primary-default w-full"
          placeholder="Contoh: Andi Wijaya"
          value={currentData.full_name}
          onChange={(event) => handleInputChange("full_name", event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Username</label>
        <input
          type="text"
          className="inp-primary-default w-full"
          placeholder="andi_kece"
          value={currentData.name}
          onChange={(event) => handleInputChange("name", event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Tgl Lahir</label>
        <input
          type="date"
          className="inp-primary-default w-full text-xs"
          value={currentData.birthday}
          onChange={(event) => handleInputChange("birthday", event.target.value)}
        />
      </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Gender</label>
        {isPartnerGenderLocked ? (
          <input
            type="text"
            className="inp-primary-default w-full text-xs bg-gray-100 cursor-not-allowed"
            value={oppositeRole === "A" ? "Laki-laki" : oppositeRole === "B" ? "Perempuan" : "-"}
            readOnly
          />
        ) : (
          <select
            className="inp-primary-select w-full text-xs"
            value={currentData.role}
            onChange={(event) => handleInputChange("role", event.target.value as ProfileFormData["role"])}
          >
            <option value="">Pilih</option>
            <option value="A">Laki-laki</option>
            <option value="B">Perempuan</option>
          </select>
        )}
      </div>
      <div className="flex flex-col gap-1 md:col-span-2">
        <label className="text-gray-400 font-black text-[10px] uppercase ml-1">Hobi</label>
        <input
          type="text"
          className="inp-primary-default w-full"
          placeholder="Coding, Nonton, Traveling"
          value={currentData.hobbies}
          onChange={(event) => handleInputChange("hobbies", event.target.value)}
        />
      </div>
      {role === "you" && (
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-primary font-bold text-sm ml-1">Bio</label>
          <textarea
            className="inp-primary-default w-full min-h-10"
            rows={1}
            placeholder="Katakan beberapa hal tentangmu..."
            value={currentData.bio}
            onChange={(event) => handleInputChange("bio", event.target.value)}
          />
        </div>
      )}
    </form>
  );

  return (
    <div className="card-primary w-full max-w-[600px] top-1/2 -translate-y-1/2 relative flex flex-col mx-auto gap-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {plainCode && (
        <div className="fixed inset-0 z-[100] bg-primary/20 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center max-w-md border-4 border-primary animate-in zoom-in duration-300">
            <h3 className="header-primary-3 mb-2">Pendaftaran Berhasil</h3>
            <p className="text-gray-500 text-sm mb-6">Simpan kode pair ini untuk dipakai di fitur keamanan:</p>
            <div className="text-4xl font-black tracking-widest text-primary bg-pink-50 p-6 rounded-3xl mb-6 border-2 border-dashed border-primary/30">
              {plainCode}
            </div>
            <button onClick={() => router.push("/dashboard")} className="btn btn-primary-solid w-full">
              Masuk Dashboard
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <h2 className="header-primary-2 text-primary">{mode}</h2>
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full max-w-[300px] mb-4">
          <Link
            href="/"
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${!isRegisterPage ? "bg-white shadow-sm text-primary" : "text-gray-400"}`}
          >
            LOGIN
          </Link>
          <Link
            href="/register"
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${isRegisterPage ? "bg-white shadow-sm text-primary" : "text-gray-400"}`}
          >
            REGISTER
          </Link>
        </div>
      </div>

      {!isRegisterPage && (
        <div className="w-full space-y-5 py-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-primary font-black text-[10px] uppercase tracking-widest ml-1">
                Email / Username
              </label>
              <input
                type="text"
                className="inp-primary-default w-full"
                placeholder="contoh@email.com atau username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-primary font-black text-[10px] uppercase ml-1">
                {loginMethod === "password" ? "Password" : "Pair Code"}
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="inp-primary-default w-full pr-12"
                  placeholder={loginMethod === "password" ? "Masukkan password" : "Masukkan pair code"}
                  value={loginMethod === "password" ? password : pairCode}
                  onChange={(event) =>
                    loginMethod === "password"
                      ? setPassword(event.target.value)
                      : setPairCode(event.target.value.toUpperCase())
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-primary/40 hover:text-primary transition-colors"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              {loginMethod === "pair_code" ? (
                <button
                  type="button"
                  onClick={() => setLoginMethod("password")}
                  className="text-left text-blue-600 text-xs font-semibold mt-1 hover:underline"
                >
                  With passwords
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoginMethod("pair_code")}
                  className="text-left text-blue-600 text-xs font-semibold mt-1 hover:underline"
                >
                  With pair code
                </button>
              )}
            </div>
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn btn-primary-solid w-full py-4 uppercase tracking-widest font-black"
          >
            {loading ? "Authenticating..." : "Masuk Ke Dashboard"}
          </button>
        </div>
      )}

      {isRegisterPage && (
        <div className="w-full border-transparent p-4 space-y-6">
          {showAccountStep ? (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Tahap 1 - Buat Akun</p>
                <p className="text-[11px] text-gray-500 font-medium">
                  Daftarkan email dan password dulu, lalu verifikasi email.
                </p>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    authStage === "verified"
                      ? "bg-green-50 text-green-700"
                      : authStage === "unverified"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {authStage === "verified"
                    ? "Email Terverifikasi"
                    : authStage === "unverified"
                      ? "Menunggu Verifikasi Email"
                      : "Belum Buat Akun"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-primary font-black text-[10px] uppercase tracking-widest ml-1">Email Akun</label>
                  <input
                    type="email"
                    className="inp-primary-default w-full"
                    placeholder="email untuk login akun"
                    value={registerEmail || authEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-primary font-black text-[10px] uppercase tracking-widest ml-1">Password Akun</label>
                  <div className="relative group">
                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      className="inp-primary-default w-full pr-12"
                      placeholder="minimal 6 karakter"
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-primary/40 hover:text-primary transition-colors"
                    >
                      {showRegisterPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={regLoading}
                  className="btn btn-primary-solid w-full py-4 font-black uppercase tracking-widest"
                >
                  {regLoading ? "Processing..." : "Buat Akun"}
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndContinue}
                  disabled={regLoading}
                  className="btn btn-secondary-stroke w-full py-4 font-black uppercase tracking-widest"
                >
                  Saya Sudah Verifikasi
                </button>
              </div>

              {!isRegisterSetupReady && (
                <div className="text-[11px] font-bold text-gray-500 p-4 border border-dashed border-gray-200 rounded-2xl">
                  Setelah verifikasi email, klik <span className="text-primary">Saya Sudah Verifikasi</span> untuk masuk ke tahap setup profile.
                </div>
              )}
            </>
          ) : (
            <div className="text-[11px] font-bold text-green-700 p-4 border border-green-100 bg-green-50 rounded-2xl">
              Email kamu sudah terverifikasi. Lanjut langsung ke tahap setup profile.
            </div>
          )}

          {isRegisterSetupReady && (
            <>
              <div className="space-y-4 pt-2 border-t border-pink-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Tahap 2 - Setup Profile
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterMode("pair_now");
                      setRole("you");
                      if (youData.role) {
                        const partnerRole = youData.role === "A" ? "B" : "A";
                        setPartnerData((prev) => ({ ...prev, role: partnerRole }));
                      }
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${registerMode === "pair_now" ? "border-primary bg-pink-50" : "border-gray-100 bg-white"}`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
                        <UsersRound size={18} />
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterMode("solo");
                      setRole("you");
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${registerMode === "solo" ? "border-primary bg-pink-50" : "border-gray-100 bg-white"}`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
                        <UserRound size={18} />
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div
                className={`w-full transition-all border duration-300 ${registerMode === "pair_now" && role === "partner" ? "bg-pink-50 p-4 rounded-md border-2 border-dashed border-pink-100" : "border-transparent p-4"}`}
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      Step {registerMode === "solo" ? "01" : role === "you" ? "01" : "02"}
                    </span>
                    <h4 className="font-black text-gray-800 italic">
                      {role === "you" ? "Data Dirimu" : "Data Pasanganmu"}
                    </h4>
                  </div>
                  {registerMode === "pair_now" && (
                    <div className="flex gap-1">
                      <div className={`h-1.5 w-6 rounded-full transition-all ${role === "you" ? "bg-primary" : "bg-gray-200"}`} />
                      <div className={`h-1.5 w-6 rounded-full transition-all ${role === "partner" ? "bg-primary" : "bg-gray-200"}`} />
                    </div>
                  )}
                </div>

                {renderProfileForm()}

                {((registerMode === "pair_now" && role === "partner") || registerMode === "solo") && (
                  <div className="mt-8 pt-6 border-t border-pink-100">
                    <label className="flex items-center gap-3 cursor-pointer group relative">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(event) => setAgreed(event.target.checked)}
                        className="mt-1 w-5 h-5 accent-primary rounded-lg cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-gray-500 leading-relaxed italic">
                        Saya setuju dengan <span className="text-primary underline decoration-dotted">Kebijakan Privasi</span> & keamanan data PAPin.
                      </span>

                      <div className="absolute bottom-full left-0 mb-4 w-72 p-5 bg-white rounded-3xl shadow-2xl border border-pink-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                        <div className="flex items-center gap-2 mb-3">
                          <Info size={14} className="text-primary" />
                          <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                            Privacy Summary
                          </p>
                        </div>
                        <ul className="text-[10px] text-gray-500 space-y-2 font-medium leading-relaxed">
                          <li className="flex gap-2"><span>*</span> <span>Media dienkripsi AES-256.</span></li>
                          <li className="flex gap-2"><span>*</span> <span>Data dibagikan hanya ke pasangan.</span></li>
                          <li className="flex gap-2"><span>*</span> <span>Data dihapus permanen setelah periode retensi.</span></li>
                        </ul>
                        <div className="absolute top-full left-4 border-8 border-transparent border-t-white" />
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-8">
                  {registerMode === "pair_now" && role === "partner" && (
                    <button type="button" className="btn btn-secondary-stroke px-6 py-4" onClick={() => setRole("you")}>
                      Back
                    </button>
                  )}

                  {registerMode === "pair_now" && role === "you" ? (
                    <button
                      type="button"
                      disabled={!youData.role}
                      className="btn btn-primary-solid w-full py-4 font-black uppercase tracking-widest shadow-lg"
                      onClick={() => setRole("partner")}
                    >
                      Lanjut ke Data Pasangan
                    </button>
                  ) : (
                    <button
                      onClick={handleCompleteRegister}
                      disabled={regLoading || !agreed}
                      className={`btn w-full py-4 font-black uppercase tracking-widest shadow-lg transition-all ${agreed ? "btn-primary-solid" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                    >
                      {regLoading ? "Processing..." : registerMode === "pair_now" ? "Daftar Berdua" : "Daftar Sekarang"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
