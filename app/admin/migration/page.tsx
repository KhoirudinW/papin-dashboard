"use client";

import { useState } from 'react';
import bcrypt from 'bcryptjs';
import { Hash, Search, Copy, Check, AlertCircle, ShieldCheck, CheckCircle } from 'lucide-react';

export default function AdminHashTool() {
  // State for Converter
  const [plainInput, setPlainInput] = useState('');
  const [generatedHash, setGeneratedHash] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // State for Checker
  const [checkPlain, setCheckPlain] = useState('');
  const [checkHash, setCheckHash] = useState('');
  const [matchResult, setMatchResult] = useState<'idle' | 'match' | 'mismatch'>('idle');

  // Logic Converter
  const handleConvert = () => {
    if (!plainInput) return;
    
    // Guard: Cek apakah input sudah berupa hash (Bcrypt prefix $2a$ atau $2b$)
    if (plainInput.startsWith('$2a$') || plainInput.startsWith('$2b$')) {
      alert("Input terdeteksi sudah berbentuk Hash! Tidak bisa di-hash ulang.");
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(plainInput, salt);
    setGeneratedHash(hash);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedHash);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Logic Checker
  const handleVerify = () => {
    if (!checkPlain || !checkHash) return;
    
    try {
      const isMatch = bcrypt.compareSync(checkPlain, checkHash);
      setMatchResult(isMatch ? 'match' : 'mismatch');
    } catch (err) {
      alert("Format Hash tidak valid!");
      setMatchResult('mismatch');
    }
  };

  return (
    <div className="min-h-screen bg-cream p-6 md:p-12 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">Pair Code Admin Tools</h1>
          <p className="text-gray-500">Manual converter and security verification playground</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* SECTION 1: CONVERTER (PLAIN TO HASH) */}
          <div className="card-primary h-fit space-y-6 border-t-8 border-secondary">
            <div className="flex items-center gap-2 text-secondary font-bold">
              <Hash size={20} />
              <h2>Hash Generator</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Input Plain Text</label>
                <input 
                  type="text"
                  placeholder="Contoh: PAP-225"
                  className="inp-primary-default w-full"
                  value={plainInput}
                  onChange={(e) => setPlainInput(e.target.value)}
                />
              </div>

              <button 
                onClick={handleConvert}
                disabled={!plainInput}
                className="btn btn-primary-solid w-full"
              >
                Generate Secure Hash
              </button>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Generated Hash (Read-Only)</label>
                <div className="relative">
                  <textarea 
                    readOnly
                    value={generatedHash}
                    className="inp-primary-default w-full bg-gray-50 text-xs h-24 pt-3 resize-none font-mono"
                    placeholder="Hash akan muncul di sini..."
                  />
                  {generatedHash && (
                    <button 
                      onClick={copyToClipboard}
                      className="absolute right-2 bottom-2 p-2 bg-white rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors"
                    >
                      {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-primary" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CHECKER (VERIFICATION) */}
          <div className="card-primary h-fit space-y-6 border-t-8 border-primary">
            <div className="flex items-center gap-2 text-primary font-bold">
              <ShieldCheck size={20} />
              <h2>Hash Verifier</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Plain Code</label>
                <input 
                  type="text"
                  placeholder="Input teks asli..."
                  className="inp-primary-default w-full"
                  value={checkPlain}
                  onChange={(e) => setCheckPlain(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Hashed Code</label>
                <textarea 
                  placeholder="Paste Hash (Bcrypt) di sini..."
                  className="inp-primary-default w-full h-20 pt-3 resize-none font-mono text-xs"
                  value={checkHash}
                  onChange={(e) => setCheckHash(e.target.value)}
                />
              </div>

              <button 
                onClick={handleVerify}
                className="btn btn-secondary-solid w-full"
                disabled={!checkPlain || !checkHash}
              >
                Cek Kecocokan
              </button>

              {matchResult !== 'idle' && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                  matchResult === 'match' ? 'bg-green-100 border border-green-200 text-green-700' : 'bg-red-100 border border-red-200 text-red-700'
                }`}>
                  {matchResult === 'match' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                  <span className="font-bold">
                    {matchResult === 'match' ? 'Data Cocok! (Valid)' : 'Data Tidak Cocok!'}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        <footer className="text-center p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-xs text-primary/60 font-medium">
            Guard Active: Generator memblokir hashing ulang pada string yang sudah diawali $2a$ atau $2b$.
          </p>
        </footer>
      </div>
    </div>
  );
}