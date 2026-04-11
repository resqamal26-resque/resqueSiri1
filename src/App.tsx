/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Globe, ChevronLeft, MapPin, User, Activity, Wand2, Clock, Trash2, Ambulance } from 'lucide-react';

type ViewState = 'selection' | 'dashboard' | 'region-selection' | 'duty-start';

const REGIONS = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 
  'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur'
];

const SAMPLE_DATA = [
  {
    namaProgram: 'Larian Amal 2026',
    tarikh: '2026-05-10',
    masa: '08:00',
    lokasi: 'Dataran Merdeka',
    namaPesakit: 'Ahmad Bin Ali',
    umur: '25',
    jantina: 'Lelaki',
    aduan: 'Sakit kaki selepas larian 5km.',
    tandaVital: '120/80, 75bpm, 99%, 36.5C',
    rawatan: 'Sapu ubat penahan sakit dan nasihatkan rehat.',
    statusKes: 'Discaj',
    namaPerawat: 'Siti Aminah',
    namaResponder: 'Abu Bakar'
  },
  {
    namaProgram: 'Konsert Jom Heboh',
    tarikh: '2026-06-15',
    masa: '21:00',
    lokasi: 'Stadium Bukit Jalil',
    namaPesakit: 'Sarah Binti Osman',
    umur: '19',
    jantina: 'Perempuan',
    aduan: 'Pening kepala dan rasa nak pengsan kerana cuaca panas.',
    tandaVital: '110/70, 85bpm, 98%, 37.0C',
    rawatan: 'Diberikan air mineral dan rehat di kawasan berhawa dingin.',
    statusKes: 'Discaj',
    namaPerawat: 'Aminah Rose',
    namaResponder: 'Bakar Mus'
  },
  {
    namaProgram: 'Hari Sukan Sekolah',
    tarikh: '2026-07-20',
    masa: '10:30',
    lokasi: 'Stadium Mini',
    namaPesakit: 'Chong Wei',
    umur: '12',
    jantina: 'Lelaki',
    aduan: 'Luka di lutut selepas terjatuh semasa larian.',
    tandaVital: '115/75, 90bpm, 100%, 36.8C',
    rawatan: 'Cuci luka dengan normal saline and balut dengan gauze.',
    statusKes: 'Discaj',
    namaPerawat: 'Tan Sri',
    namaResponder: 'Lee Kuan'
  },
  {
    namaProgram: 'Karnival Kerjaya',
    tarikh: '2026-08-05',
    masa: '14:00',
    lokasi: 'Pusat Konvensyen',
    namaPesakit: 'Muthu Samy',
    umur: '45',
    jantina: 'Lelaki',
    aduan: 'Sesak nafas secara tiba-tiba.',
    tandaVital: '150/95, 110bpm, 94%, 36.2C',
    rawatan: 'Diberikan bantuan oksigen awal dan pemantauan rapi.',
    statusKes: 'Dirujuk',
    namaPerawat: 'Dr. Zaki',
    namaResponder: 'Kumar Velu'
  },
  {
    namaProgram: 'Ekspo Buku Antarabangsa',
    tarikh: '2026-09-12',
    masa: '16:45',
    lokasi: 'PWTC',
    namaPesakit: 'Nurul Izzah',
    umur: '32',
    jantina: 'Perempuan',
    aduan: 'Sakit perut yang kuat (Gastrik).',
    tandaVital: '105/65, 70bpm, 99%, 36.6C',
    rawatan: 'Diberikan ubat cecair antasid.',
    statusKes: 'Discaj',
    namaPerawat: 'Fatimah Zahra',
    namaResponder: 'Zainal Abidin'
  },
  {
    namaProgram: 'Kejohanan Bola Sepak',
    tarikh: '2026-10-25',
    masa: '17:30',
    lokasi: 'Padang Awam',
    namaPesakit: 'Firdaus Harun',
    umur: '22',
    jantina: 'Lelaki',
    aduan: 'Terseliuh buku lali semasa perlawanan.',
    tandaVital: '125/85, 95bpm, 98%, 36.9C',
    rawatan: 'Aplikasi ais (RICE) dan balutan elastik.',
    statusKes: 'Discaj',
    namaPerawat: 'Hafizuddin',
    namaResponder: 'Razak Ali'
  },
  {
    namaProgram: 'Majlis Perasmian Bangunan',
    tarikh: '2026-11-30',
    masa: '09:15',
    lokasi: 'Menara MECC',
    namaPesakit: 'Lim Mei Lan',
    umur: '60',
    jantina: 'Perempuan',
    aduan: 'Lemah badan dan penglihatan kabur.',
    tandaVital: '90/60, 60bpm, 97%, 35.8C',
    rawatan: 'Diberikan air glukosa dan pemantauan tekanan darah.',
    statusKes: 'Dirujuk',
    namaPerawat: 'Dr. Wong',
    namaResponder: 'Chan Kwai'
  }
];

// Helper to get today's date in YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().split('T')[0];

// Helper to get current time in HH:mm
const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export default function App() {
  const [view, setView] = useState<ViewState>('selection');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [dutyInfo, setDutyInfo] = useState({
    nama: '',
    kawasan: ''
  });
  const [programInfo, setProgramInfo] = useState({
    nama: '',
    tarikh: '',
    masa: '',
    lokasi: ''
  });
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [totalCases, setTotalCases] = useState(0);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [showGuideline, setShowGuideline] = useState(false);
  const [formData, setFormData] = useState({
    namaProgram: '',
    tarikh: getTodayDate(),
    masa: '',
    lokasi: '',
    namaPesakit: '',
    umur: '',
    jantina: '',
    aduan: '',
    tandaVital: '',
    rawatan: '',
    statusKes: '',
    namaPerawat: '',
    namaResponder: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDutyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDutyInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleProgramInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProgramInfo(prev => ({ ...prev, [name]: value }));
  };

  const showNotification = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotification({ show: true, title, message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const startDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyInfo.nama || !dutyInfo.kawasan) return;
    
    const loginTime = getCurrentTime();

    // Send login notification to Telegram
    try {
      fetch('/api/notify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dutyInfo,
          programInfo,
          selectedRegion,
          loginTime
        }),
      });
    } catch (error) {
      console.error('Failed to send login notification:', error);
    }

    // Pre-fill namaResponder with duty name, leave namaPerawat empty
    setFormData(prev => ({ 
      ...prev, 
      namaResponder: dutyInfo.nama,
      namaPerawat: '' 
    }));
    
    showNotification('Log Masuk Berjaya', `Petugas ${dutyInfo.nama} telah memulakan tugas di ${dutyInfo.kawasan}.`, 'success');
    setView('dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dutyInfo,
          selectedRegion,
          systemSource: 'Single Phase System'
        }),
      });

      if (response.ok) {
        setTotalCases(prev => prev + 1);
        showNotification('Kes Dihantar ke MECC', 'Laporan kes telah berjaya dihantar ke sistem MECC Telegram.', 'success');
        setIsFormExpanded(false);
        setTimeout(() => {
          handleNewReport();
        }, 3000);
      } else {
        alert('Gagal menghantar laporan. Sila cuba lagi.');
      }
    } catch (error) {
      console.error('Error sending report:', error);
      alert('Ralat semasa menghantar laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewReport = () => {
    clearForm();
    setIsFormExpanded(true);
    // Re-fill responder name from duty info and program info if available
    setFormData(prev => ({ 
      ...prev, 
      namaResponder: dutyInfo.nama,
      namaProgram: programInfo.nama || prev.namaProgram,
      tarikh: programInfo.tarikh || prev.tarikh,
      masa: programInfo.masa || prev.masa,
      namaPerawat: '' 
    }));
  };

  const handleLogout = async () => {
    const logoutTime = getCurrentTime();
    const currentDutyInfo = { ...dutyInfo };
    const currentTotalCases = totalCases;

    showNotification('Log Keluar...', 'Menghantar ringkasan tugas ke Telegram.', 'warning');
    
    try {
      await fetch('/api/notify-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentDutyInfo,
          selectedRegion,
          logoutTime,
          totalCases: currentTotalCases
        }),
      });
    } catch (error) {
      console.error('Failed to send logout notification:', error);
    }

    setTimeout(() => {
      // Reset everything
      setView('selection');
      setSelectedRegion(null);
      setDutyInfo({ nama: '', kawasan: '' });
      setProgramInfo({ nama: '', tarikh: '', masa: '', lokasi: '' });
      setShowProgramForm(false);
      setTotalCases(0);
      setIsFormExpanded(false);
      clearForm();
    }, 1500);
  };

  const autoFillData = () => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_DATA.length);
    const sample = SAMPLE_DATA[randomIndex];
    setFormData({
      ...sample,
      tarikh: getTodayDate(),
      masa: getCurrentTime(),
      lokasi: sample.lokasi || 'Stadium Nasional',
      namaResponder: dutyInfo.nama // Keep the logged in duty name
    });
    setIsFormExpanded(true);
    showNotification('Auto Fill Berjaya', `Data sampel "${sample.namaProgram}" telah diisi.`, 'info');
  };

  const setNowTime = () => {
    setFormData(prev => ({ ...prev, masa: getCurrentTime() }));
  };

  const clearForm = () => {
    setFormData({
      namaProgram: programInfo.nama || '',
      tarikh: programInfo.tarikh || getTodayDate(),
      masa: programInfo.masa || '',
      lokasi: programInfo.lokasi || '',
      namaPesakit: '',
      umur: '',
      jantina: '',
      aduan: '',
      tandaVital: '',
      rawatan: '',
      statusKes: '',
      namaPerawat: '',
      namaResponder: dutyInfo.nama || ''
    });
  };

  const handleSingleMode = () => {
    // If already logged in, go straight to dashboard
    if (dutyInfo.nama && dutyInfo.kawasan) {
      setSelectedRegion(null);
      setView('dashboard');
      handleNewReport();
    } else {
      setView('duty-start');
    }
  };

  const handleMultiRegionMode = () => {
    setView('region-selection');
  };

  const handleBack = () => {
    // In session mode, handleBack just goes to selection but keeps dutyInfo
    // unless we want to force logout. User asked to "kekalkan session".
    // So handleBack should probably just go back to selection but keep dutyInfo if we are in dashboard?
    // Actually, let's make handleBack go to selection but keep dutyInfo.
    setView('selection');
  };

  const selectRegion = (region: string) => {
    setSelectedRegion(region);
    // If already logged in, go straight to dashboard
    if (dutyInfo.nama && dutyInfo.kawasan) {
      setView('dashboard');
      handleNewReport();
    } else {
      setView('duty-start');
    }
  };

  const GUIDELINE_STEPS = [
    { title: 'Pilih Mode', desc: 'Pilih Single Phase atau Multi-Region Mode.' },
    { title: 'Log Masuk', desc: 'Isi Nama & Pos. Notifikasi HADIR akan dihantar ke Telegram.' },
    { title: 'Aktifkan Borang', desc: 'Klik "Mula Lapor Kes" untuk membuka borang.' },
    { title: 'Isi Maklumat', desc: 'Lengkapkan butiran kes. Gunakan Auto Fill untuk bantuan.' },
    { title: 'Hantar Laporan', desc: 'Klik "Hantar Laporan ke MECC". Tunggu popup pengesahan.' },
    { title: 'Log Keluar', desc: 'Klik "Log Keluar" untuk hantar ringkasan tugas & tamat syif.' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <AnimatePresence mode="wait">
        {view === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-8"
          >
            {/* Logo Section */}
            <div className="text-center space-y-4 mb-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="w-24 h-24 bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center justify-center mx-auto relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                <Ambulance className="w-12 h-12 text-blue-600 relative z-10" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full border-4 border-white flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">MECC REPORT</h1>
                <p className="text-sm font-medium text-gray-400 uppercase tracking-[0.2em]">Medical Emergency Command Center</p>
              </div>
            </div>

            <div className="flex flex-row gap-4 justify-center">
              {/* Single Mode Card */}
              <motion.button
                onClick={handleSingleMode}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-32 h-32 bg-white p-4 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 hover:border-[#800000] cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                  <LayoutGrid className="text-blue-600 w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-900 leading-tight">Single Mode</span>
                <span className="text-[10px] text-gray-400 mt-1">View Single</span>
              </motion.button>

              {/* Multi-Region Mode Card */}
              <motion.button
                onClick={handleMultiRegionMode}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-32 h-32 bg-white p-4 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 hover:border-yellow-400 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-purple-100 transition-colors">
                  <Globe className="text-purple-600 w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-900 leading-tight">Multi-Region</span>
                <span className="text-[10px] text-purple-500 font-medium mt-1">Pilih Negeri</span>
              </motion.button>
            </div>

            {/* Guideline Button on Landing Page - Row 2 */}
            <motion.button
              onClick={() => setShowGuideline(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-[272px] bg-gray-900 py-3 px-6 rounded-xl shadow-lg hover:shadow-xl border border-gray-800 cursor-pointer transition-all duration-300 flex items-center justify-center gap-3 group"
            >
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Clock className="text-white w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">Panduan Penggunaan</p>
                <p className="text-[10px] text-gray-400">Langkah Kerja Sistem</p>
              </div>
            </motion.button>
          </motion.div>
        )}

        {view === 'region-selection' && (
          <motion.div
            key="region-selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
          >
            <button 
              onClick={handleBack}
              className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors group"
            >
              <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
              Kembali
            </button>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Pilih Negeri</h2>
            <p className="text-gray-500 mb-8">Sila pilih negeri tugasan anda untuk memulakan.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {REGIONS.map((region) => (
                <button
                  key={region}
                  onClick={() => selectRegion(region)}
                  className="p-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl hover:bg-purple-600 hover:text-white transition-all duration-200 text-center border border-gray-100"
                >
                  {region}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'duty-start' && (
          <motion.div
            key="duty-start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-gray-100"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <Activity className="text-blue-600 w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Mulakan Tugas</h2>
              <p className="text-gray-500 mt-2">Sila masukkan maklumat petugas sebelum memulakan laporan.</p>
            </div>

            <form onSubmit={startDuty} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Nama Petugas</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      required
                      type="text"
                      name="nama"
                      value={dutyInfo.nama}
                      onChange={handleDutyInputChange}
                      placeholder="Masukkan nama penuh anda"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Kawasan / Pos</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      required
                      type="text"
                      name="kawasan"
                      value={dutyInfo.kawasan}
                      onChange={handleDutyInputChange}
                      placeholder="Contoh: Pos A / Stadium"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Program Info Toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProgramForm(!showProgramForm)}
                    className={`w-full py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      showProgramForm 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-white border-dashed border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 className={`w-4 h-4 ${showProgramForm ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="text-sm font-bold">Maklumat Program (Opsional)</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform ${showProgramForm ? 'bg-blue-600 text-white rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                      <ChevronLeft className="w-3 h-3 rotate-270" />
                    </div>
                  </button>
                </div>

                {/* Program Info Form */}
                <AnimatePresence>
                  {showProgramForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4 mt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Nama Program</label>
                          <input
                            type="text"
                            name="nama"
                            value={programInfo.nama}
                            onChange={handleProgramInputChange}
                            placeholder="Nama Acara / Program"
                            className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Tarikh</label>
                            <input
                              type="date"
                              name="tarikh"
                              value={programInfo.tarikh}
                              onChange={handleProgramInputChange}
                              className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Masa</label>
                            <input
                              type="time"
                              name="masa"
                              value={programInfo.masa}
                              onChange={handleProgramInputChange}
                              className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Lokasi Program</label>
                          <input
                            type="text"
                            name="lokasi"
                            value={programInfo.lokasi}
                            onChange={handleProgramInputChange}
                            placeholder="Lokasi Spesifik Program"
                            className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <p className="text-[10px] text-blue-400 italic px-1">
                          * Maklumat ini akan diisi secara automatik dalam setiap laporan kes.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setView(selectedRegion ? 'region-selection' : 'selection')}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
                >
                  Masuk Borang
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-4xl"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      if (isFormExpanded) {
                        setIsFormExpanded(false);
                      } else {
                        handleBack();
                      }
                    }}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Kembali"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold">Dashboard Petugas</h1>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-gray-400 text-xs flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {selectedRegion ? `Negeri: ${selectedRegion}` : 'Mode: Single'}
                      </p>
                      <p className="text-blue-400 text-xs flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Petugas: {dutyInfo.nama}
                      </p>
                      <p className="text-green-400 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Pos: {dutyInfo.kawasan}
                      </p>
                      <p className="text-yellow-400 text-xs flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Kes Sesi Ini: {totalCases}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowGuideline(true)}
                      title="Panduan Penggunaan"
                      className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-all border border-gray-700"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    {!isFormExpanded && (
                      <button
                        onClick={() => setIsFormExpanded(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Lapor Kes
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Log Keluar
                    </button>
                  </div>
                  {isFormExpanded && (
                    <button
                      onClick={autoFillData}
                      title="Auto Fill Sampel Data"
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-all active:scale-95"
                    >
                      <Wand2 className="w-3 h-3" />
                      Auto Fill Data
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!isFormExpanded ? (
                  <motion.div
                    key="folded"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-12 text-center"
                  >
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Activity className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Sedia Melapor?</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      Sila klik butang di bawah untuk mula mengisi laporan kes baru bagi sesi bertugas anda.
                    </p>
                    <button
                      onClick={() => setIsFormExpanded(true)}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-200 active:scale-95"
                    >
                      <Activity className="w-5 h-5" />
                      Mula Lapor Kes
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="expanded"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-8 space-y-8 overflow-hidden"
                    onSubmit={handleSubmit}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-xl font-bold text-gray-800">Borang Laporan Kes</h2>
                      <button 
                        type="button"
                        onClick={() => setIsFormExpanded(false)}
                        className="text-blue-600 text-sm font-medium hover:underline"
                      >
                        Tutup Borang
                      </button>
                    </div>
                {/* Section 1: Maklumat Program */}
                <section>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                    <LayoutGrid className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Maklumat Program</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Program</label>
                      <input 
                        type="text" 
                        name="namaProgram"
                        value={formData.namaProgram}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                        placeholder="Contoh: Larian Amal 2026" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi Program</label>
                      <input 
                        type="text" 
                        name="lokasi"
                        value={formData.lokasi}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                        placeholder="Lokasi Acara" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tarikh</label>
                      <input 
                        type="date" 
                        name="tarikh"
                        value={formData.tarikh}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Masa</label>
                      <div className="flex gap-2">
                        <input 
                          type="time" 
                          name="masa"
                          value={formData.masa}
                          onChange={handleInputChange}
                          className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                        />
                        <button
                          type="button"
                          onClick={setNowTime}
                          className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all flex items-center gap-1 text-xs"
                        >
                          <Clock className="w-3 h-3" />
                          NOW
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 2: Maklumat Pesakit */}
                <section>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                    <User className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Maklumat Pesakit</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Penuh</label>
                      <input 
                        type="text" 
                        name="namaPesakit"
                        value={formData.namaPesakit}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
                        placeholder="Nama Pesakit" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Umur</label>
                      <input 
                        type="number" 
                        name="umur"
                        value={formData.umur}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
                        placeholder="Tahun" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Jantina</label>
                      <select 
                        name="jantina"
                        value={formData.jantina}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="">Pilih</option>
                        <option value="Lelaki">Lelaki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Section 3: Penilaian & Rawatan */}
                <section>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                    <Activity className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Penilaian & Rawatan</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Aduan / Simptom</label>
                        <textarea 
                          name="aduan"
                          value={formData.aduan}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all h-24" 
                          placeholder="Nyatakan aduan pesakit..."
                        ></textarea>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tanda Vital (BP, HR, SpO2, Temp)</label>
                        <input 
                          type="text" 
                          name="tandaVital"
                          value={formData.tandaVital}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                          placeholder="Contoh: 120/80, 80bpm, 98%, 36.5C" 
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rawatan Diberikan</label>
                        <textarea 
                          name="rawatan"
                          value={formData.rawatan}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all h-44" 
                          placeholder="Nyatakan rawatan yang telah diberikan..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 4: Status & Pengesahan */}
                <section>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Status & Pengesahan</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status Kes</label>
                      <select 
                        name="statusKes"
                        value={formData.statusKes}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="">Pilih Status</option>
                        <option value="Discaj">Discaj</option>
                        <option value="Dirujuk">Dirujuk ke Hospital</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Perawat</label>
                      <input 
                        type="text" 
                        name="namaPerawat"
                        value={formData.namaPerawat}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" 
                        placeholder="Nama Staff" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Responder</label>
                      <input 
                        type="text" 
                        name="namaResponder"
                        value={formData.namaResponder}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" 
                        placeholder="Nama Responder" 
                      />
                    </div>
                  </div>
                </section>

                <div className="pt-6 flex gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Menghantar...
                      </>
                    ) : (
                      'Hantar Laporan'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormExpanded(false)}
                    className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )}
  </AnimatePresence>

      {/* Guideline Modal */}
      <AnimatePresence>
        {showGuideline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowGuideline(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">Panduan Penggunaan</h3>
                </div>
                <button 
                  onClick={() => setShowGuideline(false)}
                  className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 rotate-90" />
                </button>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  {GUIDELINE_STEPS.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm border border-blue-100">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{step.title}</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-blue-600" />
                    Tips Pantas
                  </h4>
                  <ul className="text-xs text-gray-500 space-y-1.5 list-disc ml-4">
                    <li>Gunakan <b>Auto Fill</b> untuk simulasi data pantas.</li>
                    <li>Sesi petugas dikekalkan selagi tidak log keluar.</li>
                    <li>Pastikan internet stabil semasa menghantar laporan.</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => setShowGuideline(false)}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                >
                  Faham & Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Notification Popup */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-gray-100">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                notification.type === 'success' ? 'bg-green-50' : 
                notification.type === 'warning' ? 'bg-red-50' : 'bg-blue-50'
              }`}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                >
                  {notification.type === 'success' ? (
                    <Activity className="text-green-600 w-10 h-10" />
                  ) : notification.type === 'warning' ? (
                    <Trash2 className="text-red-600 w-10 h-10" />
                  ) : (
                    <User className="text-blue-600 w-10 h-10" />
                  )}
                </motion.div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{notification.title}</h3>
              <p className="text-gray-500">{notification.message}</p>
              <div className="mt-6 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  className={`h-full ${
                    notification.type === 'success' ? 'bg-green-500' : 
                    notification.type === 'warning' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
