/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deployment Fix Version: 1.0.2 - Triggering fresh build to resolve platform policy sync issues.
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, Globe, ChevronLeft, MapPin, Map, User, Activity, 
  Wand2, Clock, Trash2, Ambulance, Cloud, Check, RefreshCw,
  Search, Eye, BookOpen, FileText, ChevronRight, Filter, Settings,
  Bot, Send, Shield, Edit2, LogOut, Users, BarChart3, ChevronDown,
  Camera, Image as ImageIcon, Plus, X, LayoutDashboard, UserMinus, 
  AlertTriangle, Zap, Share2, Download, FileCheck, FileBarChart
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from './lib/supabase';
import { db, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, getDocs, limit, query, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

type ViewState = 'selection' | 'dashboard' | 'region-selection' | 'duty-start' | 'confirmation' | 'mecc';
type DashboardTab = 'form' | 'reports';

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

// Helper to get today's date in YYYY-MM-DD for KL
const getTodayDate = () => {
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(new Date());
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  return `${year}-${month}-${day}`;
};

// Helper to get current time in HH:mm for KL
const getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-GB', { 
    timeZone: 'Asia/Kuala_Lumpur', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};

export default function App() {
  // Helper function to get current KL Time
  const getKLTime = () => {
    return new Date().toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur" });
  };

  const [showSettings, setShowSettings] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{table: string, status: 'testing' | 'success' | 'error', message: string}[]>([]);

  // Individual collapsible accordion states - defaulted to false so titles are shown only by default
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isFirebaseOpen, setIsFirebaseOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);

  // Firebase Auth states
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseAuthLoading, setFirebaseAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setFirebaseAuthLoading(false);
    });
    
    // Enforcement of geolocation access early on
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          console.log("Geolocation access granted early.");
        },
        (error) => {
          console.warn("Geolocation access denied or failed early:", error);
          if (error.code === 1) {
            // Only show notification if they explicitly denied it, to encourage enabling it
            showNotification('Akses Lokasi', 'Sila benarkan akses lokasi untuk fungsi laporan yang tepat.', 'warning');
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => unsubscribe();
  }, []);

  const loginWithGoogleFirebase = async () => {
    try {
      setFirebaseTestStatus('testing');
      setFirebaseTestMessage('Melakukan Log Masuk...');
      const result = await signInWithPopup(auth, googleProvider);
      setFirebaseUser(result.user);
      setFirebaseTestStatus('idle');
      setFirebaseTestMessage(`Log masuk berjaya sebagai ${result.user.displayName}`);
      showNotification('Log Masuk Berjaya', `Selamat datang ${result.user.displayName}!`, 'success');
    } catch (error: any) {
      console.error('Firebase Auth Error:', error);
      setFirebaseTestStatus('error');
      setFirebaseTestMessage(`Gagal Log Masuk: ${error.message || 'Ralat tidak diketahui'}`);
      showNotification('Ralat Log Masuk', 'Gagal mendaftar masuk menggunakan Google.', 'warning');
    }
  };

  const logoutFirebase = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setFirebaseFetchedReports([]);
      setFirebaseTestStatus('idle');
      setFirebaseTestMessage('Telah log keluar dari pangkalan data.');
      showNotification('Log Keluar Berjaya', 'Log keluar dari Google berjaya.', 'info');
    } catch (error: any) {
      console.error('Firebase Logout Error:', error);
    }
  };

  // Firebase Firestore Connection Test States
  const [firebaseTestStatus, setFirebaseTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [firebaseTestMessage, setFirebaseTestMessage] = useState<string>('');
  const [firebaseFetchedReports, setFirebaseFetchedReports] = useState<any[]>([]);

  const testFirebaseConnection = async () => {
    if (!firebaseUser) {
      showNotification(
        'Log Masuk Diperlukan',
        'Sila log masuk terlebih dahulu sebelum menguji sambungan pangkalan data.',
        'warning'
      );
      setFirebaseTestStatus('error');
      setFirebaseTestMessage('Sambungan dihalang. Sila log masuk dengan Google di bawah.');
      return;
    }

    setFirebaseTestStatus('testing');
    setFirebaseTestMessage('Menguji sambungan ke pangkalan data...');
    setFirebaseFetchedReports([]);

    try {
      const reportsCol = collection(db, 'reports');
      const q = query(reportsCol, limit(5));
      const querySnapshot = await getDocs(q);
      
      const reportsList: any[] = [];
      querySnapshot.forEach((doc) => {
        reportsList.push({ id: doc.id, ...doc.data() });
      });

      setFirebaseFetchedReports(reportsList);
      setFirebaseTestStatus('success');
      setFirebaseTestMessage(`Sambungan ke pangkalan data BERJAYA! Berjaya memuatkan ${reportsList.length} rekod.`);
    } catch (error: any) {
      console.error('Firebase test error:', error);
      let errMsg = error.message || 'Gagal menyambung ke pangkalan data.';
      try {
        handleFirestoreError(error, OperationType.GET, 'reports');
      } catch (richError: any) {
        errMsg = richError.message;
      }
      setFirebaseTestStatus('error');
      setFirebaseTestMessage(`Ralat Pangkalan Data: ${errMsg}`);
    }
  };

  const [isTelegramEnabled, setIsTelegramEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isTelegramEnabled');
    return saved !== 'false';
  });
  const [telegramTestStatus, setTelegramTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [telegramTestMessage, setTelegramTestMessage] = useState<string>('');

  const toggleTelegram = async () => {
    const newState = !isTelegramEnabled;
    const currentKLTime = getKLTime();
    
    if (newState === false) {
      // Send a direct final message to Telegram before completely disconnecting the integration.
      try {
        const disconnectMsg = `🔌 *SISTEM DIKEMASKINI: DISCONNECT* 🔌\n\nSistem ResQ telah memutuskan sambungan (disconnect) dengan bot Telegram.\n\n📅 Tarikh & Masa: ${currentKLTime}\n⚠️ Status: Offline / Tidak Aktif`;
        await fetch('/api/send-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: disconnectMsg,
          }),
        });
      } catch (error) {
        console.error('Failed to notify Telegram of disconnect:', error);
      }

      setIsTelegramEnabled(false);
      localStorage.setItem('isTelegramEnabled', 'false');
      showNotification(
        'Sambungan Diputuskan',
        `Sistim web dinyahaktifkan dari bot Telegram pada ${currentKLTime}.`,
        'warning'
      );
    } else {
      setIsTelegramEnabled(true);
      localStorage.setItem('isTelegramEnabled', 'true');
      showNotification(
        'Sambungan Diaktifkan',
        'Sambungan Telegram diaktifkan semula.',
        'success'
      );
    }
  };

  const testTelegramConnection = async () => {
    if (!isTelegramEnabled) {
      showNotification(
        'Ujian Penghantaran Disekat',
        'Sambungan Telegram Bot telah dinyahaktifkan. Sila aktifkan semula sambungan terlebih dahulu untuk menjalankan ujian.',
        'warning'
      );
      setTelegramTestStatus('error');
      setTelegramTestMessage('Sambungan di luar talian. Sila aktifkan suis Telegram untuk menguji.');
      return;
    }

    setTelegramTestStatus('testing');
    setTelegramTestMessage('Menghantar mesej ujian ke Telegram via server...');

    try {
      const response = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_number: 'TEST-CONNECTION',
          dutyInfo: { nama: 'SYSTEM TEST', kawasan: 'SERVER CHECK' },
          selectedRegion: 'HQ',
          namaProgram: 'TEST BOT',
          lokasi: 'VIRTUAL',
          tarikh: new Date().toLocaleDateString(),
          masa: new Date().toLocaleTimeString(),
          namaPesakit: 'UJIAN SAMBUNGAN',
          umur: '-',
          jantina: '-',
          aduan: 'Ini adalah mesej ujian sambungan bot Telegram.',
          tandaVital: 'OK',
          rawatan: 'Tiada',
          statusKes: 'UJIAN',
          namaPerawat: 'BOT CHECKER',
          namaResponder: 'ADMIN'
        })
      });

      const result = await response.json();
      if (result.success) {
        setTelegramTestStatus('success');
        setTelegramTestMessage('Sambungan ke bot Telegram BERJAYA! Mesej ujian telah dihantar.');
      } else {
        setTelegramTestStatus('error');
        setTelegramTestMessage(`Ralat Telegram: ${result.error || 'Gagal menghantar mesej.'}`);
      }
    } catch (error: any) {
      console.error('Telegram test error:', error);
      setTelegramTestStatus('error');
      setTelegramTestMessage(`Ralat Sambungan: ${error.message || 'Ralat tidak diketahui.'}`);
    }
  };

  const testDatabase = async () => {
    setDbTestResult([
      { table: 'reports', status: 'testing', message: 'Menguji sambungan...' },
      { table: 'attendance', status: 'testing', message: 'Menguji sambungan...' }
    ]);

    // Test reports table
    try {
      const { error } = await supabase.from('reports').select('id').limit(1);
      setDbTestResult(prev => prev.map(item => 
        item.table === 'reports' 
          ? { table: 'reports', status: error ? 'error' : 'success', message: error ? error.message : 'Sambungan berjaya ke jadual reports' } 
          : item
      ));
    } catch (err: any) {
      setDbTestResult(prev => prev.map(item => 
        item.table === 'reports' ? { table: 'reports', status: 'error', message: err.message } : item
      ));
    }

    // Test attendance table
    try {
      const { error } = await supabase.from('attendance').select('id').limit(1);
      setDbTestResult(prev => prev.map(item => 
        item.table === 'attendance' 
          ? { table: 'attendance', status: error ? 'error' : 'success', message: error ? error.message : 'Sambungan berjaya ke jadual attendance' } 
          : item
      ));
    } catch (err: any) {
      setDbTestResult(prev => prev.map(item => 
        item.table === 'attendance' ? { table: 'attendance', status: 'error', message: err.message } : item
      ));
    }
  };

  const [isTestMode, setIsTestMode] = useState(false);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [firebaseAttendanceId, setFirebaseAttendanceId] = useState<string | null>(null);
  const [loginTime, setLoginTime] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isProgramReportModalOpen, setIsProgramReportModalOpen] = useState(false);

  const autofillSampleData = () => {
    setDutyInfo({
      nama: 'Petugas Sampel (TEST)',
      kawasan: 'Zon Simulasi Kuala Lumpur'
    });
    setProgramInfo({
      nama: 'Simulasi Kecemasan Mega 2026',
      lokasi: 'Stadium Nasional Bukit Jalil',
      tarikh: getTodayDate(),
      masa: getCurrentTime()
    });
    showNotification('Data Sampel Diisi', 'Maklumat simulasi telah diisi secara automatik.', 'success');
  };
  const [view, setView] = useState<ViewState>('selection');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('form');
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
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
  const fetchAttendanceRecords = async () => {
    try {
      const { data, error } = await supabase.from('attendance').select('*').order('created_at', { ascending: false });
      if (data) {
        setAttendanceRecords(data.map(item => ({
          ...item,
          id: item.id.toString(),
          nama: item.nama,
          kawasan: item.kawasan,
          loginTime: item.login_time || item.masa_log_masuk,
          logoutTime: item.logout_time || item.masa_log_keluar,
          tarikh: item.tarikh || new Date(item.created_at).toLocaleDateString()
        })));
      } else {
        const q = query(collection(db, 'attendance'), limit(100));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as any[];
        setAttendanceRecords(docs);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  useEffect(() => {
    if (isProgramReportModalOpen) {
      fetchAttendanceRecords();
    }
  }, [isProgramReportModalOpen]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [notification, setNotification] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [totalCases, setTotalCases] = useState(0);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [showGuideline, setShowGuideline] = useState(false);
  const [showVitalReference, setShowVitalReference] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isLinksExpanded, setIsLinksExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showModeSelection, setShowModeSelection] = useState<boolean>(() => {
    const saved = localStorage.getItem('resq_show_mode_selection');
    return saved === null ? false : saved === 'true';
  });
  const [persistentMode, setPersistentMode] = useState<'single' | 'multi' | null>(() => {
    const saved = localStorage.getItem('resq_persistent_mode');
    return saved === null ? 'single' : (saved as 'single' | 'multi');
  });

  // Helper to generate Case Number: [DDMMYY]Kes-[NoKes][Checkpoint][NoKesCheckpoint]
  const generateCaseNumber = (currentReports: any[], isTest: boolean, checkpoint?: string) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    const datePrefix = `${dd}${mm}${yy}`;
    
    const todayStr = getTodayDate();
    
    // Filter reports for today and the same mode
    const todayReports = currentReports.filter(r => {
      const reportDate = r.tarikh || (r.created_at ? r.created_at.split('T')[0] : '');
      return reportDate === todayStr && (isTest ? r.mode === 'test' : r.mode === 'live');
    });

    const globalCount = todayReports.length + 1;
    const paddedGlobalCount = String(globalCount).padStart(3, '0');
    
    let caseNo = `${datePrefix}Kes-${paddedGlobalCount}`;
    
    if (checkpoint && checkpoint.trim()) {
      // Try to extract a checkpoint letter or use first letter
      const cpMatch = checkpoint.match(/Checkpoint\s*([A-Z0-9]+)/i) || checkpoint.match(/CP\s*([A-Z0-9]+)/i);
      const cpLetter = cpMatch ? cpMatch[1].toUpperCase() : checkpoint.charAt(0).toUpperCase();
      
      const cpReports = todayReports.filter(r => {
        const rCp = r.kawasan || '';
        return rCp.toLowerCase().includes(checkpoint.toLowerCase());
      });
      
      const cpCount = cpReports.length + 1;
      const paddedCpCount = String(cpCount).padStart(2, '0');
      
      caseNo += `${cpLetter}-${paddedCpCount}`;
    }
    
    return caseNo;
  };

  const [formData, setFormData] = useState({
    namaProgram: '',
    tarikh: getTodayDate(),
    masa: '',
    lokasi: '',
    lat: '',
    lng: '',
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

  // ==========================================
  // MECC MODULE STATE & LOGIC
  // ==========================================
  const [meccTab, setMeccTab] = useState<'dashboard' | 'log_petugas' | 'rekod_kes' | 'laporan_program' | 'data_management'>('dashboard');
  const [meccDataSubTab, setMeccDataSubTab] = useState<'rekod_kes' | 'petugas_log'>('rekod_kes');
  const [selectedLaporanProgram, setSelectedLaporanProgram] = useState<string>('');
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [selectedMeccReportIds, setSelectedMeccReportIds] = useState<string[]>([]);
  const [selectedMeccAttendanceIds, setSelectedMeccAttendanceIds] = useState<string[]>([]);
  const [meccViewMode, setMeccViewMode] = useState<'live' | 'test'>('live');
  const [responderViewMode, setResponderViewMode] = useState<'live' | 'test'>('live');
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [selectedMeccReport, setSelectedMeccReport] = useState<any | null>(null);
  const [meccSearchProgram, setMeccSearchProgram] = useState<string>('');
  const [meccSearchPetugas, setMeccSearchPetugas] = useState<string>('');

  const groupedResponderReports = useMemo(() => {
    // 1. Determine mode to filter
    // If global isTestMode is ON, we only allow 'test' data
    const activeMode = isTestMode ? 'test' : responderViewMode;
    const filtered = reports.filter(r => r.mode === activeMode);
    
    // 2. Group by program name
    const groups: { [key: string]: any[] } = {};
    filtered.forEach(r => {
      const pName = r.nama_program || r.namaProgram || 'Program Am';
      if (!groups[pName]) groups[pName] = [];
      groups[pName].push(r);
    });

    // 3. Filter out "tamat" programs
    // Definition of tamat: past date (before today)
    const todayStr = getTodayDate();
    const activeGroups: { [key: string]: any[] } = {};
    
    Object.keys(groups).forEach(pName => {
      // Always show current program if it matches
      const isCurrentProgram = programInfo && programInfo.nama && 
        programInfo.nama.toLowerCase().trim() === pName.toLowerCase().trim();
      
      // Check if any report in this group is from today or future
      const hasRecentData = groups[pName].some(r => {
        const reportDate = r.tarikh || '';
        return reportDate >= todayStr || !reportDate; // Keep if no date or today/future
      });

      if (isCurrentProgram || hasRecentData) {
        activeGroups[pName] = groups[pName];
      }
    });

    return activeGroups;
  }, [reports, responderViewMode, isTestMode, programInfo]);
  
  // Dialog boxes for edits / confirms
  const [editingMeccReport, setEditingMeccReport] = useState<any | null>(null);
  const [editingMeccLog, setEditingMeccLog] = useState<any | null>(null);
  const [isSavingMeccEdit, setIsSavingMeccEdit] = useState(false);
  const [meccDeleteConfirm, setMeccDeleteConfirm] = useState<{ type: 'report' | 'attendance'; item: any } | null>(null);
  const [meccBulkDeleteConfirm, setMeccBulkDeleteConfirm] = useState<{ type: 'report' | 'attendance'; ids: string[] } | null>(null);

  const handleBulkDelete = async (type: 'report' | 'attendance') => {
    const ids = type === 'report' ? selectedMeccReportIds : selectedMeccAttendanceIds;
    if (ids.length === 0) return;
    
    setMeccBulkDeleteConfirm({ type, ids });
  };

  const handleBulkDeleteConfirm = async () => {
    if (!meccBulkDeleteConfirm) return;
    const { type, ids } = meccBulkDeleteConfirm;
    
    setIsSavingMeccEdit(true);
    setMeccBulkDeleteConfirm(null);
    let successCount = 0;
    
    const itemsToDelete = type === 'report' 
      ? reports.filter(r => ids.includes(r.id))
      : attendanceLogs.filter(a => ids.includes(a.id));

    for (const item of itemsToDelete) {
      try {
        const source = item.source || (item.supabaseId && item.firebaseId ? 'both' : item.supabaseId ? 'supabase' : 'firebase');
        
        if (source === 'supabase' || source === 'both' || item.supabaseId) {
          const sId = item.supabaseId || item.id;
          await supabase.from(type === 'report' ? 'reports' : 'attendance').delete().eq('id', sId);
        }

        if (source === 'firebase' || source === 'both' || item.firebaseId) {
          const fId = item.firebaseId || item.id;
          await deleteDoc(doc(db, type === 'report' ? 'reports' : 'attendance', fId));
        }
        
        successCount++;
      } catch (err) {
        console.error(`Gagal memadam ${type} ${item.id}:`, err);
      }
    }

    if (type === 'report') {
      setSelectedMeccReportIds([]);
      fetchReports();
    } else {
      setSelectedMeccAttendanceIds([]);
      fetchAttendanceLogs();
    }

    showNotification('Padam Berjaya', `${successCount} rekod telah dipadam secara kekal dari pangkalan data.`, 'success');
    setIsSavingMeccEdit(false);
  };

  const handleResetTestData = async () => {
    if (!window.confirm('Adakah anda pasti untuk PADAM SEMUA DATA TEST MODE? Ini akan mengosongkan semua rekod simulasi.')) return;

    setIsSavingMeccEdit(true);
    let reportCount = 0;
    let attendanceCount = 0;

    try {
      // Delete test reports
      const testReports = reports.filter(r => r.mode === 'test');
      for (const r of testReports) {
        const source = r.source || (r.supabaseId && r.firebaseId ? 'both' : r.supabaseId ? 'supabase' : 'firebase');
        if (source === 'supabase' || source === 'both' || r.supabaseId) {
          await supabase.from('reports').delete().eq('id', r.supabaseId || r.id);
        }
        if (source === 'firebase' || source === 'both' || r.firebaseId) {
          await deleteDoc(doc(db, 'reports', r.firebaseId || r.id));
        }
        reportCount++;
      }

      // Delete test attendance
      const testAttendance = attendanceLogs.filter(a => a.mode === 'test');
      for (const a of testAttendance) {
        const source = a.source || (a.supabaseId && a.firebaseId ? 'both' : a.supabaseId ? 'supabase' : 'firebase');
        if (source === 'supabase' || source === 'both' || a.supabaseId) {
          await supabase.from('attendance').delete().eq('id', a.supabaseId || a.id);
        }
        if (source === 'firebase' || source === 'both' || a.firebaseId) {
          await deleteDoc(doc(db, 'attendance', a.firebaseId || a.id));
        }
        attendanceCount++;
      }

      fetchReports();
      fetchAttendanceLogs();
      showNotification('Reset Selesai', `Data Simulasi dibersihkan: ${reportCount} laporan, ${attendanceCount} log kehadiran.`, 'success');
    } catch (err) {
      console.error('Error resetting test data:', err);
      showNotification('Reset Gagal', 'Gagal membersihkan data simulasi sepenuhnya.', 'warning');
    }
    setIsSavingMeccEdit(false);
  };

  // Fetch Attendance Logs Helper
  const fetchAttendanceLogs = async () => {
    setIsLoadingAttendance(true);
    let loadedLogs: any[] = [];
    let supabaseSuccess = false;

    // 1. Try Supabase
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('login_time', { ascending: false });

      if (!error && data) {
        loadedLogs = data.map(item => ({
          id: item.id,
          supabaseId: item.id,
          nama: item.nama,
          kawasan: item.kawasan,
          region: item.region,
          program_nama: item.program_nama || item.programNama || '',
          login_time: item.login_time,
          logout_time: item.logout_time,
          mode: item.mode || 'live',
          source: 'supabase' as const
        }));
        supabaseSuccess = true;
      }
    } catch (err) {
      console.error('Error fetching attendance from Supabase:', err);
    }

    // 2. Try Firebase
    try {
      const attendanceCol = collection(db, 'attendance');
      const querySnapshot = await getDocs(attendanceCol);
      const firestoreLogs: any[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        firestoreLogs.push({
          id: doc.id,
          firebaseId: doc.id,
          nama: data.nama || '',
          kawasan: data.kawasan || '',
          region: data.region || '',
          program_nama: data.program_nama || data.programNama || '',
          login_time: data.login_time || data.loginTime || '',
          logout_time: data.logout_time || data.logoutTime || null,
          mode: data.mode || 'live',
          source: 'firebase' as const
        });
      });

      if (!supabaseSuccess) {
        firestoreLogs.sort((a, b) => new Date(b.login_time).getTime() - new Date(a.login_time).getTime());
        loadedLogs = firestoreLogs;
      } else {
        const loadedKeys = new Set(loadedLogs.map(l => `${l.nama}-${l.login_time ? l.login_time.substring(0, 16) : ''}`));
        firestoreLogs.forEach(fLog => {
          const key = `${fLog.nama}-${fLog.login_time ? fLog.login_time.substring(0, 16) : ''}`;
          if (!loadedKeys.has(key)) {
            loadedLogs.push(fLog);
          } else {
            const matchIndex = loadedLogs.findIndex(l => `${l.nama}-${l.login_time?.substring(0, 16)}` === key);
            if (matchIndex !== -1) {
              loadedLogs[matchIndex].firebaseId = fLog.firebaseId;
              loadedLogs[matchIndex].source = 'both';
              // Merge details if firebase has better info
              if (!loadedLogs[matchIndex].logout_time && fLog.logout_time) {
                loadedLogs[matchIndex].logout_time = fLog.logout_time;
              }
            }
          }
        });
      }
    } catch (fbErr) {
      console.error('Error fetching attendance from Firebase:', fbErr);
    }

    // Sort by login_time descending
    loadedLogs.sort((a, b) => {
      const timeA = a.login_time ? new Date(a.login_time).getTime() : 0;
      const timeB = b.login_time ? new Date(b.login_time).getTime() : 0;
      return timeB - timeA;
    });

    setAttendanceLogs(loadedLogs);
    setIsLoadingAttendance(false);
  };

  const handleUpdateReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeccReport) return;
    setIsSavingMeccEdit(true);

    const r = editingMeccReport;
    const source = r.source || (r.supabaseId && r.firebaseId ? 'both' : r.supabaseId ? 'supabase' : 'firebase');
    const updateObj = {
      nama_pesakit: r.nama_pesakit,
      umur: r.umur,
      jantina: r.jantina,
      aduan: r.aduan,
      tanda_vital: r.tanda_vital,
      rawatan: r.rawatan,
      status_kes: r.status_kes,
      nama_program: r.nama_program,
      lokasi: r.lokasi,
      tarikh: r.tarikh,
      masa: r.masa,
      nama_perawat: r.nama_perawat,
      nama_responder: r.nama_responder,
      region: r.region,
      kawasan: r.kawasan,
    };

    if (source === 'supabase' || source === 'both' || r.supabaseId) {
      try {
        const sId = r.supabaseId || r.id;
        await supabase.from('reports').update(updateObj).eq('id', sId);
      } catch (err) {
        console.error('Supabase update failed:', err);
      }
    }

    if (source === 'firebase' || source === 'both' || r.firebaseId) {
      try {
        const fId = r.firebaseId || r.id;
        await updateDoc(doc(db, 'reports', fId), {
          ...updateObj,
          namaPesakit: r.nama_pesakit,
          namaProgram: r.nama_program,
          statusKes: r.status_kes,
          namaResponder: r.nama_responder,
          tandaVital: r.tanda_vital,
          namaPerawat: r.nama_perawat,
        });
      } catch (err) {
        console.error('Firebase update failed:', err);
      }
    }

    setIsSavingMeccEdit(false);
    setEditingMeccReport(null);
    showNotification('Rekod Dikemaskini', 'Laporan kes berjaya dikemaskini.', 'success');
    fetchReports(); // Refresh view
  };

  const handleDeleteReportConfirm = async () => {
    if (!meccDeleteConfirm) return;
    const { item } = meccDeleteConfirm;

    try {
      const source = item.source || (item.supabaseId && item.firebaseId ? 'both' : item.supabaseId ? 'supabase' : 'firebase');
      
      if (source === 'supabase' || source === 'both' || item.supabaseId) {
        const sId = item.supabaseId || item.id;
        await supabase.from('reports').delete().eq('id', sId);
      }

      if (source === 'firebase' || source === 'both' || item.firebaseId) {
        const fId = item.firebaseId || item.id;
        await deleteDoc(doc(db, 'reports', fId));
      }

      showNotification('Padam Rekod', 'Laporan kes di kedua-dua pangkalan data berjaya dipadam secara kekal.', 'success');
    } catch (err) {
      console.error('Delete report error:', err);
      showNotification('Ralat Padam', 'Gagal memadam laporan kes.', 'warning');
    }

    setMeccDeleteConfirm(null);
    fetchReports(); // Refresh
  };

  const handleUpdateAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeccLog) return;
    setIsSavingMeccEdit(true);

    const log = editingMeccLog;
    const source = log.source || (log.supabaseId && log.firebaseId ? 'both' : log.supabaseId ? 'supabase' : 'firebase');
    const updateObj = {
      nama: log.nama,
      kawasan: log.kawasan,
      region: log.region,
      program_nama: log.program_nama,
      login_time: log.login_time,
      logout_time: log.logout_time || null
    };

    if (source === 'supabase' || source === 'both' || log.supabaseId) {
      try {
        const sId = log.supabaseId || log.id;
        await supabase.from('attendance').update(updateObj).eq('id', sId);
      } catch (err) {
        console.error('Supabase attendance update failed:', err);
      }
    }

    if (source === 'firebase' || source === 'both' || log.firebaseId) {
      try {
        const fId = log.firebaseId || log.id;
        await updateDoc(doc(db, 'attendance', fId), updateObj);
      } catch (err) {
        console.error('Firebase attendance update failed:', err);
      }
    }

    setIsSavingMeccEdit(false);
    setEditingMeccLog(null);
    showNotification('Log Dikemaskini', 'Rekod log petugas berjaya dikemaskini.', 'success');
    fetchAttendanceLogs(); // Refresh view
  };

  const handleDeleteAttendanceConfirm = async () => {
    if (!meccDeleteConfirm) return;
    const { item } = meccDeleteConfirm;

    try {
      const source = item.source || (item.supabaseId && item.firebaseId ? 'both' : item.supabaseId ? 'supabase' : 'firebase');
      
      if (source === 'supabase' || source === 'both' || item.supabaseId) {
        const sId = item.supabaseId || item.id;
        await supabase.from('attendance').delete().eq('id', sId);
      }

      if (source === 'firebase' || source === 'both' || item.firebaseId) {
        const fId = item.firebaseId || item.id;
        await deleteDoc(doc(db, 'attendance', fId));
      }

      showNotification('Padam Log Kehadiran', 'Log kehadiran petugas berjaya dipadam secara kekal.', 'success');
    } catch (err) {
      console.error('Delete attendance error:', err);
      showNotification('Ralat Padam', 'Gagal memadam log kehadiran.', 'warning');
    }

    setMeccDeleteConfirm(null);
    fetchAttendanceLogs(); // Refresh
  };
  // ==========================================

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

  // Supabase Auth and Init
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedDuty = localStorage.getItem('resq_duty_info');
    const savedProgram = localStorage.getItem('resq_program_info');
    const savedRegion = localStorage.getItem('resq_selected_region');
    
    if (savedDuty) setDutyInfo(JSON.parse(savedDuty));
    if (savedProgram) setProgramInfo(JSON.parse(savedProgram));
    if (savedRegion) setSelectedRegion(JSON.parse(savedRegion));

    const savedAttendanceId = localStorage.getItem('resq_attendance_id');
    if (savedAttendanceId) setAttendanceId(savedAttendanceId);

    const savedFirebaseAttendanceId = localStorage.getItem('resq_firebase_attendance_id');
    if (savedFirebaseAttendanceId) setFirebaseAttendanceId(savedFirebaseAttendanceId);

    // Bypass mode selection if not explicitly requested to show
    if (!savedDuty && !showModeSelection && view === 'selection') {
      if (persistentMode === 'multi') {
        handleMultiRegionMode();
      } else {
        handleSingleMode();
      }
    }

    const savedData = localStorage.getItem('resq_form_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load saved data', e);
      }
    }

    // If duty info exists, skip to dashboard
    if (savedDuty) {
      setView('dashboard');
    }
  }, []);

  useEffect(() => {
    if (view !== 'dashboard') return;
    
    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem('resq_form_data', JSON.stringify(formData));
      setAutoSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      // Reset to idle after 3 seconds
      const idleTimer = setTimeout(() => setAutoSaveStatus('idle'), 3000);
      return () => clearTimeout(idleTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, view]);

  const sendTelegramMessage = async (message: string, isAttendance: boolean = false) => {
    if (!isTelegramEnabled) {
      console.log('Telegram sending bypassed: integration is disabled.');
      return 'disabled';
    }

    try {
      const endpoint = isAttendance 
        ? (message.includes('KEHADIRAN') ? '/api/notify-login' : '/api/notify-logout')
        : '/api/send-telegram';

      // For notify endpoints, we need to pass structured data if possible, 
      // but the current server implementation expects specific bodies.
      // Let's adapt to what's used in App.tsx.
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isAttendance 
            ? { 
                nama: dutyInfo.nama, 
                kawasan: dutyInfo.kawasan, 
                selectedRegion: selectedRegion || (persistentMode === 'single' ? 'Akses Negeri' : 'HQ'),
                loginTime: loginTime,
                logoutTime: new Date().toLocaleTimeString(),
                totalCases: reports.length,
                programInfo
              }
            : { 
                message,
                // If it's a generic message, the server /api/send-telegram expects 
                // data object for building the message. 
                // We should probably update the server or the client to be consistent.
              }
        ),
      });

      const result = await response.json();
      return result.success || result.ok;
    } catch (error) {
      console.error('Telegram proxy error:', error);
      return false;
    }
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
    
    const startTime = getCurrentTime();
    setLoginTime(startTime);

    // Send login notification to Telegram
    const message = `
✅ *NOTIFIKASI KEHADIRAN* ✅
_Petugas telah log masuk ke sistem_

👤 *MAKLUMAT PETUGAS*
• Nama: ${dutyInfo.nama}
• Kawasan/Pos: ${dutyInfo.kawasan}
• Negeri: ${selectedRegion || (persistentMode === 'single' ? 'Akses Negeri' : 'HQ')}
• Masa Log Masuk: ${startTime}

${programInfo && programInfo.nama ? `📋 *MAKLUMAT PROGRAM*
• Program: ${programInfo.nama}
• Lokasi: ${programInfo.lokasi || '-'}
• Tarikh: ${programInfo.tarikh || '-'}
• Masa: ${programInfo.masa || '-'}
` : ''}
📢 *Status: HADIR*
    `.trim();

    const now = new Date();
    let tempAttendanceId = '';
    let tempFirebaseAttendanceId = '';
    let savedToSupabase = false;
    let savedToFirebase = false;

    // Save attendance to Supabase
    try {
      const { data, error } = await supabase.from('attendance').insert({
        nama: dutyInfo.nama,
        kawasan: isTestMode ? `[TEST] ${dutyInfo.kawasan}` : dutyInfo.kawasan,
        region: selectedRegion || 'Single Mode',
        program_nama: programInfo?.nama || null,
        login_time: now.toISOString()
      }).select();

      if (data && data[0]) {
        tempAttendanceId = data[0].id;
        savedToSupabase = true;
      } else if (error) {
        console.warn('Supabase attendance insert failed:', error);
      }
    } catch (error) {
      console.error('Error saving attendance to Supabase:', error);
    }

    // Save attendance to Firebase
    try {
      const attendanceData = {
        nama: dutyInfo.nama,
        kawasan: isTestMode ? `[TEST] ${dutyInfo.kawasan}` : dutyInfo.kawasan,
        region: selectedRegion || (persistentMode === 'single' ? 'Akses Negeri' : 'HQ'),
        program_nama: programInfo?.nama || null,
        login_time: now.toISOString(),
        logout_time: null,
        mode: isTestMode ? 'test' : 'live'
      };
      const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
      tempFirebaseAttendanceId = docRef.id;
      savedToFirebase = true;
    } catch (fbError) {
      console.error('Error saving attendance to Firebase:', fbError);
      try {
        handleFirestoreError(fbError, OperationType.CREATE, 'attendance');
      } catch (richError: any) {
        console.error('Rich Firebase attendance save error:', richError.message);
      }
    }

    if (savedToSupabase) {
      setAttendanceId(tempAttendanceId);
      localStorage.setItem('resq_attendance_id', tempAttendanceId);
    }
    if (savedToFirebase) {
      setFirebaseAttendanceId(tempFirebaseAttendanceId);
      localStorage.setItem('resq_firebase_attendance_id', tempFirebaseAttendanceId);
    }

    if (savedToSupabase || savedToFirebase) {
      let successMsg = `Petugas ${dutyInfo.nama} telah memulakan tugas di ${dutyInfo.kawasan}. `;
      if (savedToSupabase && savedToFirebase) {
        successMsg += '(Direkod di Supabase & Firebase)';
      } else if (savedToFirebase) {
        successMsg += '(Direkod di Firebase)';
      } else {
        successMsg += '(Direkod di Supabase)';
      }
      showNotification('Log Masuk Berjaya', successMsg, 'success');
    } else {
      showNotification('Amaran Pangkalan Data', 'Gagal merekod kehadiran ke pangkalan data.', 'warning');
    }

    sendTelegramMessage(message, true);
    localStorage.setItem('resq_duty_info', JSON.stringify(dutyInfo));
    localStorage.setItem('resq_program_info', JSON.stringify(programInfo));
    localStorage.setItem('resq_selected_region', JSON.stringify(selectedRegion));

    // Pre-fill namaResponder with duty name, leave namaPerawat empty
    setFormData(prev => ({ 
      ...prev, 
      namaResponder: dutyInfo.nama,
      namaPerawat: '' 
    }));
    
    setView('confirmation');
  };

  const fetchReports = async () => {
    setIsLoadingReports(true);
    setAuthError(null);
    let loadedReports: any[] = [];
    let supabaseSuccess = false;

    // 1. Try Supabase
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Supabase fetch failed, trying Firebase Firestore fallback...", error);
      } else {
        loadedReports = data || [];
        supabaseSuccess = true;
      }
    } catch (error: any) {
      console.warn("Supabase fetch connection failed, trying Firebase Firestore fallback...", error);
    }

    // 2. Fallback or Additional loading from Firebase Firestore
    try {
      const reportsCol = collection(db, 'reports');
      const q = query(reportsCol, limit(50)); // limit to latest 50
      const querySnapshot = await getDocs(q);
      const firestoreReportsList: any[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        firestoreReportsList.push({
          id: doc.id,
          nama_pesakit: docData.nama_pesakit || docData.namaPesakit || '',
          umur: docData.umur || '',
          jantina: docData.jantina || '',
          aduan: docData.aduan || '',
          tanda_vital: docData.tanda_vital || docData.tandaVital || '',
          rawatan: docData.rawatan || '',
          status_kes: docData.status_kes || docData.statusKes || '',
          nama_program: docData.nama_program || docData.namaProgram || '',
          lokasi: docData.lokasi || '',
          tarikh: docData.tarikh || '',
          masa: docData.masa || '',
          nama_perawat: docData.nama_perawat || docData.namaPerawat || '',
          nama_responder: docData.nama_responder || docData.namaResponder || '',
          region: docData.region || 'Akses Negeri',
          kawasan: docData.kawasan || '',
          case_number: docData.case_number || docData.caseNumber || '',
          images: docData.images || [],
          mode: docData.mode || 'live',
          created_at: docData.createdAt ? (docData.createdAt.seconds ? new Date(docData.createdAt.seconds * 1000).toISOString() : docData.createdAt) : new Date().toISOString()
        });
      });

      if (!supabaseSuccess) {
        firestoreReportsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        loadedReports = firestoreReportsList;
      } else {
        const existingIds = new Set(loadedReports.map(r => r.id));
        firestoreReportsList.forEach(fr => {
          if (!existingIds.has(fr.id)) {
            loadedReports.push(fr);
          }
        });
        loadedReports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    } catch (fbError) {
      console.error("Firebase fetch fallback failed:", fbError);
      try {
        handleFirestoreError(fbError, OperationType.GET, 'reports');
      } catch (richError: any) {
        console.error("Rich Firebase fallback error details:", richError.message);
      }
    }

    setReports(loadedReports);
    setIsLoadingReports(false);
  };

  useEffect(() => {
    fetchReports();
    fetchAttendanceLogs();

    // Auto-refresh every 2 minutes for all users
    const refreshInterval = setInterval(() => {
      fetchReports();
      fetchAttendanceLogs();
    }, 120000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (dashboardTab === 'reports') {
      fetchReports();
    }
  }, [dashboardTab]);

  useEffect(() => {
    if (view === 'mecc') {
      fetchReports();
      fetchAttendanceLogs();
    }
  }, [view]);

  const compressImage = (base64: string, maxWidth: number = 800, maxHeight: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 quality for good compression
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => resolve(base64);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const compressed = await compressImage(reader.result as string);
          setImages(prev => [...prev, compressed]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      showNotification('Ralat Kamera', 'Gagal mengakses kamera. Sila semak kebenaran.', 'warning');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawImageData = canvas.toDataURL('image/jpeg', 0.9);
        const compressed = await compressImage(rawImageData);
        setImages(prev => [...prev, compressed]);
        stopCamera();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
  };

  const confirmSubmit = async () => {
    const sendWithImages = async (rData: any, msg: string, imgs: string[]) => {
      try {
        const response = await fetch('/api/send-report-with-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportData: rData, message: msg, images: imgs })
        });
        return await response.json() as any;
      } catch (err) {
        console.error('Error sending report with images:', err);
        return { success: false };
      }
    };

    setIsSubmitting(true);
    setIsConfirming(false);

    // Generate Case Number
    const caseNumber = generateCaseNumber(reports, isTestMode, dutyInfo.kawasan);

    const reportData = {
      case_number: caseNumber,
      nama_pesakit: formData.namaPesakit,
      umur: formData.umur,
      jantina: formData.jantina,
      aduan: isTestMode ? `[⚠️ TEST MODE] ${formData.aduan}` : formData.aduan,
      tanda_vital: formData.tandaVital,
      rawatan: formData.rawatan,
      status_kes: formData.statusKes,
      nama_program: formData.namaProgram,
      lokasi: formData.lokasi,
      tarikh: formData.tarikh,
      masa: formData.masa,
      nama_perawat: formData.namaPerawat,
      nama_responder: formData.namaResponder,
      lat: formData.lat,
      lng: formData.lng,
      region: selectedRegion || (persistentMode === 'single' ? 'Akses Negeri' : 'HQ'),
      kawasan: dutyInfo.kawasan,
      user_id: currentUser?.id ?? null,
      images_count: images.length
    };

    const testModeHeader = isTestMode ? "⚠️ *TEST MODE DIGUNAKAN* ⚠️\n_Data ini adalah simulasi sahaja_\n\n" : "";

    const message = `
${testModeHeader}🚨 *LAPORAN KES BARU* 🚨
_No. Kes: ${caseNumber}_

📍 *MAKLUMAT TUGAS*
• Petugas: ${dutyInfo.nama}
• Kawasan/Pos: ${dutyInfo.kawasan}
• Negeri: ${selectedRegion || (persistentMode === 'single' ? 'Akses Negeri' : 'HQ')}

📋 *MAKLUMAT PROGRAM*
• Program: ${formData.namaProgram}
• Lokasi: ${formData.lokasi || '-'}
${formData.lat && formData.lng ? `• Koordinat: ${formData.lat},${formData.lng}\n• Google Maps: https://www.google.com/maps?q=${formData.lat},${formData.lng}\n` : ''}• Tarikh: ${formData.tarikh}
• Masa: ${formData.masa}

👤 *MAKLUMAT PESAKIT*
• Nama: ${formData.namaPesakit}
• Umur: ${formData.umur}
• Jantina: ${formData.jantina}

🏥 *PENILAIAN & RAWATAN*
• Aduan: ${formData.aduan}
• Tanda Vital: ${formData.tandaVital}
• Rawatan: ${formData.rawatan}

✅ *STATUS & PENGESAHAN*
• Status Kes: ${formData.statusKes}
• Nama Perawat: ${formData.namaPerawat || '-'}
• Nama Responder: ${formData.namaResponder}
    `.trim();

    if (!currentUser) {
      console.warn('User not authenticated, submitting as guest');
    }

    let savedToSupabase = false;
    let savedToFirebase = false;
    let saveErrorMessage = '';

    // 1. Try saving to Supabase
    try {
      const { error } = await supabase.from('reports').insert(reportData);
      if (error) {
        console.warn('Supabase insert failed:', error);
        saveErrorMessage += `Supabase: ${error.message || error}. `;
      } else {
        savedToSupabase = true;
      }
    } catch (sbError: any) {
      console.warn('Supabase connection/fetch failed:', sbError);
      saveErrorMessage += `Supabase: ${sbError.message || sbError || 'Gagal menyambung'}. `;
    }

    // 2. Try saving to Firebase Firestore (Always, fallback/backup)
    try {
      // Safety check for Firestore 1MB limit (approximate)
      let finalImages = [...images];
      let estimatedSize = JSON.stringify(finalImages).length;
      
      // If estimated size is over 800KB, reduce images iteratively
      while (estimatedSize > 800000 && finalImages.length > 0) {
        console.warn(`Images size (${estimatedSize} bytes) potentially too large for Firestore, removing one image...`);
        finalImages.pop();
        estimatedSize = JSON.stringify(finalImages).length;
      }

      const result = isTelegramEnabled ? await sendWithImages(reportData, message, images) : { success: true, disabled: true };

      const firestoreData = {
        ...reportData,
        images: finalImages, 
        createdAt: new Date(),
        namaProgram: formData.namaProgram,
        namaPesakit: formData.namaPesakit,
        statusKes: formData.statusKes,
        namaResponder: formData.namaResponder,
        tandaVital: formData.tandaVital,
        mode: isTestMode ? 'test' : 'live',
        telegramStatus: result.success ? 'success' : (isTelegramEnabled ? 'failed' : 'not_sent')
      };

      try {
        await addDoc(collection(db, 'reports'), firestoreData);
        savedToFirebase = true;
      } catch (innerError: any) {
        // If it still fails (maybe size or other error), try once more without images
        if (finalImages.length > 0) {
          console.warn("Firestore save failed with images, trying without images...", innerError);
          const minimalData = { ...firestoreData, images: [] };
          await addDoc(collection(db, 'reports'), minimalData);
          savedToFirebase = true;
          saveErrorMessage += "Firebase: Disimpan tanpa gambar (saiz terlalu besar). ";
        } else {
          throw innerError;
        }
      }
    } catch (fbError: any) {
      console.error('Firebase insert failed:', fbError);
      try {
        handleFirestoreError(fbError, OperationType.CREATE, 'reports');
      } catch (richError: any) {
        saveErrorMessage += `Firebase: ${richError.message}. `;
      }
    }

    // Process submission if at least one database has saved correctly
    if (savedToSupabase || savedToFirebase) {
      let successMsg = 'Laporan kes berjaya disimpan ';
      if (savedToSupabase && savedToFirebase) {
        successMsg += 'ke Supabase & Firebase.';
      } else if (savedToFirebase) {
        successMsg += 'ke Firebase Firestore (Luar Talian Supabase).';
      } else {
        successMsg += 'ke Supabase Database.';
      }

      showNotification(
        'Laporan Dihantar', 
        isTelegramEnabled 
          ? `${successMsg} Serta dihantar ke Telegram.` 
          : successMsg, 
        'success'
      );
      
      const result = isTelegramEnabled ? await sendWithImages(reportData, message, images) : { success: true, disabled: true };

      if (result.success && !result.disabled) {
        showNotification('Telegram: BERJAYA', 'Laporan kes telah berjaya dihantar ke bot Telegram MECC.', 'success');
      } else if (!result.disabled) {
        showNotification('Telegram: GAGAL', 'Laporan disimpan tetapi gagal dihantar ke Telegram. Anda boleh hantar semula di Senarai Laporan.', 'warning');
      }

      if (result.disabled) {
        setTotalCases(prev => prev + 1);
        setIsFormExpanded(false);
        setImages([]); // Clear images
        setTimeout(() => {
          handleNewReport();
        }, 3000);
      } else if (result.success) {
        setTotalCases(prev => prev + 1);
        showNotification('Kes Dihantar ke MECC', 'Laporan kes telah berjaya dihantar ke sistem MECC Telegram.', 'success');
        setIsFormExpanded(false);
        setImages([]); // Clear images
        setTimeout(() => {
          handleNewReport();
        }, 3000);
      } else {
        showNotification('Telegram Gagal', 'Laporan disimpan tetapi gagal dihantar ke Telegram. Sila periksa token bot anda.', 'warning');
        setTotalCases(prev => prev + 1);
        setIsFormExpanded(false);
        setImages([]); // Clear images
        setTimeout(() => {
          handleNewReport();
        }, 3000);
      }
    } else {
      console.error('Both databases failed:', saveErrorMessage);
      showNotification(
        'Ralat Gagal Menyimpan',
        `Gagal menyimpan laporan kes ke kedua-dua pangkalan data. Ralat: ${saveErrorMessage}`,
        'warning'
      );
    }

    setIsSubmitting(false);
  };

  const resendReportToTelegram = async (report: any) => {
    try {
      showNotification('Menghantar Semula', 'Laporan kes sedang dihantar semula ke Telegram...', 'info');
      
      const reportData = {
        case_number: report.case_number || report.caseNumber,
        nama_pesakit: report.nama_pesakit || report.namaPesakit,
        umur: report.umur,
        jantina: report.jantina,
        aduan: report.aduan,
        tanda_vital: report.tanda_vital || report.tandaVital,
        rawatan: report.rawatan,
        status_kes: report.status_kes || report.statusKes,
        nama_program: report.nama_program || report.namaProgram,
        lokasi: report.lokasi,
        tarikh: report.tarikh,
        masa: report.masa,
        nama_perawat: report.nama_perawat || report.namaPerawat,
        nama_responder: report.nama_responder || report.namaResponder,
        lat: report.lat,
        lng: report.lng,
        region: report.region,
        kawasan: report.kawasan
      };

      const message = `
🚨 *LAPORAN KES (DIHANTAR SEMULA)* 🚨
_No. Kes: ${reportData.case_number}_

📍 *MAKLUMAT TUGAS*
• Petugas: ${reportData.nama_responder}
• Kawasan/Pos: ${reportData.kawasan}
• Negeri: ${reportData.region}

📋 *MAKLUMAT PROGRAM*
• Program: ${reportData.nama_program}
• Lokasi: ${reportData.lokasi || '-'}
${reportData.lat && reportData.lng ? `• Koordinat: ${reportData.lat},${reportData.lng}\n• Google Maps: https://www.google.com/maps?q=${reportData.lat},${reportData.lng}\n` : ''}• Tarikh: ${reportData.tarikh}
• Masa: ${reportData.masa}

👤 *MAKLUMAT PESAKIT*
• Nama: ${reportData.nama_pesakit}
• Umur: ${reportData.umur}
• Jantina: ${reportData.jantina}

🏥 *PENILAIAN & RAWATAN*
• Aduan: ${reportData.aduan}
• Tanda Vital: ${reportData.tanda_vital}
• Rawatan: ${reportData.rawatan}

✅ *STATUS & PENGESAHAN*
• Status Kes: ${reportData.status_kes}
• Nama Perawat: ${reportData.nama_perawat || '-'}
• Nama Responder: ${reportData.nama_responder}
      `.trim();

      const response = await fetch('/api/send-report-with-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reportData, 
          message, 
          images: report.images || [] 
        })
      });

      const result = await response.json();
      if (result.success) {
        showNotification('Berjaya Dihantar', 'Laporan kes telah berjaya dihantar semula ke Telegram.', 'success');
        
        // Update Firestore if we have an ID
        const fId = report.firebaseId || report.id;
        if (fId) {
          try {
            await updateDoc(doc(db, 'reports', fId), {
              telegramStatus: 'success'
            });
            // Update local state
            setReports(prev => prev.map(r => 
              (r.id === report.id || r.firebaseId === report.firebaseId) 
                ? { ...r, telegramStatus: 'success' } 
                : r
            ));
          } catch (fbError) {
            console.error('Failed to update telegram status in Firestore:', fbError);
          }
        }
      } else {
        showNotification('Gagal Dihantar', 'Gagal menghantar laporan kes ke Telegram. Sila semak token bot anda.', 'warning');
      }
    } catch (error) {
      console.error('Error resending report:', error);
      showNotification('Ralat', 'Berlaku ralat semasa menghantar semula laporan.', 'warning');
    }
  };

  const handleNewReport = () => {
    localStorage.removeItem('resq_form_data');
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
    const now = new Date();
    const logoutTime = getCurrentTime();
    const currentDutyInfo = { ...dutyInfo };
    const currentTotalCases = totalCases;

    showNotification(
      'Log Keluar...', 
      isTelegramEnabled 
        ? 'Menghantar ringkasan tugas ke Telegram.' 
        : 'Merekodkan tamat tugas ke pangkalan data.', 
      'warning'
    );
    
    const message = `
⚠️ *NOTIFIKASI LOG KELUAR* ⚠️
_Petugas telah menamatkan tugas_

👤 *MAKLUMAT PETUGAS*
• Nama: ${currentDutyInfo.nama}
• Kawasan/Pos: ${currentDutyInfo.kawasan}
• Negeri: ${selectedRegion || (persistentMode === 'single' ? 'Akses Negeri' : 'HQ')}
• Masa Log Keluar: ${logoutTime}

📊 *RINGKASAN TUGAS*
• Jumlah Kes Dilaporkan: ${currentTotalCases}

📢 *Status: LOG KELUAR*
    `.trim();

    sendTelegramMessage(message, true);

    // Update logout time in Supabase (Saved as UTC ISO for DB best practice)
    let updatedSupabase = false;
    let updatedFirebase = false;

    if (attendanceId) {
      try {
        await supabase
          .from('attendance')
          .update({ logout_time: now.toISOString() })
          .eq('id', attendanceId);
        updatedSupabase = true;
      } catch (error) {
        console.error('Error updating logout time in Supabase:', error);
      }
    }

    if (firebaseAttendanceId) {
      try {
        await updateDoc(doc(db, 'attendance', firebaseAttendanceId), {
          logout_time: now.toISOString()
        });
        updatedFirebase = true;
      } catch (fbError) {
        console.error('Error updating logout time in Firebase:', fbError);
        try {
          handleFirestoreError(fbError, OperationType.UPDATE, `attendance/${firebaseAttendanceId}`);
        } catch (richError: any) {
          console.error('Rich Firebase attendance logout error:', richError.message);
        }
      }
    }

    if (updatedSupabase || updatedFirebase) {
      let successMsg = 'Tamat tugas telah berjaya direkod. ';
      if (updatedSupabase && updatedFirebase) {
        successMsg += '(Dikemaskini di Supabase & Firebase)';
      } else if (updatedFirebase) {
        successMsg += '(Dikemaskini di Firebase)';
      } else {
        successMsg += '(Dikemaskini di Supabase)';
      }
      showNotification(
        'Log Keluar Berjaya', 
        isTelegramEnabled 
          ? `${successMsg} Ringkasan syif dihantar ke Telegram.` 
          : successMsg, 
        'success'
      );
    } else {
      showNotification(
        'Amaran Log Keluar',
        'Sesi tamat tugas gagal dikemaskini dalam pangkalan data.',
        'warning'
      );
    }

    setTimeout(() => {
      localStorage.removeItem('resq_form_data');
      localStorage.removeItem('resq_duty_info');
      localStorage.removeItem('resq_program_info');
      localStorage.removeItem('resq_selected_region');
      localStorage.removeItem('resq_attendance_id');
      localStorage.removeItem('resq_firebase_attendance_id');
      // Reset everything
      setView('selection');
      setAttendanceId(null);
      setFirebaseAttendanceId(null);
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
      lat: '',
      lng: '',
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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Ralat Lokasi', 'Pelayar anda tidak menyokong Geolocation.', 'warning');
      return;
    }

    showNotification('Mendapatkan Lokasi', 'Sila tunggu sebentar...', 'info');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ 
          ...prev, 
          lat: latitude.toFixed(6), 
          lng: longitude.toFixed(6) 
        }));
        showNotification('Lokasi Berjaya', 'Koordinat telah dikemaskini.', 'success');
      },
      (error) => {
        let errorMsg = 'Gagal mendapatkan lokasi.';
        if (error.code === 1) errorMsg = 'Kebenaran lokasi dinafikan.';
        else if (error.code === 2) errorMsg = 'Lokasi tidak ditemui.';
        else if (error.code === 3) errorMsg = 'Masa tamat.';
        showNotification('Ralat Lokasi', errorMsg, 'warning');
      }
    );
  };

  const autoFillProgram = () => {
    if (!programInfo.nama) {
      showNotification('Tiada Maklumat', 'Sila isi maklumat program di bahagian log masuk terlebih dahulu.', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      namaProgram: programInfo.nama,
      tarikh: programInfo.tarikh || prev.tarikh,
      masa: programInfo.masa || prev.masa,
      lokasi: programInfo.lokasi || prev.lokasi
    }));
    showNotification('Auto Fill Program', 'Maklumat program telah diisi ke dalam borang.', 'success');
  };

  const clearForm = () => {
    localStorage.removeItem('resq_form_data');
    setFormData({
      namaProgram: programInfo.nama || '',
      tarikh: programInfo.tarikh || getTodayDate(),
      masa: programInfo.masa || '',
      lokasi: programInfo.lokasi || '',
      lat: '',
      lng: '',
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
    // Save preference to bypass next time
    localStorage.setItem('resq_persistent_mode', 'single');
    localStorage.setItem('resq_show_mode_selection', 'false');
    setPersistentMode('single');
    setShowModeSelection(false);

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
    // Save preference to bypass next time
    localStorage.setItem('resq_persistent_mode', 'multi');
    localStorage.setItem('resq_show_mode_selection', 'false');
    setPersistentMode('multi');
    setShowModeSelection(false);

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
    { title: 'Pilih Mode Syif', desc: 'Tentukan sama ada anda bertugas secara individu (Akses Negeri) atau mengikut kawasan negeri (HQ).' },
    { title: 'Mod Ujian (Optional)', desc: 'Aktifkan "TEST MODE" di bahagian atas jika sekadar ingin mencuba. Laporan akan ditandakan sebagai simulasi.' },
    { title: 'Pendaftaran Kehadiran', desc: 'Isi Nama, Kawasan & Program. Sistem akan menghantar notifikasi "HADIR" ke Telegram secara automatik.' },
    { title: 'Mula Lapor Kes', desc: 'Klik butang "Mula Lapor Kes" untuk membuka borang. Sesi petugas anda akan disimpan selagi anda tidak log keluar.' },
    { title: 'Pengisian Maklumat', desc: 'Lengkapkan butiran pesakit & rawatan. Gunakan "Auto Fill" (Ikon Tongkat Sakti) untuk pengisian simulasi pantas.' },
    { title: 'Rujukan Tanda Vital', desc: 'Rujuk jadual tanda vital mengikut kategori umur (Dewasa ke Neonatal) untuk ketepatan laporan anda.' },
    { title: 'Penghantaran MECC', desc: 'Klik "Hantar Laporan ke MECC". Data akan disimpan & salinan dihantar terus ke saluran Telegram rasmi.' },
    { title: 'Semakan Rekod', desc: 'Semak senarai kes yang telah dihantar melalui bahagian "Rekod Laporan" di Dashboard petugas.' },
    { title: 'Tamat Syif', desc: 'Klik "Log Keluar". Ringkasan statistik (jumlah kes) akan dihantar ke Telegram sebelum sesi anda ditamatkan.' }
  ];

  const VITAL_SIGNS_REFERENCE = [
    {
      age: 'Dewasa (>18 thn)',
      bp: '120/80 mmHg',
      pr: '60-100 bpm',
      spo2: '95-100%',
      dxt: '4.0-7.8 mmol/L'
    },
    {
      age: 'Remaja (12-18 thn)',
      bp: '110-120/70-80 mmHg',
      pr: '60-100 bpm',
      spo2: '95-100%',
      dxt: '4.0-7.0 mmol/L'
    },
    {
      age: 'Kanak-kanak (6-12 thn)',
      bp: '100-110/60-70 mmHg',
      pr: '70-110 bpm',
      spo2: '95-100%',
      dxt: '4.0-7.0 mmol/L'
    },
    {
      age: 'Prasekolah (3-6 thn)',
      bp: '90-100/50-60 mmHg',
      pr: '80-120 bpm',
      spo2: '95-100%',
      dxt: '4.0-7.0 mmol/L'
    },
    {
      age: 'Toddler (1-3 thn)',
      bp: '80-90/40-50 mmHg',
      pr: '90-140 bpm',
      spo2: '95-100%',
      dxt: '4.0-7.0 mmol/L'
    },
    {
      age: 'Bayi (<1 thn)',
      bp: '70-80/30-40 mmHg',
      pr: '100-160 bpm',
      spo2: '95-100%',
      dxt: '4.0-7.0 mmol/L'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans ml-0 mr-0 -mt-[100px]">
      <AnimatePresence mode="wait">
        {view === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-8 relative w-[300px] h-[211.847px]"
          >
            {/* Top Action Menu Bar */}
            <div className="absolute -top-12 -right-4 flex items-center gap-1.5 z-50">
              {/* Rujukan Tanda Vital Link */}
              <button
                type="button"
                onClick={() => setShowVitalReference(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white shadow-sm border border-gray-100 rounded-xl text-gray-550 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95 text-[10px] font-bold cursor-pointer"
                title="Rujukan Tanda Vital (BP, HR, SpO2 & DXT)"
              >
                <Eye className="w-3 h-3 text-blue-500" />
                <span>Rujukan</span>
              </button>

              {/* Panduan Penggunaan Link */}
              <button
                type="button"
                onClick={() => setShowGuideline(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white shadow-sm border border-gray-100 rounded-xl text-gray-550 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95 text-[10px] font-bold cursor-pointer"
                title="Panduan Penggunaan Sistem"
              >
                <BookOpen className="w-3 h-3 text-purple-500" />
                <span>Panduan</span>
              </button>

              {/* Settings Button */}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                title="Tetapan Sistem"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

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

            {/* Mode Toggle - Moved below logo phrasing */}
            <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
              <button
                onClick={() => setIsTestMode(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  !isTestMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                LIVE MODE
              </button>
              <button
                onClick={() => setIsTestMode(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isTestMode ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                TEST MODE
              </button>
            </div>

              <div className="flex flex-row gap-4 justify-center">
                {/* Single Mode Card */}
                <motion.button
                  onClick={handleSingleMode}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-[150px] h-[150px] bg-white p-4 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 hover:border-blue-500 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                    <LayoutGrid className="text-blue-600 w-6 h-6" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">Akses Negeri</h2>
                  <p className="text-[8px] uppercase tracking-widest font-bold text-gray-400 mt-1">Status Peribadi</p>
                </motion.button>

                {/* Multi-Region Mode Card */}
                <motion.button
                  onClick={handleMultiRegionMode}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-[150px] h-[150px] bg-white p-4 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 hover:border-purple-500 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                    <Globe className="text-purple-600 w-6 h-6" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">HQ</h2>
                  <p className="text-[8px] uppercase tracking-widest font-bold text-gray-400 mt-1">Pilih Kawasan</p>
                </motion.button>
              </div>

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
            <div className="flex flex-col items-center text-center mb-8 relative">
              {isTestMode && (
                <button
                  type="button"
                  onClick={autofillSampleData}
                  className="absolute -top-4 -right-4 p-2 bg-orange-100 border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-200 transition-all flex items-center gap-2 text-[10px] font-bold"
                  title="Autofill Sample Data"
                >
                  <Wand2 className="w-4 h-4" />
                  AUTOFILL
                </button>
              )}
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <Activity className="text-blue-600 w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Mulakan Tugas</h2>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">
                Akses: {persistentMode === 'multi' ? 'Pusat' : 'Negeri'}
              </p>
              <p className="text-gray-500 mt-1">Sila masukkan maklumat petugas sebelum memulakan laporan.</p>
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

        {view === 'confirmation' && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-gray-100"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                <Check className="text-green-600 w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Sahkan Maklumat</h2>
              <p className="text-gray-500 mt-2">Sila sahkan maklumat tugasan anda sebelum ke Dashboard.</p>
            </div>

            <div className="space-y-4 mb-8">
               <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                 <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                   <User className="w-5 h-5 text-blue-600" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Petugas</p>
                   <p className="font-bold text-gray-900">{dutyInfo.nama}</p>
                 </div>
               </div>
               
               <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                 <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                   <MapPin className="w-5 h-5 text-green-600" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Pos / Kawasan</p>
                   <p className="font-bold text-gray-900">{dutyInfo.kawasan}</p>
                 </div>
               </div>

               {programInfo.nama && (
                 <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-4">
                   <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                     <Wand2 className="w-5 h-5 text-purple-600" />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-purple-400 uppercase">Program</p>
                     <p className="font-bold text-gray-900">{programInfo.nama}</p>
                   </div>
                 </div>
               )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setView('dashboard')}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Sahkan & Teruskan
              </button>
              <button
                onClick={() => setView('duty-start')}
                className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Kemaskini Maklumat
              </button>
            </div>
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
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
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
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold">Dashboard {isTestMode ? 'Simulasi' : 'Petugas'}</h1>
                      {isTestMode && (
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                          TEST MODE ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-gray-400 text-xs flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {selectedRegion ? `Negeri: ${selectedRegion}` : 'Mode: Single'}
                      </p>
                      <p className={isTestMode ? 'text-orange-400 text-xs flex items-center gap-1' : 'text-blue-400 text-xs flex items-center gap-1'}>
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
                      {programInfo.nama && (
                        <p className="text-purple-400 text-xs flex items-center gap-1">
                          <Wand2 className="w-3 h-3" />
                          Program: {programInfo.nama}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowVitalReference(true)}
                      title="Rujukan Tanda Vital"
                      className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-all border border-gray-700"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowGuideline(true)}
                      title="Panduan Penggunaan"
                      className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-all border border-gray-700"
                    >
                      <BookOpen className="w-4 h-4" />
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

              {/* Floating Logout Icon - Small & Discreet */}
              <div className="absolute right-6 top-[135px] z-10">
                <button
                  onClick={handleLogout}
                  title="Log Keluar"
                  className="p-1.5 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg border border-gray-100 shadow-sm transition-all active:scale-95 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Log Keluar</span>
                </button>
              </div>

              {/* Auth Warning Banner */}
              {authError && (
                <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-900">Ralat Pangkalan Data</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      {authError}. Sila pastikan konfigurasi Supabase betul.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
                <button
                  onClick={() => setDashboardTab('form')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    dashboardTab === 'form' 
                      ? 'border-blue-600 text-blue-600 bg-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Borang Laporan
                </button>
                <button
                  onClick={() => setDashboardTab('reports')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    dashboardTab === 'reports' 
                      ? 'border-blue-600 text-blue-600 bg-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Senarai Laporan
                </button>
              </div>

              <AnimatePresence mode="wait">
                {dashboardTab === 'form' ? (
                  <motion.div
                    key="form-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
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
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-blue-600" />
                      <h2 className="text-lg font-semibold text-gray-900">Maklumat Program</h2>
                    </div>
                    {programInfo.nama && (
                      <button
                        type="button"
                        onClick={autoFillProgram}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        AUTO FILL PROGRAM
                      </button>
                    )}
                  </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Program</label>
                          <input 
                            type="text" 
                            name="namaProgram"
                            value={formData.namaProgram || ''}
                            onChange={handleInputChange}
                            readOnly={!!programInfo.nama}
                            className={`w-full p-3 border border-gray-200 rounded-xl outline-none transition-all ${
                              !!programInfo.nama ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            }`} 
                            placeholder="Contoh: Larian Amal 2026" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi Program</label>
                          <input 
                            type="text" 
                            name="lokasi"
                            value={formData.lokasi || ''}
                            onChange={handleInputChange}
                            readOnly={!!programInfo.nama}
                            className={`w-full p-3 border border-gray-200 rounded-xl outline-none transition-all ${
                              !!programInfo.nama ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            }`} 
                            placeholder="Lokasi Acara" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tarikh</label>
                          <input 
                            type="date" 
                            name="tarikh"
                            value={formData.tarikh || ''}
                            onChange={handleInputChange}
                            readOnly={!!programInfo.nama}
                            className={`w-full p-3 border border-gray-200 rounded-xl outline-none transition-all ${
                              !!programInfo.nama ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            }`} 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Masa</label>
                          <div className="flex gap-2">
                            <input 
                              type="time" 
                              name="masa"
                              value={formData.masa || ''}
                              onChange={handleInputChange}
                              className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
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

                {/* Section: Lokasi Kes */}
                <section>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <h2 className="text-lg font-semibold text-gray-900">Lokasi Kes</h2>
                    </div>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded-lg text-xs font-bold transition-all active:scale-95"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      DAPATKAN LOKASI SEMASA
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Latitude</label>
                      <input 
                        type="text" 
                        name="lat"
                        value={formData.lat || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" 
                        placeholder="0.000000" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Longitude</label>
                      <input 
                        type="text" 
                        name="lng"
                        value={formData.lng || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" 
                        placeholder="0.000000" 
                      />
                    </div>
                    <div className="flex items-end">
                      {formData.lat && formData.lng ? (
                        <a 
                          href={`https://www.google.com/maps?q=${formData.lat},${formData.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
                        >
                          <Map className="w-4 h-4" />
                          LIHAT DI GOOGLE MAPS
                        </a>
                      ) : (
                        <div className="w-full p-3 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 italic">
                          Sila dapatkan lokasi untuk pautan Maps
                        </div>
                      )}
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
                        value={formData.namaPesakit || ''}
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
                        value={formData.umur || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
                        placeholder="Tahun" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Jantina</label>
                      <select 
                        name="jantina"
                        value={formData.jantina || ''}
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
                          value={formData.aduan || ''}
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
                          value={formData.tandaVital || ''}
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
                          value={formData.rawatan || ''}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all h-44" 
                          placeholder="Nyatakan rawatan yang telah diberikan..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Section: Laporan Bergambar */}
                <section className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg font-semibold text-gray-900">Laporan Bergambar</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        AMBIL GAMBAR
                      </button>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        MUAT NAIK
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {isCapturing && (
                    <div className="mb-4 relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 flex gap-4">
                        <button
                          type="button"
                          onClick={captureImage}
                          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90"
                        >
                          <div className="w-10 h-10 border-4 border-gray-900 rounded-full"></div>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-lg"
                        >
                          BATAL
                        </button>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200">
                        <img src={img} alt={`Capture ${index}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {images.length === 0 && !isCapturing && (
                      <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Tiada gambar dilampirkan. Sila ambil gambar atau muat naik.</p>
                      </div>
                    )}
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
                        value={formData.statusKes || ''}
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
                        value={formData.namaPerawat || ''}
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
                        value={formData.namaResponder || ''}
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
          </motion.div>
        ) : (
          <motion.div
            key="reports-tab"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-blue-600" />
                Senarai Kes Dilaporkan
              </h2>
              <div className="flex items-center gap-2">
                {!isTestMode && (
                  <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 mr-2">
                    <button
                      onClick={() => setResponderViewMode('live')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                        responderViewMode === 'live' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Live
                    </button>
                    <button
                      onClick={() => setResponderViewMode('test')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                        responderViewMode === 'test' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Test
                    </button>
                  </div>
                )}
                {isTestMode && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 rounded-lg border border-orange-100 mr-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Test Mode Active</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowVitalReference(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                  title="Rujukan Tanda Vital (BP, HR, SpO2 & DXT)"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideline(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                  title="Panduan Penggunaan"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                  title="Tetapan Sistem"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                   onClick={fetchReports}
                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600"
                   title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoadingReports ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">No Kes</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Pesakit</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status Akhir</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Telegram</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoadingReports ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 space-y-4">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto opacity-20" />
                          <p>Memuatkan senarai laporan...</p>
                        </td>
                      </tr>
                    ) : Object.keys(groupedResponderReports).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 space-y-4">
                          <FileText className="w-8 h-8 mx-auto opacity-20" />
                          <p>Tiada laporan aktif ditemui bagi program yang sedang berjalan.</p>
                        </td>
                      </tr>
                    ) : (
                      Object.keys(groupedResponderReports).map((progName) => (
                        <React.Fragment key={progName}>
                          <tr className="bg-gray-50/80">
                            <td colSpan={5} className="px-6 py-2">
                              <div className="flex items-center gap-2">
                                <Wand2 className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">{progName}</span>
                                {programInfo && programInfo.nama === progName && (
                                  <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Program Semasa</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          {groupedResponderReports[progName].map((report, idx) => (
                            <tr key={report.id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0">
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {report.case_number || `#${idx + 1}`}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-gray-900">{report.nama_pesakit}</p>
                                  {report.images && report.images.length > 0 && (
                                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" title={`${report.images.length} gambar`} />
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{report.jantina}, {report.umur} thn</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  report.status_kes === 'Discaj' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                  {report.status_kes}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center">
                                  {report.telegramStatus === 'success' ? (
                                    <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                      <Send className="w-3 h-3" />
                                      <span className="text-[9px] font-bold uppercase">Berjaya</span>
                                    </div>
                                  ) : report.telegramStatus === 'failed' ? (
                                    <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                      <Send className="w-3 h-3" />
                                      <span className="text-[9px] font-bold uppercase">Gagal</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                      <Send className="w-3 h-3" />
                                      <span className="text-[9px] font-bold uppercase">Tiada</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => resendReportToTelegram(report)}
                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm cursor-pointer border-none"
                                    title="Hantar Semula ke Telegram"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => setSelectedReport(report)}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm cursor-pointer border-none"
                                    title="Lihat Terperinci"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

        {/* Collapsible Links Section */}
        <div className="mt-6">
          <button
            onClick={() => setIsLinksExpanded(!isLinksExpanded)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center gap-2 text-gray-700 font-bold">
              <LayoutGrid className="w-5 h-5 text-blue-600" />
              <span>Pautan Pantas & Rujukan</span>
            </div>
            <ChevronLeft className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isLinksExpanded ? 'rotate-270' : 'rotate-90'}`} />
          </button>

          <AnimatePresence>
            {isLinksExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={() => setShowVitalReference(true)}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <Activity className="w-6 h-6 text-blue-600 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-gray-900">Rujukan Tanda Vital</h4>
                      <p className="text-xs text-gray-500">BP, PR, SpO2, DXT mengikut umur</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowGuideline(true)}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                      <Clock className="w-6 h-6 text-purple-600 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-gray-900">Panduan Penggunaan</h4>
                      <p className="text-xs text-gray-500">Langkah-langkah melapor kes</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )}

    {view === 'mecc' && (() => {
      const calculateDuration = (loginStr: string, logoutStr: string | null) => {
        if (!loginStr) return '-';
        const start = new Date(loginStr);
        const end = logoutStr ? new Date(logoutStr) : new Date();
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
        
        const diffMs = end.getTime() - start.getTime();
        if (diffMs < 0) return '0m';
        
        const diffMins = Math.floor(diffMs / 60000);
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        if (hrs > 0) {
          return `${hrs}j ${mins}m`;
        }
        return `${mins}m`;
      };

      const toMalaysiaTime = (isoString: string | null) => {
        if (!isoString) return '-';
        try {
          const d = new Date(isoString);
          if (isNaN(d.getTime())) return isoString;
          return d.toLocaleString('ms-MY', {
            timeZone: 'Asia/Kuala_Lumpur',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }) + ' (MYT)';
        } catch (err) {
          return isoString;
        }
      };

      return (
        <motion.div
          key="mecc"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-6xl mt-6"
        >
          <div className="bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden min-h-[80vh] flex flex-col">
            
            {/* MECC Header */}
            <div className="bg-red-950 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-900/30">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView('selection')}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
                  title="Kembali"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-red-600 text-[8px] font-bold uppercase rounded-full tracking-wider animate-pulse">ADMIN STATUS</span>
                    <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight">Pusat Penyelarasan Medik (MECC)</h2>
                  </div>
                  <p className="text-red-200/70 text-xs mt-0.5">Sistem Pengurusan & Pemantauan Petugas Bersepadu</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    fetchReports();
                    fetchAttendanceLogs();
                    showNotification('Segarkan Data', 'Semua data telah dikemaskini dari Firebase & Supabase.', 'success');
                  }}
                  className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer flex items-center justify-center text-white border-none"
                  title="Segarkan semula data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Logged in admin avatar/details */}
                {firebaseUser && (
                  <div className="flex items-center gap-3 border-l border-white/20 pl-4">
                    {firebaseUser.photoURL ? (
                      <img src={firebaseUser.photoURL} alt="Admin" className="w-9 h-9 rounded-full border border-red-500/40" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-red-800 text-white flex items-center justify-center font-bold text-sm">
                        {firebaseUser.displayName?.charAt(0) || 'A'}
                      </div>
                    )}
                    <div className="hidden md:block text-left">
                      <p className="text-xs font-bold leading-tight">{firebaseUser.displayName}</p>
                      <p className="text-[10px] text-red-200/60 leading-none">{firebaseUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await logoutFirebase();
                        setView('selection');
                        showNotification('Log Keluar', 'Telah keluar dari admin MECC dengan selamat.', 'info');
                      }}
                      className="p-2 hover:bg-red-900/60 text-red-105 hover:text-white rounded-xl transition-all cursor-pointer bg-transparent border-none"
                      title="Log Keluar Google"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MECC Navigation Tabs */}
            <div className="flex border-b border-gray-100 px-6 bg-gray-50/50 justify-between items-center flex-wrap gap-2">
              <div className="flex space-x-1 py-3 overflow-x-auto">
                <button
                  onClick={() => setMeccTab('dashboard')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none bg-transparent ${
                    meccTab === 'dashboard' 
                      ? 'bg-red-50 text-red-900 shadow-sm border border-red-100/50 font-bold' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 font-medium'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>

                <button
                  onClick={() => setMeccTab('log_petugas')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none bg-transparent ${
                    meccTab === 'log_petugas' 
                      ? 'bg-red-50 text-red-900 shadow-sm border border-red-100/50 font-bold' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 font-medium'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Rekod Log Petugas
                </button>
                
                <button
                  onClick={() => setMeccTab('rekod_kes')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none bg-transparent ${
                    meccTab === 'rekod_kes' 
                      ? 'bg-red-50 text-red-900 shadow-sm border border-red-100/50 font-bold' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 font-medium'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Rekod Kes
                </button>

                <button
                  onClick={() => setMeccTab('laporan_program')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none bg-transparent ${
                    meccTab === 'laporan_program' 
                      ? 'bg-red-50 text-red-900 shadow-sm border border-red-100/50 font-bold' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 font-medium'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Laporan Program
                </button>

                <button
                  onClick={() => setMeccTab('data_management')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none bg-transparent ${
                    meccTab === 'data_management' 
                      ? 'bg-red-50 text-red-900 shadow-sm border border-red-100/50 font-bold' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 font-medium'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Data Management
                </button>
              </div>

              <div className="py-2 pr-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-100">
                  Jumlah Kes Keseluruhan: <b>{reports.length}</b>
                </span>
              </div>
            </div>

            {/* Main Content Areas */}
            <div className="flex-1 p-6">
              
              {/* TAB 0: DASHBOARD UTAMA */}
              {meccTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                          <Activity className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-900/50 uppercase tracking-wider">Jumlah Kes</p>
                          <h4 className="text-3xl font-black text-blue-900">{reports.filter(r => r.mode === 'live').length}</h4>
                        </div>
                      </div>
                      <p className="text-[10px] text-blue-600/70 font-medium">Rekod kes aktif dalam pangkalan data live</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-3xl border border-green-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-green-900/50 uppercase tracking-wider">Petugas Aktif</p>
                          <h4 className="text-3xl font-black text-green-900">{attendanceLogs.filter(a => !a.logout_time && a.mode === 'live').length}</h4>
                        </div>
                      </div>
                      <p className="text-[10px] text-green-600/70 font-medium">Responders yang sedang bertugas sekarang</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-3xl border border-red-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-red-900/50 uppercase tracking-wider">Lokasi Program</p>
                          <h4 className="text-3xl font-black text-red-900">{[...new Set(reports.map(r => r.nama_program || r.namaProgram))].filter(Boolean).length}</h4>
                        </div>
                      </div>
                      <p className="text-[10px] text-red-600/70 font-medium">Jumlah program yang telah direkodkan</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 px-1 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-600" />
                      Kawalan Pantas & Pengurusan Data
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setMeccTab('data_management');
                          setMeccDataSubTab('rekod_kes');
                        }}
                        className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:border-red-200 hover:bg-red-50/30 transition-all group text-left cursor-pointer shadow-sm"
                      >
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:scale-110 transition-transform">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Padam Rekod Kes Pesakit</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">Akses menu pembersihan data pukal untuk laporan kes.</p>
                        </div>
                        <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-red-500 transition-colors" />
                      </button>

                      <button
                        onClick={() => {
                          setMeccTab('data_management');
                          setMeccDataSubTab('petugas_log');
                        }}
                        className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:border-red-200 hover:bg-red-50/30 transition-all group text-left cursor-pointer shadow-sm"
                      >
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:scale-110 transition-transform">
                          <UserMinus className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Padam Log Kehadiran Petugas</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">Akses menu pembersihan data pukal untuk log kehadiran.</p>
                        </div>
                        <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-24 h-24 text-orange-900" />
                    </div>
                    <div className="relative z-10">
                      <h4 className="text-sm font-bold text-orange-900 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Pembersihan Sistem (Mode Ujian)
                      </h4>
                      <p className="text-xs text-orange-800/70 mt-1 max-w-xl">
                        Gunakan menu Data Management untuk memadam semua "Test Data" dengan satu klik. Pastikan anda menukar mod kepada "SIMULASI TEST" sebelum melakukan pembersihan pukal.
                      </p>
                      <button
                        onClick={() => {
                          setMeccTab('data_management');
                          setMeccViewMode('test');
                        }}
                        className="mt-4 px-4 py-2 bg-orange-500 text-white text-[10px] font-bold rounded-lg hover:bg-orange-600 transition-colors cursor-pointer border-none shadow-sm"
                      >
                        Urus Data Ujian Sekarang
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1: REKOD LOG PETUGAS */}
              {meccTab === 'log_petugas' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-left">
                      <h3 className="text-md font-bold text-gray-900">Senarai Kehadiran & Status Petugas</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Pantau petugas di lapangan, waktu login/logout, dan status aktif tugas.</p>
                    </div>
                  </div>

                  {isLoadingAttendance ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <RefreshCw className="w-8 h-8 text-red-600 animate-spin mb-3" />
                      <span className="text-xs text-gray-500">Memuat log kehadiran dari pangkalan data...</span>
                    </div>
                  ) : attendanceLogs.length === 0 ? (
                    <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
                      <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-xs font-medium text-gray-600">Tiada log kemasukan tugas direkodkan.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold">
                              <th className="p-4">Nama Petugas</th>
                              <th className="p-4">Program / Lokasi</th>
                              <th className="p-4">Masa Log Masuk</th>
                              <th className="p-4">Masa Log Keluar</th>
                              <th className="p-4">Status</th>
                              <th className="p-4">Tempoh Log Tugas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700">
                            {attendanceLogs.map((log) => {
                              const isAktif = !log.logout_time;
                              return (
                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="p-4 font-bold text-gray-905 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${isAktif ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                    {log.nama}
                                  </td>
                                  <td className="p-4 text-left">
                                    <p className="font-semibold text-gray-800">{log.program_nama || "N/A"}</p>
                                    <p className="text-[10px] text-gray-400">{log.kawasan} ({log.region})</p>
                                  </td>
                                  <td className="p-4 font-mono text-gray-500">{toMalaysiaTime(log.login_time)}</td>
                                  <td className="p-4 font-mono text-gray-500">{toMalaysiaTime(log.logout_time)}</td>
                                  <td className="p-4 text-left">
                                    {isAktif ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold border border-green-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                                        Aktif Tugas
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-semibold border border-gray-200">
                                        Tamat Tugas
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 font-mono font-bold text-gray-900 text-left">
                                    {calculateDuration(log.login_time, log.logout_time)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REKOD KES */}
              {meccTab === 'rekod_kes' && (
                <div className="space-y-6 text-left">
                  {/* Top Case Statistics Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 1. Status Kes */}
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Status Kes</span>
                        <div className="p-1 px-2 bg-blue-50 text-blue-700 font-bold text-[8px] rounded-full uppercase">Klinikal</div>
                      </div>
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Discaj:</span>
                          <span className="font-bold text-gray-950">
                            {reports.filter(r => (r.status_kes || r.statusKes || '').toLowerCase().includes('discaj') || (r.status_kes || r.statusKes || '').toLowerCase().includes('discharge')).length}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Dirujuk Hospital:</span>
                          <span className="font-bold text-gray-950">
                            {reports.filter(r => (r.status_kes || r.statusKes || '').toLowerCase().includes('rujuk') || (r.status_kes || r.statusKes || '').toLowerCase().includes('refer')).length}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Aktif/Lain:</span>
                          <span className="font-bold text-gray-950">
                            {reports.filter(r => !(r.status_kes || r.statusKes || '').toLowerCase().includes('discaj') && !(r.status_kes || r.statusKes || '').toLowerCase().includes('rujuk')).length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Rujukan */}
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Rujukan</span>
                        <div className="p-1 px-2 bg-amber-50 text-amber-700 font-bold text-[8px] rounded-full uppercase">Logistik</div>
                      </div>
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Rujukan Hospital:</span>
                          <span className="font-bold text-amber-700">
                            {reports.filter(r => (r.status_kes || r.statusKes || '').toLowerCase().includes('rujuk')).length}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Klinik Swasta/Lain:</span>
                          <span className="font-bold text-gray-900">
                            {reports.filter(r => (r.status_kes || r.statusKes || '').toLowerCase().includes('klinik')).length}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50 leading-none">
                          <span>Sistem ambulans dikoordinasi</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Status Ikut Petugas */}
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between max-h-[120px] overflow-y-auto">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Status Ikut Petugas</span>
                        <div className="p-1 px-2 bg-purple-50 text-purple-700 font-bold text-[8px] rounded-full uppercase">Responders</div>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(
                          reports.reduce((acc, curr) => {
                            const key = curr.nama_responder || curr.namaResponder || 'N/A';
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).slice(0, 3).map(([name, count]) => (
                          <div key={name} className="flex justify-between text-[11px] truncate">
                            <span className="text-gray-500 truncate max-w-[100px]" title={name}>{name}:</span>
                            <span className="font-bold text-gray-900 shrink-0">{count} kes</span>
                          </div>
                        ))}
                        {reports.length === 0 && (
                          <span className="text-gray-400 text-xs text-left">Tiada data</span>
                        )}
                      </div>
                    </div>

                    {/* 4. Status Ikut Cekpoint */}
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between max-h-[120px] overflow-y-auto">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Status Ikut Cekpoint</span>
                        <div className="p-1 px-2 bg-emerald-50 text-emerald-700 font-bold text-[8px] rounded-full uppercase">Pos Kawasan</div>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(
                          reports.reduce((acc, curr) => {
                            const key = curr.kawasan || 'N/A';
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).slice(0, 3).map(([kawasan, count]) => (
                          <div key={kawasan} className="flex justify-between text-[11px] truncate">
                            <span className="text-gray-500 truncate max-w-[100px]" title={kawasan}>{kawasan}:</span>
                            <span className="font-bold text-gray-950 shrink-0">{count} kes</span>
                          </div>
                        ))}
                        {reports.length === 0 && (
                          <span className="text-gray-400 text-xs text-left">Tiada data</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="p-4 bg-gray-50 border border-gray-200/50 rounded-2xl flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="Tapis mengikut Nama Program..."
                        value={meccSearchProgram}
                        onChange={(e) => setMeccSearchProgram(e.target.value)}
                        className="w-full bg-white pl-9 py-2.5 text-xs rounded-xl border border-gray-200 focus:border-red-500 focus:outline-none transition-all placeholder-gray-400 font-medium"
                      />
                    </div>
                    
                    <div className="flex-1 relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="Tapis mengikut Petugas..."
                        value={meccSearchPetugas}
                        onChange={(e) => setMeccSearchPetugas(e.target.value)}
                        className="w-full bg-white pl-9 py-2.5 text-xs rounded-xl border border-gray-200 focus:border-red-500 focus:outline-none transition-all placeholder-gray-400 font-medium"
                      />
                    </div>
                  </div>

                  {/* Case Record List Table */}
                  {reports.length === 0 ? (
                    <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
                      <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-xs font-semibold text-gray-600">Tiada laporan kes ditemui.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold">
                              <th className="p-4">Pesakit</th>
                              <th className="p-4">Aduan / Masalah Klinik</th>
                              <th className="p-4">Rawatan Diberikan</th>
                              <th className="p-4">Status Kes</th>
                              <th className="p-4">Program & Petugas</th>
                              <th className="p-4 text-center">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700">
                            {reports
                              .filter(r => {
                                const progMatch = (r.nama_program || r.namaProgram || '').toLowerCase().includes(meccSearchProgram.toLowerCase());
                                const petMatch = (r.nama_responder || r.namaResponder || r.nama_perawat || '').toLowerCase().includes(meccSearchPetugas.toLowerCase());
                                return progMatch && petMatch;
                              })
                              .map((r) => {
                                const patientGenderSym = (r.jantina || '').toLowerCase() === 'lelaki' ? 'L' : (r.jantina || '').toLowerCase() === 'perempuan' ? 'P' : '-';
                                return (
                                  <tr key={r.id || r.firebaseId || r.supabaseId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900">{r.nama_pesakit || r.namaPesakit || 'Pesakit Am'}</p>
                                        {(r.lat && r.lng) && (
                                          <a 
                                            href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-green-600 hover:text-green-700 transition-colors"
                                            title="Buka Lokasi di Google Maps"
                                          >
                                            <MapPin className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                        {r.images && r.images.length > 0 && (
                                          <div className="flex items-center gap-1 text-indigo-500" title={`${r.images.length} gambar lampiran`}>
                                            <ImageIcon className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">{r.images.length}</span>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-400">{r.umur} tahun • {patientGenderSym}</p>
                                    </td>
                                    <td className="p-4 font-medium text-gray-800 truncate max-w-[200px]" title={r.aduan || r.aduanUtama}>
                                      {r.aduan || r.aduanUtama || '-'}
                                    </td>
                                    <td className="p-4 text-gray-600 truncate max-w-[200px]" title={r.rawatan}>
                                      {r.rawatan || '-'}
                                    </td>
                                    <td className="p-4">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                        (r.status_kes || r.statusKes || '').toLowerCase().includes('rujuk') 
                                          ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                          : (r.status_kes || r.statusKes || '').toLowerCase().includes('discaj')
                                          ? 'bg-green-50 text-green-700 border-green-100'
                                          : 'bg-blue-50 text-blue-700 border-blue-100'
                                      }`}>
                                        {r.status_kes || r.statusKes || 'Dalam Rawatan'}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <p className="font-semibold text-gray-800">{r.nama_program || r.namaProgram || '-'}</p>
                                      <p className="text-[10px] text-purple-650 font-bold">petugas: {r.nama_responder || r.namaResponder || '-'}</p>
                                    </td>
                                    <td className="p-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMeccReport(r)}
                                        className="px-3.5 py-2 bg-gray-950 hover:bg-gray-800 text-white font-bold rounded-xl transition-all active:scale-95 inline-flex items-center gap-1 cursor-pointer text-[10px] border-none"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        Buka Maklumat Lengkap
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2.5: LAPORAN PROGRAM */}
              {meccTab === 'laporan_program' && (() => {
                // Determine unique programs from both reports and attendance logs
                const uniquePrograms = Array.from(new Set([
                  ...reports.map(r => r.nama_program || r.namaProgram).filter(Boolean),
                  ...attendanceLogs.map(log => log.program_nama || log.programNama).filter(Boolean)
                ])).map(p => p.trim()).filter((v, i, a) => a.indexOf(v) === i);

                const programReports = selectedLaporanProgram 
                  ? reports.filter(r => {
                      const pName = r.nama_program || r.namaProgram || '';
                      return pName.toLowerCase().trim() === selectedLaporanProgram.toLowerCase().trim();
                    })
                  : [];

                const programAttendance = selectedLaporanProgram
                  ? attendanceLogs.filter(log => {
                      const pName = log.program_nama || log.programNama || '';
                      return pName.toLowerCase().trim() === selectedLaporanProgram.toLowerCase().trim();
                    })
                  : [];

                const totalCasesCount = programReports.length;
                const totalStaffCount = new Set(programAttendance.map(log => log.nama?.toLowerCase().trim())).size;
                const totalDischarged = programReports.filter(r => {
                  const status = (r.status_kes || r.statusKes || '').toLowerCase();
                  return status.includes('discaj') || status.includes('discharge') || status.includes('selesai');
                }).length;
                const totalReferred = programReports.filter(r => {
                  const status = (r.status_kes || r.statusKes || '').toLowerCase();
                  return status.includes('rujuk') || status.includes('refer') || status.includes('hospital');
                }).length;

                return (
                  <div className="space-y-6 text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Modul Analisis Laporan Program/Acara Lapangan</h3>
                        <p className="text-xs text-gray-500">Pilih program perubatan atau acara di lapangan untuk menganalisis data kehadiran petugas bersama rekod klinikal kes.</p>
                      </div>

                      {selectedLaporanProgram && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsProgramReportModalOpen(true)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 border-none cursor-pointer shadow-md shadow-purple-900/10"
                          >
                            <FileBarChart className="w-3.5 h-3.5" />
                            Jana Laporan PDF
                          </button>
                          <button
                            onClick={() => setSelectedLaporanProgram('')}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 border-none cursor-pointer"
                          >
                            Tukar Program
                          </button>
                        </div>
                      )}
                    </div>

                    {!selectedLaporanProgram ? (
                      <div className="bg-gray-50/50 rounded-2xl border border-gray-200/60 p-8 text-center space-y-6">
                        <div className="max-w-md mx-auto space-y-4">
                          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-md font-bold text-gray-900">Sila Pilih Program Perubatan</h4>
                            <p className="text-xs text-gray-500">Pangkalan data MECC mengesan {uniquePrograms.length} program berbeza yang aktif atau telah ditamatkan.</p>
                          </div>

                          <div className="relative">
                            <select
                              value={selectedLaporanProgram}
                              onChange={(e) => setSelectedLaporanProgram(e.target.value)}
                              className="w-full bg-white p-3 pr-10 text-xs font-bold rounded-xl border border-gray-200 focus:border-red-650 focus:outline-none transition-all cursor-pointer appearance-none text-gray-800"
                            >
                              <option value="">-- PILIH PROGRAM UNTUK DIANALISIS --</option>
                              {uniquePrograms.map(prog => (
                                <option key={prog} value={prog}>{prog}</option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {uniquePrograms.length > 0 && (
                          <div className="pt-6 border-t border-gray-200/50">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-left mb-3">Klik Pintas Program Terkini</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {uniquePrograms.slice(0, 6).map(prog => {
                                const cases = reports.filter(r => (r.nama_program || r.namaProgram || '').trim() === prog).length;
                                const staff = attendanceLogs.filter(log => (log.program_nama || log.programNama || '').trim() === prog).length;
                                return (
                                  <button
                                    key={prog}
                                    onClick={() => setSelectedLaporanProgram(prog)}
                                    className="p-4 bg-white hover:bg-red-50/30 text-left rounded-xl border border-gray-200 hover:border-red-200/60 transition-all cursor-pointer group flex flex-col justify-between"
                                  >
                                    <span className="text-xs font-bold text-gray-800 group-hover:text-red-950 transition-colors line-clamp-1">{prog}</span>
                                    <div className="flex gap-3 mt-3 text-[10px] text-gray-400 font-medium">
                                      <span><b>{cases}</b> Kes</span>
                                      <span><b>{staff}</b> Hadir</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        
                        {/* Dynamic Program Statistics Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="p-4 bg-red-950 text-white rounded-2xl border border-red-900/30 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] font-bold text-red-200/70 uppercase tracking-widest">Nama Program</span>
                            <span className="text-sm font-bold mt-2 text-white line-clamp-1" title={selectedLaporanProgram}>
                              {selectedLaporanProgram}
                            </span>
                          </div>

                          <div className="p-4 bg-white rounded-2xl border border-gray-100 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jumlah Kes Bersepadu</span>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-bold text-gray-900">{totalCasesCount}</span>
                              <span className="text-xs font-semibold text-gray-400">pesakit dirawat</span>
                            </div>
                          </div>

                          <div className="p-4 bg-white rounded-2xl border border-gray-100 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Petugas Kehadiran</span>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-bold text-purple-700">{totalStaffCount}</span>
                              <span className="text-xs font-semibold text-gray-400">petugas berdaftar</span>
                            </div>
                          </div>

                          <div className="p-4 bg-white rounded-2xl border border-gray-100 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status Ringkasan Kes</span>
                            <div className="mt-2 text-xs font-semibold space-y-0.5">
                              <div className="flex justify-between text-green-700">
                                <span>Selesai/Discaj:</span>
                                <b>{totalDischarged}</b>
                              </div>
                              <div className="flex justify-between text-amber-700">
                                <span>Rujuk Hospital:</span>
                                <b>{totalReferred}</b>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION A: SENARAI KES UNTUK PROGRAM INI */}
                        <div className="space-y-3">
                          <div className="border-b border-gray-200/60 pb-2 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 bg-red-600 rounded-full" />
                              Senarai Kes Perubatan ({programReports.length})
                            </h4>
                            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Kes Aktif & Selesai</span>
                          </div>

                          {programReports.length === 0 ? (
                            <div className="p-8 bg-gray-50 rounded-2xl text-center border border-gray-150">
                              <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-500 font-medium font-sans">Tiada kes klinikal atau pesakit direkodkan bagi program ini.</p>
                            </div>
                          ) : (
                            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold">
                                      <th className="p-4 w-1/4">Maklumat Pesakit</th>
                                      <th className="p-4 w-1/6">Nama Petugas Responders</th>
                                      <th className="p-4 w-5/12">Ringkasan Kes Perubatan</th>
                                      <th className="p-4 w-1/12 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-gray-700">
                                    {programReports.map((r, idx) => {
                                      const patientGenderSym = (r.jantina || '').toLowerCase() === 'lelaki' ? 'L' : (r.jantina || '').toLowerCase() === 'perempuan' ? 'P' : '-';
                                      const responderName = r.nama_responder || r.namaResponder || r.nama_perawat || r.namaPerawat || 'N/A';
                                      
                                      // Formulate the full detail summary of each case
                                      const complaintStr = r.aduan || r.aduanUtama || 'Tiada aduan spesifik';
                                      const vitalStr = r.tanda_vital || r.tandaVital || 'Tiada rekod tanda vital';
                                      const treatmentStr = r.rawatan || 'Tiada rawatan diberikan';
                                      const caseStatusStr = r.status_kes || r.statusKes || 'Selesai';

                                      return (
                                        <tr key={r.id || r.firebaseId || idx} className="hover:bg-gray-50/30 transition-colors">
                                          <td className="p-4">
                                            <div className="font-bold text-gray-900">{r.nama_pesakit || r.namaPesakit || 'Pesakit Am'}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">Umur: {r.umur || '-'} tahun • Jantina: {patientGenderSym}</div>
                                            <div className="text-[10px] text-gray-500/80 font-medium mt-1">Tarikh: {r.tarikh || '-'} ({r.masa || '-'})</div>
                                          </td>
                                          <td className="p-4">
                                            <div className="font-bold text-purple-900 truncate max-w-[150px]" title={responderName}>
                                              {responderName}
                                            </div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Medic / Perawat</div>
                                          </td>
                                          <td className="p-4">
                                            <div className="bg-gray-50/80 border border-gray-150 p-2.5 rounded-xl text-gray-800 space-y-1">
                                              <p className="font-semibold text-gray-900">
                                                Ringkasan Kes:
                                              </p>
                                              <p className="text-[11px] text-gray-600 leading-relaxed">
                                                Pesakit datang dengan aduan <b className="text-gray-900 font-bold">{complaintStr}</b>.
                                                Tanda-tanda vital dikesan <b className="text-red-950 font-mono font-bold">[{vitalStr}]</b>.
                                                Telah diberikan rawatan/intervensi: <span className="text-blue-900 font-medium">{treatmentStr}</span>.
                                              </p>
                                            </div>
                                          </td>
                                          <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-[9px] font-bold border inline-block ${
                                              caseStatusStr.toLowerCase().includes('rujuk') 
                                                ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                                : caseStatusStr.toLowerCase().includes('discaj') || caseStatusStr.toLowerCase().includes('selesai')
                                                ? 'bg-green-50 text-green-700 border-green-100'
                                                : 'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                              {caseStatusStr}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION B: SENARAI PETUGAS & SHIFT (REKOD KEHADIRAN) */}
                        <div className="space-y-3">
                          <div className="border-b border-gray-200/60 pb-2 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 bg-purple-600 rounded-full" />
                              Sijil & Rekod Kehadiran Petugas ({programAttendance.length})
                            </h4>
                            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Shift Rekod Kehadiran</span>
                          </div>

                          {programAttendance.length === 0 ? (
                            <div className="p-8 bg-gray-50 rounded-2xl text-center border border-gray-150">
                              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-500 font-medium font-sans">Tiada log kehadiran kemasukan tugas aktif bagi program ini dalam pangkalan data.</p>
                            </div>
                          ) : (
                            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold">
                                      <th className="p-4 border-r border-gray-100">Nama Petugas</th>
                                      <th className="p-4 border-r border-gray-100">Jumlah Kes Terkawal</th>
                                      <th className="p-4 border-r border-gray-100">Masa Log Masuk (UTC / Malaysia Time)</th>
                                      <th className="p-4 border-r border-gray-100">Masa Log Keluar (UTC / Malaysia Time)</th>
                                      <th className="p-4">Kawasan & Ringkasan Shift</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-gray-700">
                                    {programAttendance.map((log) => {
                                      const isAktif = !log.logout_time;
                                      
                                      // Compute how many cases are associated with this staff inside this program
                                      const staffCasesArray = programReports.filter(r => {
                                        const rName = (r.nama_responder || r.namaResponder || r.nama_perawat || r.namaPerawat || '').toLowerCase().trim();
                                        const staffName = (log.nama || '').toLowerCase().trim();
                                        return rName === staffName;
                                      });
                                      const staffCasesCount = staffCasesArray.length;

                                      return (
                                        <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                                          <td className="p-4">
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full shrink-0 ${isAktif ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                              <span className="font-bold text-gray-905">{log.nama}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">database: {log.source === 'both' ? 'Firebase & Supabase' : log.source === 'firestore' ? 'Firebase Only' : 'Supabase Only'}</span>
                                          </td>
                                          <td className="p-4 text-left">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-sans rounded-xl font-bold bg-gray-100 ${
                                              staffCasesCount > 0 ? 'bg-red-50 text-red-700 text-xs shadow-sm border border-red-100/30' : 'text-gray-500'
                                            }`}>
                                              {staffCasesCount} Kes Dikendali
                                            </span>
                                          </td>
                                          <td className="p-4 font-mono text-gray-500 text-[10px] space-y-1">
                                            <div><b className="text-gray-400 font-sans text-[9px] uppercase tracking-wider block">UTC Format:</b>{log.login_time || '-'}</div>
                                            <div className="text-red-950 font-bold bg-red-50/50 p-1.5 rounded border border-red-100/30"><b className="text-red-700 font-sans text-[9px] uppercase tracking-wider block">Malaysia Standard Time:</b>{toMalaysiaTime(log.login_time)}</div>
                                          </td>
                                          <td className="p-4 font-mono text-gray-500 text-[10px] space-y-1">
                                            {isAktif ? (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold border border-green-100 mt-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                                                Petugas Masih Aktif
                                              </span>
                                            ) : (
                                              <>
                                                <div><b className="text-gray-400 font-sans text-[9px] uppercase tracking-wider block">UTC Format:</b>{log.logout_time}</div>
                                                <div className="text-emerald-950 font-bold bg-emerald-50/50 p-1.5 rounded border border-emerald-100/30"><b className="text-emerald-600 font-sans text-[9px] uppercase tracking-wider block">Malaysia Standard Time:</b>{toMalaysiaTime(log.logout_time)}</div>
                                              </>
                                            )}
                                          </td>
                                          <td className="p-4">
                                            <div className="space-y-1 text-[11px]">
                                              <p className="font-semibold text-gray-800"><span className="text-gray-400 font-medium">Pos Kawasan:</span> {log.kawasan || 'N/A'}</p>
                                              <p className="text-gray-600"><span className="text-gray-400 font-medium">Tempoh Bertugas:</span> <b className="text-gray-900">{calculateDuration(log.login_time, log.logout_time)}</b></p>
                                              
                                              {/* Live shift patient summary */}
                                              <div className="text-[10px] text-gray-500 mt-2 bg-gray-50 p-1.5 rounded border border-gray-150">
                                                <span className="block font-bold text-gray-400 uppercase tracking-wide text-[8px] mb-1">Pesakit Yang Diuruskan:</span>
                                                {staffCasesArray.length === 0 ? (
                                                  <span className="italic text-gray-400 font-medium">Tiada kes klinikal didaftarkan petugas ini</span>
                                                ) : (
                                                  <span className="font-semibold text-gray-800 leading-tight">
                                                    {staffCasesArray.map(r => `${r.nama_pesakit || r.namaPesakit || 'Pesakit Am'} (${r.status_kes || r.statusKes})`).join(', ')}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 3: DATA MANAGEMENT */}
              {meccTab === 'data_management' && (
                <div className="space-y-6 text-left">
                  {/* Interior Subtabs */}
                  <div className="flex items-center justify-between border-b border-gray-100">
                    <div className="flex">
                      <button
                        onClick={() => setMeccDataSubTab('rekod_kes')}
                        className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                          meccDataSubTab === 'rekod_kes' 
                            ? 'border-red-600 text-red-700 font-bold' 
                            : 'border-transparent text-gray-400 hover:text-gray-700 font-medium'
                        }`}
                      >
                        Urus Rekod Kes ({reports.filter(r => r.mode === meccViewMode).length})
                      </button>
                      <button
                        onClick={() => setMeccDataSubTab('petugas_log')}
                        className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                          meccDataSubTab === 'petugas_log' 
                            ? 'border-red-600 text-red-700 font-bold' 
                            : 'border-transparent text-gray-400 hover:text-gray-700 font-medium'
                        }`}
                      >
                        Urus Log Kehadiran Petugas ({attendanceLogs.filter(a => a.mode === meccViewMode).length})
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 pr-4">
                      <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button
                          onClick={() => setMeccViewMode('live')}
                          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                            meccViewMode === 'live' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Live Data
                        </button>
                        <button
                          onClick={() => setMeccViewMode('test')}
                          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                            meccViewMode === 'test' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Test Mode
                        </button>
                      </div>
                      
                      {meccViewMode === 'test' && (
                        <button
                          onClick={handleResetTestData}
                          disabled={isSavingMeccEdit}
                          className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold border border-red-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSavingMeccEdit ? 'animate-spin' : ''}`} />
                          Padam Semua Test Data
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub Area A: Urus Rekod Kes */}
                  {meccDataSubTab === 'rekod_kes' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          Kawal Selia Laporan Kes {meccViewMode === 'test' ? '(SIMULASI TEST)' : '(LIVE MODE)'}
                        </span>
                        
                        {selectedMeccReportIds.length > 0 && (
                          <button
                            onClick={() => handleBulkDelete('report')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold shadow-md active:scale-95 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                            Padam {selectedMeccReportIds.length} Rekod Terpilih
                          </button>
                        )}
                      </div>

                      {reports.filter(r => r.mode === meccViewMode).length === 0 ? (
                        <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-xs text-gray-400">Tiada kes perubatan direkodkan untuk pemadaman atau kemas kini.</p>
                        </div>
                      ) : (
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                                  <th className="p-4 w-10 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedMeccReportIds(reports.filter(r => r.mode === meccViewMode).map(r => r.id));
                                        } else {
                                          setSelectedMeccReportIds([]);
                                        }
                                      }}
                                      checked={selectedMeccReportIds.length > 0 && selectedMeccReportIds.length === reports.filter(r => r.mode === meccViewMode).length}
                                    />
                                  </th>
                                  <th className="p-4">No Kes</th>
                                  <th className="p-4">Tarikh / Masa</th>
                                  <th className="p-4">Pesakit</th>
                                  <th className="p-4">Aduan Utama</th>
                                  <th className="p-4">Status</th>
                                  <th className="p-4">Telegram</th>
                                  <th className="p-4">DB Source</th>
                                  <th className="p-4 text-center">Tindakan Admin</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {reports.filter(r => r.mode === meccViewMode).map((report) => {
                                  const sourceName = report.supabaseId && report.firebaseId ? 'Both' : report.supabaseId ? 'Supabase Only' : 'Firebase Only';
                                  const isSelected = selectedMeccReportIds.includes(report.id);
                                  return (
                                    <tr key={report.id || report.firebaseId || report.supabaseId} className={`hover:bg-gray-50/40 transition-colors ${isSelected ? 'bg-red-50/30' : ''}`}>
                                      <td className="p-4 text-center">
                                        <input 
                                          type="checkbox" 
                                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                          checked={isSelected}
                                          onChange={() => {
                                            if (isSelected) {
                                              setSelectedMeccReportIds(prev => prev.filter(id => id !== report.id));
                                            } else {
                                              setSelectedMeccReportIds(prev => [...prev, report.id]);
                                            }
                                          }}
                                        />
                                      </td>
                                      <td className="p-4">
                                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                          {report.case_number || 'N/A'}
                                        </span>
                                      </td>
                                      <td className="p-4 font-mono text-gray-550">
                                        {report.tarikh} • {report.masa}
                                      </td>
                                      <td className="p-4">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-gray-900">
                                            {report.nama_pesakit || report.namaPesakit || '-'}
                                          </span>
                                          {report.images && report.images.length > 0 && (
                                            <div className="flex items-center gap-1 text-indigo-500" title={`${report.images.length} gambar lampiran`}>
                                              <ImageIcon className="w-3 h-3" />
                                              <span className="text-[10px] font-bold">{report.images.length}</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-4 truncate max-w-[200px]" title={report.aduan || report.aduanUtama}>
                                        {report.aduan || report.aduanUtama || '-'}
                                      </td>
                                      <td className="p-4">
                                        <span className="p-1 px-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg text-[10px]">
                                          {report.status_kes || report.statusKes}
                                        </span>
                                      </td>
                                      <td className="p-4">
                                        {report.telegramStatus === 'success' ? (
                                          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md border border-green-100 w-fit">
                                            <Send className="w-2.5 h-2.5" />
                                            <span className="text-[8px] font-bold uppercase">OK</span>
                                          </div>
                                        ) : report.telegramStatus === 'failed' ? (
                                          <div className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 w-fit">
                                            <Send className="w-2.5 h-2.5" />
                                            <span className="text-[8px] font-bold uppercase">Fail</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1 text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100 w-fit">
                                            <Send className="w-2.5 h-2.5" />
                                            <span className="text-[8px] font-bold uppercase">-</span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                          sourceName === 'Both' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                          sourceName === 'Supabase Only' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                          'bg-orange-50 text-orange-700 border border-orange-100'
                                        }`}>
                                          {sourceName}
                                        </span>
                                      </td>
                                      <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => resendReportToTelegram(report)}
                                            className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors cursor-pointer border-none"
                                            title="Hantar Semula ke Telegram"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingMeccReport({...report})}
                                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer border-none"
                                            title="Kemaskini Rekod"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setMeccDeleteConfirm({ type: 'report', item: report })}
                                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer border-none"
                                            title="Padam Rekod Secara Kekal"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub Area B: Urus Log Kehadiran */}
                  {meccDataSubTab === 'petugas_log' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          Kawal Selia Log Kehadiran {meccViewMode === 'test' ? '(SIMULASI TEST)' : '(LIVE MODE)'}
                        </span>
                        
                        {selectedMeccAttendanceIds.length > 0 && (
                          <button
                            onClick={() => handleBulkDelete('attendance')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold shadow-md active:scale-95 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                            Padam {selectedMeccAttendanceIds.length} Log Terpilih
                          </button>
                        )}
                      </div>

                      {attendanceLogs.filter(a => a.mode === meccViewMode).length === 0 ? (
                        <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-xs text-gray-400">Tiada log kehadiran petugas ditemui untuk pengemaskinian.</p>
                        </div>
                      ) : (
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                                  <th className="p-4 w-10 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedMeccAttendanceIds(attendanceLogs.filter(a => a.mode === meccViewMode).map(a => a.id));
                                        } else {
                                          setSelectedMeccAttendanceIds([]);
                                        }
                                      }}
                                      checked={selectedMeccAttendanceIds.length > 0 && selectedMeccAttendanceIds.length === attendanceLogs.filter(a => a.mode === meccViewMode).length}
                                    />
                                  </th>
                                  <th className="p-4">Nama Petugas</th>
                                  <th className="p-4">Sesi Program</th>
                                  <th className="p-4">Masa Masuk</th>
                                  <th className="p-4">Masa Keluar</th>
                                  <th className="p-4">DB Source</th>
                                  <th className="p-4 text-center">Tindakan Admin</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {attendanceLogs.filter(a => a.mode === meccViewMode).map((log) => {
                                  const sourceName = log.supabaseId && log.firebaseId ? 'Both' : log.supabaseId ? 'Supabase Only' : 'Firebase Only';
                                  const isSelected = selectedMeccAttendanceIds.includes(log.id);
                                  return (
                                    <tr key={log.id} className={`hover:bg-gray-50/40 transition-colors ${isSelected ? 'bg-red-50/30' : ''}`}>
                                      <td className="p-4 text-center">
                                        <input 
                                          type="checkbox" 
                                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                          checked={isSelected}
                                          onChange={() => {
                                            if (isSelected) {
                                              setSelectedMeccAttendanceIds(prev => prev.filter(id => id !== log.id));
                                            } else {
                                              setSelectedMeccAttendanceIds(prev => [...prev, log.id]);
                                            }
                                          }}
                                        />
                                      </td>
                                      <td className="p-4 font-bold text-gray-950">
                                        {log.nama}
                                      </td>
                                      <td className="p-4 text-left">
                                        <p className="font-semibold text-gray-800">{log.program_nama || "N/A"}</p>
                                        <p className="text-[9px] text-gray-400">{log.kawasan}</p>
                                      </td>
                                      <td className="p-4 font-mono text-gray-500">{toMalaysiaTime(log.login_time)}</td>
                                      <td className="p-4 font-mono text-gray-500">{toMalaysiaTime(log.logout_time)}</td>
                                      <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                          sourceName === 'Both' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                          sourceName === 'Supabase Only' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                          'bg-orange-50 text-orange-700 border border-orange-100'
                                        }`}>
                                          {sourceName}
                                        </span>
                                      </td>
                                      <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setEditingMeccLog({...log})}
                                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer border-none"
                                            title="Kemaskini Log Kehadiran"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setMeccDeleteConfirm({ type: 'attendance', item: log })}
                                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg transition-colors cursor-pointer border-none"
                                            title="Padam Log"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MODALS SECTION FOR MECC */}
            
            {/* 1. View Complete Report Modal */}
            <AnimatePresence>
              {selectedMeccReport && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                  onClick={() => setSelectedMeccReport(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden text-left"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="bg-red-950 p-6 text-white flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-800 rounded-xl">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold font-sans">Laporan Perubatan Lengkap</h3>
                          <p className="text-[10px] text-red-200/70 uppercase">MECC Case Registry System</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedMeccReport(null)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors font-bold text-white cursor-pointer bg-transparent border-none text-base"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Nama Pesakit</p>
                          <p className="text-sm font-bold text-gray-900">{selectedMeccReport.nama_pesakit || selectedMeccReport.namaPesakit || 'Pesakit Am'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Umur & Jantina</p>
                          <p className="text-sm font-bold text-gray-900">{selectedMeccReport.umur} thn • {selectedMeccReport.jantina || '-'}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Aduan Pesakit (Chief Complaint)</p>
                          <p className="text-xs text-gray-800 leading-relaxed font-semibold mt-1">{selectedMeccReport.aduan || selectedMeccReport.aduanUtama || '-'}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-150">
                          <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Tanda-Tanda Vital (Vital Signs)</p>
                          <p className="text-xs font-mono text-blue-700 bg-blue-50/50 p-2 rounded-lg font-bold border border-blue-100/55">{selectedMeccReport.tanda_vital || selectedMeccReport.tandaVital || '-'}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-red-50/35 rounded-xl border border-red-100/40">
                        <p className="text-[9px] font-bold text-red-850 uppercase">Rawatan yang Diberikan (Treatment)</p>
                        <p className="text-xs text-gray-850 leading-relaxed font-semibold mt-1">{selectedMeccReport.rawatan || '-'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Status Kes</p>
                          <p className="text-xs font-bold text-blue-700">{selectedMeccReport.status_kes || selectedMeccReport.statusKes || 'Selesai'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Pos Petugas (Kawasan)</p>
                          <p className="text-xs font-bold text-gray-900">{selectedMeccReport.kawasan || '-'}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-900 text-gray-150 rounded-2xl space-y-2 text-xs">
                        <p className="font-bold border-b border-white/10 pb-1 text-white uppercase text-[9px] tracking-wider">Logistik & Penyelarasan Program</p>
                        <div className="grid grid-cols-2 gap-2">
                          <p><span className="text-gray-400">Program:</span> <span className="font-bold text-white">{selectedMeccReport.nama_program || selectedMeccReport.namaProgram || '-'}</span></p>
                          <p><span className="text-gray-400">Negeri:</span> <span className="font-bold text-white">{selectedMeccReport.region || '-'}</span></p>
                          <p><span className="text-gray-400">Tarikh/Masa:</span> <span className="font-bold text-white">{selectedMeccReport.tarikh} | {selectedMeccReport.masa}</span></p>
                          <p><span className="text-gray-400">Pre-Hospital Care:</span> <span className="font-bold text-white">{selectedMeccReport.nama_perawat || selectedMeccReport.namaPerawat || '-'}</span></p>
                          <p className="col-span-2"><span className="text-gray-400">Responders Aktif:</span> <span className="font-bold text-white">{selectedMeccReport.nama_responder || selectedMeccReport.namaResponder || '-'}</span></p>
                        </div>
                      </div>

                      {selectedMeccReport.images && selectedMeccReport.images.length > 0 && (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Gambar Lampiran ({selectedMeccReport.images.length})</p>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedMeccReport.images.map((img: string, i: number) => (
                              <div 
                                key={i} 
                                className="aspect-video rounded-lg overflow-hidden border border-gray-200 cursor-zoom-in active:scale-95 transition-transform"
                                onClick={() => {
                                  setGalleryImages(selectedMeccReport.images);
                                  setGalleryIndex(i);
                                }}
                              >
                                <img src={img} alt={`Report ${i}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5 bg-gray-50 border-t border-gray-100 text-right">
                      <button
                        onClick={() => setSelectedMeccReport(null)}
                        className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer border-none"
                      >
                        Tutup Laporan
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. Admin Edit Case Report Modal */}
            <AnimatePresence>
              {editingMeccReport && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                  onClick={() => setEditingMeccReport(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden text-left"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-800 rounded-xl">
                          <Edit2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold font-sans">Kemaskini Rekod Laporan Kes</h3>
                          <p className="text-[10px] text-blue-200/70">Kemaskini langsung pangkalan data sebagai admin</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingMeccReport(null)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white font-bold cursor-pointer border-none bg-transparent text-base"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleUpdateReportSubmit}>
                      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nama Pesakit</label>
                            <input
                              type="text"
                              value={editingMeccReport.nama_pesakit || editingMeccReport.namaPesakit || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, nama_pesakit: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Jantina</label>
                            <select
                              value={editingMeccReport.jantina || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, jantina: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                            >
                              <option value="Lelaki">Lelaki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Umur (Tahun)</label>
                            <input
                              type="number"
                              value={editingMeccReport.umur || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, umur: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tarikh</label>
                            <input
                              type="date"
                              value={editingMeccReport.tarikh || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, tarikh: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Masa</label>
                            <input
                              type="text"
                              value={editingMeccReport.masa || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, masa: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Aduan / Masalah Utama</label>
                          <textarea
                            rows={2}
                            value={editingMeccReport.aduan || editingMeccReport.aduanUtama || ''}
                            onChange={e => setEditingMeccReport({...editingMeccReport, aduan: e.target.value, aduanUtama: e.target.value})}
                            className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Keputusan Tanda Vital</label>
                          <input
                            type="text"
                            value={editingMeccReport.tanda_vital || editingMeccReport.tandaVital || ''}
                            onChange={e => setEditingMeccReport({...editingMeccReport, tanda_vital: e.target.value, tandaVital: e.target.value})}
                            className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Rawatan yang Diberikan</label>
                          <textarea
                            rows={2}
                            value={editingMeccReport.rawatan || ''}
                            onChange={e => setEditingMeccReport({...editingMeccReport, rawatan: e.target.value})}
                            className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Status Kes</label>
                            <select
                              value={editingMeccReport.status_kes || editingMeccReport.statusKes || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, status_kes: e.target.value, statusKes: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            >
                              <option value="Selesai (Discaj)">Selesai (Discaj)</option>
                              <option value="Rujukan Ke Hospital">Rujukan Ke Hospital</option>
                              <option value="Dalam Rawatan">Dalam Rawatan</option>
                              <option value="Lain-lain">Lain-lain</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Kawasan (Checkpoint)</label>
                            <input
                              type="text"
                              value={editingMeccReport.kawasan || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, kawasan: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nama Program</label>
                            <input
                              type="text"
                              value={editingMeccReport.nama_program || editingMeccReport.namaProgram || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, nama_program: e.target.value, namaProgram: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Petugas (Responder Utama)</label>
                            <input
                              type="text"
                              value={editingMeccReport.nama_responder || editingMeccReport.namaResponder || ''}
                              onChange={e => setEditingMeccReport({...editingMeccReport, nama_responder: e.target.value, namaResponder: e.target.value})}
                              className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        </div>

                      </div>

                      <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setEditingMeccReport(null)}
                          className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-500 font-bold rounded-xl text-xs border border-gray-200 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingMeccEdit}
                          className="px-5 py-2.5 bg-blue-650 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer border-none"
                        >
                          {isSavingMeccEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Simpan Laporan
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. Admin Edit Attendance Log Modal */}
            <AnimatePresence>
              {editingMeccLog && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                  onClick={() => setEditingMeccLog(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-left"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-800 rounded-xl">
                          <Edit2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold font-sans">Kemaskini Log Petugas</h3>
                          <p className="text-[10px] text-blue-200/70">Kemas kini waktu bertugas & kawasan</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingMeccLog(null)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors font-bold text-white cursor-pointer bg-transparent border-none text-base"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleUpdateAttendanceSubmit}>
                      <div className="p-6 space-y-4">
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Nama Petugas</label>
                          <input
                            type="text"
                            value={editingMeccLog.nama || ''}
                            onChange={e => setEditingMeccLog({...editingMeccLog, nama: e.target.value})}
                            className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Sesi Program</label>
                          <input
                            type="text"
                            value={editingMeccLog.program_nama || ''}
                            onChange={e => setEditingMeccLog({...editingMeccLog, program_nama: e.target.value})}
                            className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Kawasan / Pos</label>
                          <input
                            type="text"
                            value={editingMeccLog.kawasan || ''}
                            onChange={e => setEditingMeccLog({...editingMeccLog, kawasan: e.target.value})}
                            className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Masa Log Masuk</label>
                          <input
                            type="text"
                            value={editingMeccLog.login_time || ''}
                            onChange={e => setEditingMeccLog({...editingMeccLog, login_time: e.target.value})}
                            className="w-full bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-sans font-medium focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Masa Log Keluar</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingMeccLog.logout_time || ''}
                              onChange={e => setEditingMeccLog({...editingMeccLog, logout_time: e.target.value})}
                              placeholder="Masukkan masa keluar (HH:MM) atau kosongkan"
                              className="flex-1 bg-white p-2.5 border border-gray-200 rounded-xl text-xs font-sans font-medium focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const currentT = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                                setEditingMeccLog({...editingMeccLog, logout_time: currentT});
                              }}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-250 text-gray-750 rounded-xl text-[10px] font-bold cursor-pointer border-none"
                            >
                              Sekarang
                            </button>
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1 block leading-none text-left">Kosongkan jika masih dalam tugas</span>
                        </div>

                      </div>

                      <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setEditingMeccLog(null)}
                          className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-500 font-bold rounded-xl text-xs border border-gray-200 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingMeccEdit}
                          className="px-5 py-2.5 bg-blue-650 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer border-none"
                        >
                          {isSavingMeccEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Simpan Log
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 4. Delete Confirmation Modal */}
            <AnimatePresence>
              {meccDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  onClick={() => setMeccDeleteConfirm(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 15 }}
                    className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full text-center border border-gray-100"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
                      <Trash2 className="text-red-650 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Sahkan Pemadaman</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Adakah anda benar-benar mahu memadam {meccDeleteConfirm.type === 'report' ? 'laporan kes pesakit' : 'log kehadiran petugas'} ini?
                    </p>
                    <div className="mt-4 p-3 bg-red-50 text-red-750 rounded-xl text-[10px] uppercase font-bold tracking-tight">
                      * Tindakan ini memadam rekod di Supabase & Firebase secara langsung!
                    </div>

                    <div className="mt-6 flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={meccDeleteConfirm.type === 'report' ? handleDeleteReportConfirm : handleDeleteAttendanceConfirm}
                        className="w-full py-3.5 bg-red-650 hover:bg-red-750 text-white rounded-2xl font-bold text-xs transition-colors cursor-pointer border-none shadow-md"
                      >
                        Sahkan Padam Kekal
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeccDeleteConfirm(null)}
                        className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold text-xs transition-colors cursor-pointer border-none"
                      >
                        Batal
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {meccBulkDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  onClick={() => setMeccBulkDeleteConfirm(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 15 }}
                    className="bg-white rounded-[32px] shadow-2xl p-8 max-w-sm w-full text-center border border-gray-100"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6 border-4 border-red-50">
                      <AlertTriangle className="text-red-600 w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Padam Pukal</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Anda akan memadam <b className="text-red-600">{meccBulkDeleteConfirm.ids.length}</b> rekod {meccBulkDeleteConfirm.type === 'report' ? 'kes' : 'kehadiran'} secara kekal.
                    </p>
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-[11px] font-bold">
                      Tindakan ini tidak boleh dibatalkan dan akan membuang data dari pangkalan data utama.
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={handleBulkDeleteConfirm}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm transition-all cursor-pointer border-none shadow-lg shadow-red-200 active:scale-95"
                      >
                        Sahkan Padam Pukal
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeccBulkDeleteConfirm(null)}
                        className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold text-sm transition-all cursor-pointer border-none"
                      >
                        Batal
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </motion.div>
      );
    })()}
  </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gray-900 p-8 text-white shrink-0">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-6 h-6 text-white/50" />
                  </button>
                </div>
                <h3 className="text-2xl font-bold font-sans">Tetapan Sistem</h3>
                <p className="text-gray-400 text-sm mt-1">Konfigurasi database & Telegram Bot</p>
              </div>

              <div className="p-8 space-y-4 overflow-y-auto flex-1">
                {/* 1. Supabase Connection folding accordion */}
                <div className="border-b border-gray-100 pb-4">
                  <button
                    type="button"
                    onClick={() => setIsSupabaseOpen(!isSupabaseOpen)}
                    className="flex items-center justify-between w-full text-left py-2 hover:bg-gray-50/50 rounded-lg px-1 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 font-sans">Ujian Sambungan Pangkalan Data Utama</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Semak talian pangkalan data utama</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isSupabaseOpen ? 'rotate-90 text-gray-900' : ''}`} />
                  </button>

                  {isSupabaseOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 space-y-4"
                    >
                      <div className="space-y-3">
                        {dbTestResult.length === 0 ? (
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center py-6">
                            <Cloud className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Klik butang di bawah untuk menguji sambungan pangkalan data</p>
                          </div>
                        ) : (
                          dbTestResult.map((result, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl border ${
                              result.status === 'success' ? 'bg-green-50 border-green-100' : 
                              result.status === 'error' ? 'bg-red-50 border-red-100' : 
                              'bg-blue-50 border-blue-100 animate-pulse'
                            } transition-all`}>
                              <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-lg ${
                                  result.status === 'success' ? 'bg-green-200 text-green-700' : 
                                  result.status === 'error' ? 'bg-red-200 text-red-700' : 
                                  'bg-blue-200 text-blue-700'
                                }`}>
                                  {result.status === 'success' ? <Check className="w-4 h-4" /> : 
                                   result.status === 'error' ? <Trash2 className="w-4 h-4" /> : 
                                   <RefreshCw className="w-4 h-4 animate-spin" />}
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-gray-900 uppercase">Jadual: {result.table}</p>
                                  <p className={`text-xs mt-1 ${
                                    result.status === 'success' ? 'text-green-700 font-medium' : 
                                    result.status === 'error' ? 'text-red-700' : 
                                    'text-blue-700'
                                  }`}>{result.message}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={testDatabase}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-95"
                        >
                          <Activity className="w-4 h-4" />
                          Uji Sambungan Pangkalan Data
                        </button>
                        <p className="text-[9px] text-gray-400 text-center mt-2 uppercase tracking-tighter">
                          Memerlukan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 2. Firebase Connection folding accordion */}
                <div className="border-b border-gray-100 pb-4">
                  <button
                    type="button"
                    onClick={() => setIsFirebaseOpen(!isFirebaseOpen)}
                    className="flex items-center justify-between w-full text-left py-2 hover:bg-gray-50/50 rounded-lg px-1 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 font-sans">Ujian Sambungan Pangkalan Data Simpanan</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Uji talian pangkalan data & jadual</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isFirebaseOpen ? 'rotate-90 text-gray-900' : ''}`} />
                  </button>

                  {isFirebaseOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 space-y-4"
                    >
                      {/* Google Authentication Section */}
                      <div className="border-b border-gray-100 pb-4">
                        {firebaseAuthLoading ? (
                          <div className="flex items-center justify-center p-3">
                            <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />
                            <span className="text-[11px] text-gray-400 ml-2">Menyemak status log masuk...</span>
                          </div>
                        ) : firebaseUser ? (
                          <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {firebaseUser.photoURL ? (
                                <img src={firebaseUser.photoURL} alt={firebaseUser.displayName || 'User'} className="w-9 h-9 rounded-full border border-orange-200" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                                  {firebaseUser.displayName?.charAt(0) || firebaseUser.email?.charAt(0) || 'U'}
                                </div>
                              )}
                              <div className="text-left">
                                <p className="text-xs font-bold text-gray-900 leading-none">{firebaseUser.displayName || 'Google User'}</p>
                                <p className="text-[10px] text-gray-450 mt-0.5 leading-none">{firebaseUser.email}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full uppercase leading-none">
                                  Terbuka & Sah (Auth)
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={logoutFirebase}
                              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-red-600 rounded-xl text-[10px] font-bold transition-all active:scale-95 shrink-0"
                            >
                              Log Keluar
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-2xl text-center">
                            <p className="text-xs text-amber-800 font-medium mb-3">
                              ⚠️ Keizinan pangkalan data (Security Rules) kini memerlukan anda membuktikan identiti di bawah terlebih dahulu.
                            </p>
                            <button
                              type="button"
                              onClick={loginWithGoogleFirebase}
                              className="w-full px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-gray-200 shadow-sm active:scale-95 transition-all"
                            >
                              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.81-2.6-2.52-4.53-5.32-4.53z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                              </svg>
                              Log Masuk Dengan Google
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {firebaseTestStatus === 'idle' ? (
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center py-6">
                            <Cloud className="w-8 h-8 text-orange-250 mx-auto mb-2 text-orange-300" />
                            <p className="text-xs text-gray-500">Klik butang di bawah untuk menguji sambungan Firebase Firestore</p>
                          </div>
                        ) : (
                          <div className={`p-4 rounded-2xl border ${
                            firebaseTestStatus === 'success' ? 'bg-green-50 border-green-100' : 
                            firebaseTestStatus === 'error' ? 'bg-red-50 border-red-100' : 
                            'bg-orange-50 border-orange-100 animate-pulse'
                          } transition-all`}>
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${
                                firebaseTestStatus === 'success' ? 'bg-green-200 text-green-700' : 
                                firebaseTestStatus === 'error' ? 'bg-red-200 text-red-700' : 
                                'bg-orange-200 text-orange-700'
                              }`}>
                                {firebaseTestStatus === 'success' ? <Check className="w-4 h-4" /> : 
                                 firebaseTestStatus === 'error' ? <Trash2 className="w-4 h-4" /> : 
                                 <RefreshCw className="w-4 h-4 animate-spin" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-gray-900 uppercase">Saluran: Pangkalan Data</p>
                                <p className={`text-xs mt-1 ${
                                  firebaseTestStatus === 'success' ? 'text-green-700 font-medium' : 
                                  firebaseTestStatus === 'error' ? 'text-red-700' : 
                                  'text-orange-700'
                                }`}>{firebaseTestMessage}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Firestore Fetched Reports Table */}
                        {firebaseFetchedReports.length > 0 && (
                          <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 p-2 border-b border-gray-100">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jadual reports (Pangkalan Data)</span>
                            </div>
                            <div className="overflow-x-auto max-h-48">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold">
                                    <th className="p-2 whitespace-nowrap">Program</th>
                                    <th className="p-2 whitespace-nowrap">Pesakit</th>
                                    <th className="p-2 whitespace-nowrap">Aduan</th>
                                    <th className="p-2 whitespace-nowrap">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 text-gray-700">
                                  {firebaseFetchedReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                                      <td className="p-2 font-medium truncate max-w-[100px]" title={report.namaProgram}>{report.namaProgram || '-'}</td>
                                      <td className="p-2 truncate max-w-[80px]" title={report.namaPesakit}>{report.namaPesakit || '-'}</td>
                                      <td className="p-2 truncate max-w-[100px]" title={report.aduan}>{report.aduan || '-'}</td>
                                      <td className="p-2 whitespace-nowrap text-gray-500">{report.statusKes || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={testFirebaseConnection}
                          className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-3 active:scale-95 cursor-pointer"
                        >
                          <Cloud className="w-4 h-4" />
                          Uji Sambungan & Papar Jadual
                        </button>
                        <p className="text-[9px] text-gray-400 text-center mt-2 uppercase tracking-tighter">
                          Membaca data langsung dari firestoreDatabaseId
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 3. Telegram Bot Integration folding accordion */}
                <div className="pb-2">
                  <button
                    type="button"
                    onClick={() => setIsTelegramOpen(!isTelegramOpen)}
                    className="flex items-center justify-between w-full text-left py-2 hover:bg-gray-50/50 rounded-lg px-1 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 font-sans">Sambungan Telegram Bot</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Uji sambungan bot & suis penghantaran</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isTelegramOpen ? 'rotate-90 text-gray-900' : ''}`} />
                  </button>

                  {isTelegramOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 space-y-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h5 className="text-xs font-bold text-gray-700">Penghantaran Telegram</h5>
                          <p className="text-[10px] text-gray-400 mt-0.5">Aktifkan atau matikan penghantaran ke Telegram</p>
                        </div>
                        <button
                          type="button"
                          onClick={toggleTelegram}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isTelegramEnabled ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isTelegramEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Switch Indicator */}
                        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                          isTelegramEnabled ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-100'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${
                              isTelegramEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                            }`}>
                              <Bot className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800">
                                {isTelegramEnabled ? 'Status: TELEGRAM AKTIF' : 'Status: TELEGRAM DIMATIKAN'}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {isTelegramEnabled 
                                  ? 'Mesej akan dihantar secara automatik.' 
                                  : 'Mesej disekat (jika sekadar latihan/ujian).'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Test result status message */}
                        {telegramTestStatus !== 'idle' && (
                          <div className={`p-4 rounded-2xl border ${
                            telegramTestStatus === 'success' ? 'bg-green-50 border-green-100' : 
                            telegramTestStatus === 'error' ? 'bg-red-50 border-red-100' : 
                            'bg-blue-50 border-blue-100 animate-pulse'
                          } transition-all`}>
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-lg shrink-0 ${
                                telegramTestStatus === 'success' ? 'bg-green-200 text-green-700' : 
                                telegramTestStatus === 'error' ? 'bg-red-200 text-red-700' : 
                                'bg-blue-200 text-blue-700'
                              }`}>
                                {telegramTestStatus === 'success' ? <Check className="w-3.5 h-3.5" /> : 
                                 telegramTestStatus === 'error' ? <Trash2 className="w-3.5 h-3.5" /> : 
                                 <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-gray-900 uppercase">Ujian Sambungan Telegram</p>
                                <p className={`text-xs mt-0.5 ${
                                  telegramTestStatus === 'success' ? 'text-green-700 font-medium' : 
                                  telegramTestStatus === 'error' ? 'text-red-700' : 
                                  'text-blue-700'
                                }`}>{telegramTestMessage}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={testTelegramConnection}
                          disabled={telegramTestStatus === 'testing'}
                          className="w-full py-4 bg-gray-950 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                          <Send className="w-4 h-4" />
                          Hantar Mesej Ujian ke Telegram
                        </button>
                        <p className="text-[9px] text-gray-400 text-center mt-2 uppercase tracking-tighter">
                          Menggunakan Konfigurasi Rahsia di Server (TELEGRAM_BOT_TOKEN)
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 4. System Mode Selection folding accordion */}
                <div className="border-b border-gray-100 pb-4">
                  <div className="flex items-center justify-between py-2 px-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                        <LayoutGrid className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 font-sans">Pilihan Mod Sistem</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Aktifkan semula skrin pilihan Mod</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('resq_show_mode_selection', 'true');
                        setShowModeSelection(true);
                        showNotification('Mod Dikemaskini', 'Skrin pilihan mod akan dipaparkan semula.', 'success');
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-sm shadow-purple-200 cursor-pointer"
                    >
                      AKTIFKAN
                    </button>
                  </div>
                </div>

                {/* 5. MECC Admin Panel Access Section */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="bg-red-50/50 rounded-2xl p-5 border border-red-100/80">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-red-100 text-red-700 rounded-xl">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 font-sans">Panel Admin MECC</h4>
                        <p className="text-[10px] text-gray-500">Akses kawal selia log petugas & rekod kes</p>
                      </div>
                    </div>

                    {firebaseUser ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-red-55">
                          {firebaseUser.photoURL ? (
                            <img src={firebaseUser.photoURL} alt="Admin" className="w-8 h-8 rounded-full border border-red-100" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                              {firebaseUser.displayName?.charAt(0) || 'A'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-bold text-gray-950 truncate">{firebaseUser.displayName}</p>
                            <p className="text-[10px] text-gray-500 truncate">{firebaseUser.email}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-bold rounded-full uppercase shrink-0">
                            ADMIN UTAMA
                          </span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettings(false);
                            setView('mecc');
                          }}
                          className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-auto cursor-pointer border-none"
                        >
                          <Shield className="w-4 h-4 text-white" />
                          Masuk Dashboard MECC
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-gray-500 leading-relaxed text-left">
                          Akses ke Dashboard MECC disekat untuk kegunaan admin yang sah sahaja. Sila log masuk melalui Google:
                        </p>
                        <button
                          type="button"
                          onClick={loginWithGoogleFirebase}
                          className="w-full py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-gray-200 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.81-2.6-2.52-4.53-5.32-4.53z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                          Log Masuk Dengan Google
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 text-center shrink-0">
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Tutup Tetapan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">Perincian Kes</h3>
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px] font-mono">
                    {selectedReport.case_number || 'N/A'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 rotate-90" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase">Nama Pesakit</p>
                    <p className="font-bold text-gray-900">{selectedReport.nama_pesakit}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                    <p className="font-bold text-gray-900">{selectedReport.status_kes}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Penilaian Klinikal</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Tanda Vital:</span>
                        <span className="font-bold text-gray-900">{selectedReport.tanda_vital}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Aduan:</span>
                        <span className="font-bold text-gray-900 text-right">{selectedReport.aduan}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Rawatan & Tindakan</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedReport.rawatan}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Maklumat Program</p>
                    <p className="text-sm font-bold text-gray-900">{selectedReport.nama_program}</p>
                    <p className="text-xs text-gray-500">{selectedReport.lokasi} | {selectedReport.tarikh}</p>
                  </div>

                  {selectedReport.images && selectedReport.images.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Gambar Lampiran ({selectedReport.images.length})</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedReport.images.map((img: string, i: number) => (
                          <div 
                            key={i} 
                            className="aspect-video rounded-lg overflow-hidden border border-gray-200 cursor-zoom-in active:scale-95 transition-transform"
                            onClick={() => {
                              setGalleryImages(selectedReport.images);
                              setGalleryIndex(i);
                            }}
                          >
                            <img src={img} alt={`Report ${i}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all font-mono"
                >
                  CLOSE DETAILS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showVitalReference && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVitalReference(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">Rujukan Tanda Vital</h3>
                </div>
                <button 
                  onClick={() => setShowVitalReference(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori Umur</th>
                        <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">BP (mmHg)</th>
                        <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">PR (bpm)</th>
                        <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">SpO2 (%)</th>
                        <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">DXT (mmol/L)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {VITAL_SIGNS_REFERENCE.map((ref, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-2 text-sm font-bold text-gray-900 whitespace-nowrap">{ref.age}</td>
                          <td className="py-4 px-2 text-sm text-gray-600 font-mono whitespace-nowrap">{ref.bp}</td>
                          <td className="py-4 px-2 text-sm text-gray-600 font-mono whitespace-nowrap">{ref.pr}</td>
                          <td className="py-4 px-2 text-sm text-gray-600 font-mono whitespace-nowrap">{ref.spo2}</td>
                          <td className="py-4 px-2 text-sm text-gray-600 font-mono whitespace-nowrap">{ref.dxt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] text-blue-700 leading-relaxed italic">
                    * Nota: Nilai ini adalah rujukan umum. Sila rujuk protokol klinikal semasa atau dapatkan nasihat perubatan jika terdapat keraguan.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setShowVitalReference(false)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
                >
                  Tutup Rujukan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Gallery / Lightbox */}
      <AnimatePresence>
        {galleryIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center"
            onClick={() => setGalleryIndex(null)}
          >
            {/* Gallery Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center text-white z-10">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                  {galleryIndex + 1} / {galleryImages.length}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs text-white/60 font-medium">Gambar Lampiran Laporan</span>
                  {(selectedReport || selectedMeccReport) && (
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                      No. Kes: {(selectedReport?.id || selectedMeccReport?.id).slice(-6).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setGalleryIndex(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors group active:scale-90"
              >
                <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Main Image Stage */}
            <div 
              className="relative w-full max-w-5xl h-[60vh] sm:h-[70vh] flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={galleryIndex}
                  src={galleryImages[galleryIndex]}
                  initial={{ opacity: 0, scale: 0.95, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: -20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-xl border border-white/10"
                />
              </AnimatePresence>

              {/* Navigation Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryIndex(prev => (prev! === 0 ? galleryImages.length - 1 : prev! - 1));
                    }}
                    className="absolute left-2 sm:left-4 p-3 bg-white/5 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm border border-white/10 active:scale-90"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryIndex(prev => (prev! === galleryImages.length - 1 ? 0 : prev! + 1));
                    }}
                    className="absolute right-2 sm:right-4 p-3 bg-white/5 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm border border-white/10 active:scale-90"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Strip */}
            {galleryImages.length > 1 && (
              <div 
                className="absolute bottom-10 left-0 right-0 flex justify-center gap-3 px-4 overflow-x-auto pb-4 custom-scrollbar"
                onClick={e => e.stopPropagation()}
              >
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      galleryIndex === i ? 'border-blue-500 scale-110 shadow-lg' : 'border-white/20 opacity-40 hover:opacity-100'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`Thumb ${i}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Instructions */}
            <div className="absolute bottom-4 text-white/30 text-[10px] uppercase tracking-widest font-bold">
              Klik di luar untuk tutup
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
                    <li>Gunakan <b>Auto Fill</b> untuk pengujian borang dengan data simulasi secara automatik.</li>
                    <li>Sesi petugas dikekalkan selagi anda tidak klik <b>Log Keluar</b>, memudahkan anda lapor berbilang kes.</li>
                    <li>Laporan yang telah dihantar akan muncul secara real-time di saluran Telegram MECC.</li>
                    <li>Pastikan anda mempunyai sambungan internet yang stabil semasa menghantar laporan perubatan.</li>
                    <li>Gunakan <b>Rujukan Tanda Vital</b> jika anda ragu-ragu dengan nilai parameter pesakit mengikut umur.</li>
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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
            >
              <div className="bg-gray-900 p-8 text-white text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-12 shadow-lg">
                  <Send className="w-8 h-8 -rotate-12" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Sahkan Laporan?</h3>
                <p className="text-gray-400 text-sm">Pastikan semua maklumat perubatan dan gambar adalah tepat sebelum dihantar ke MECC.</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <User className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pesakit</p>
                      <p className="font-bold text-gray-900">{formData.namaPesakit || 'Tiada Nama'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gambar Lampiran</p>
                      <p className="font-bold text-gray-900">{images.length} Keping Gambar</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={confirmSubmit}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        YA, HANTAR SEKARANG
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsConfirming(false)}
                    className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    KEMBALI KE BORANG
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Auto-save Status */}
      {view === 'dashboard' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={autoSaveStatus}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md transition-colors duration-300 ${
                autoSaveStatus === 'saving' ? 'bg-blue-50/90 border-blue-100 text-blue-600' :
                autoSaveStatus === 'saved' ? 'bg-green-50/90 border-green-100 text-green-600' :
                'bg-white/80 border-gray-100 text-gray-500'
              }`}
            >
              {autoSaveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Menyimpan...</span>
                </>
              ) : autoSaveStatus === 'saved' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Tersimpan</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Auto-save Aktif</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          
          {lastSaved && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] text-gray-400 font-medium bg-white/50 px-2 py-0.5 rounded-md border border-gray-50"
            >
              Simpanan terakhir: {lastSaved}
            </motion.span>
          )}
        </motion.div>
      )}
      {isProgramReportModalOpen && (
        <ProgramReportPDFModal 
          isOpen={isProgramReportModalOpen}
          onClose={() => setIsProgramReportModalOpen(false)}
          programInfo={selectedLaporanProgram ? { 
            nama: selectedLaporanProgram, 
            tarikh: reports.find(r => (r.nama_program || r.namaProgram) === selectedLaporanProgram)?.tarikh || '', 
            masa: reports.find(r => (r.nama_program || r.namaProgram) === selectedLaporanProgram)?.masa || '', 
            lokasi: reports.find(r => (r.nama_program || r.namaProgram) === selectedLaporanProgram)?.lokasi || '' 
          } : programInfo}
          reports={selectedLaporanProgram ? reports.filter(r => (r.nama_program || r.namaProgram || '').toLowerCase().trim() === selectedLaporanProgram.toLowerCase().trim()) : reports}
          attendanceLogs={selectedLaporanProgram ? attendanceLogs.filter(log => (log.program_nama || log.programNama || '').toLowerCase().trim() === selectedLaporanProgram.toLowerCase().trim()) : attendanceRecords}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}

const ProgramReportPDFModal = ({ 
  isOpen, 
  onClose, 
  programInfo, 
  reports, 
  attendanceLogs,
  showNotification
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  programInfo: any; 
  reports: any[]; 
  attendanceLogs: any[];
  showNotification: (t: string, m: string, s: 'success' | 'info' | 'warning') => void;
}) => {
  const [localAttendance, setLocalAttendance] = useState(attendanceLogs);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    setLocalAttendance(attendanceLogs);
  }, [attendanceLogs]);

  const handleAttendanceChange = (id: string, field: string, value: string) => {
    setLocalAttendance(prev => prev.map(log => 
      log.id === id ? { ...log, [field]: value } : log
    ));
  };

  const addManualAttendance = () => {
    const newLog = {
      id: Date.now().toString(),
      nama: '',
      kawasan: '',
      loginTime: '',
      logoutTime: '',
      tarikh: new Date().toISOString().split('T')[0]
    };
    setLocalAttendance([newLog, ...localAttendance]);
  };

  const generatePDF = async (autosend = false) => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("LAPORAN PROGRAM MEDIK AMAL", pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Dijana pada: ${new Date().toLocaleString('ms-MY')}`, pageWidth - 20, 10, { align: 'right' });

      autoTable(doc, {
        startY: 30,
        head: [['Maklumat Program', 'Butiran']],
        body: [
          ['Nama Program', programInfo.nama || programInfo.nama_program || '-'],
          ['Tarikh', programInfo.tarikh || '-'],
          ['Masa', programInfo.masa || '-'],
          ['Lokasi', programInfo.lokasi || '-'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
      });

      const stats = reports.reduce((acc, curr) => {
        acc.total++;
        acc[curr.statusKes] = (acc[curr.statusKes] || 0) + 1;
        return acc;
      }, { total: 0 });

      const statsBody = Object.entries(stats).map(([k, v]) => [k, v]);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Statistik Kes', 'Jumlah']],
        body: statsBody,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Nama Petugas', 'Kawasan/Checkpoint', 'Log Masuk', 'Log Keluar', 'Tarikh']],
        body: localAttendance.map(log => [
          log.nama || '-',
          log.kawasan || '-',
          log.loginTime || log.login_time || '-',
          log.logoutTime || log.logout_time || '-',
          log.tarikh || '-'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.text("LAMPIRAN: RINGKASAN KES", 14, 20);
      
      let currentY = 30;
      const sortedReports = [...reports].sort((a, b) => {
        // Sort by case number if available
        const aNum = parseInt(a.case_number) || 0;
        const bNum = parseInt(b.case_number) || 0;
        if (aNum !== bNum) return aNum - bNum;
        
        // Then by date
        const aDate = new Date(a.tarikh || 0).getTime();
        const bDate = new Date(b.tarikh || 0).getTime();
        if (aDate !== bDate) return aDate - bDate;
        
        // Then by time
        return (a.masa || '').localeCompare(b.masa || '');
      });

      for (const report of sortedReports) {
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Kes #${report.case_number || '-'}: ${report.namaPesakit || 'Pesakit Am'}`, 14, currentY);
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const status = report.status_kes || report.statusKes || '-';
        doc.text(`Tarikh: ${report.tarikh || '-'} | Masa: ${report.masa || '-'} | Status: ${status}`, 14, currentY);
        currentY += 5;
        doc.text(`Aduan: ${report.aduan || '-'}`, 14, currentY);
        currentY += 5;
        doc.text(`Rawatan: ${report.rawatan || '-'}`, 14, currentY);
        currentY += 10;
        
        if (report.images && report.images.length > 0) {
          try {
            const img = report.images[0];
            if (img.startsWith('data:image')) {
              // Calculate centered position for a larger image
              const imgWidth = pageWidth - 28; // Full width with margins
              const imgHeight = imgWidth * 0.75; // 4:3 aspect ratio
              
              if (currentY + imgHeight > 270) {
                doc.addPage();
                currentY = 20;
              }
              
              doc.addImage(img, 'JPEG', 14, currentY, imgWidth, imgHeight);
              currentY += imgHeight + 15;
            }
          } catch (e) {
            console.error("Failed to add image to PDF", e);
          }
        } else {
          currentY += 5;
        }
      }

      const finalY = currentY;
      const signY = finalY > 240 ? doc.addPage() && 40 : finalY + 30;
      
      doc.setFontSize(10);
      doc.text("Laporan disediakan oleh:", 14, signY);
      doc.text("__________________________", 14, signY + 15);
      doc.text("MEDIK AMAL", 14, signY + 20);
      
      doc.text(`Tarikh Laporan: ${new Date().toLocaleDateString('ms-MY')}`, pageWidth - 60, signY + 20);
      
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("--- Laporan dijana secara automatik dengan Sistem ResQ MECC ---", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);

      if (autosend) {
        await sendToTelegram(pdfBase64);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      showNotification('Ralat', 'Gagal menjana PDF.', 'warning');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendToTelegram = async (base64: string) => {
    try {
      const response = await fetch('/api/send-pdf-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64,
          filename: `Laporan_${programInfo.nama || programInfo.nama_program || 'Program'}_${Date.now()}.pdf`,
          caption: `📄 *LAPORAN PROGRAM DISAHKAN* 📄\n\nProgram: ${programInfo.nama || programInfo.nama_program}\nTarikh: ${programInfo.tarikh}\n\nLaporan ini telah dijana dan disahkan secara digital.`
        })
      });
      const res = await response.json();
      if (res.success) {
        showNotification('Berjaya', 'Laporan PDF telah dihantar ke Telegram.', 'success');
      } else {
        showNotification('Gagal', 'Gagal menghantar PDF ke Telegram.', 'warning');
      }
    } catch (err) {
      showNotification('Ralat', 'Ralat semasa menghantar ke Telegram.', 'warning');
    }
  };

  const shareViaWhatsApp = () => {
    const pName = programInfo.nama || programInfo.nama_program || 'Program';
    const text = `Laporan Program: ${pName}\nTarikh: ${programInfo.tarikh}\nStatus: Selesai. Laporan PDF tersedia dalam sistem.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-600 text-white">
          <div className="flex items-center gap-3">
            <FileBarChart className="w-6 h-6" />
            <h2 className="text-xl font-bold">Jana Laporan Program</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Maklumat Program
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="font-semibold">Nama:</span> {programInfo.nama || programInfo.nama_program || '-'}</p>
                <p><span className="font-semibold">Tarikh:</span> {programInfo.tarikh || '-'}</p>
                <p><span className="font-semibold">Masa:</span> {programInfo.masa || '-'}</p>
                <p><span className="font-semibold">Lokasi:</span> {programInfo.lokasi || '-'}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Statistik Kes
              </h3>
              <div className="flex gap-4 items-center">
                 <div className="p-3 bg-blue-100 text-blue-700 rounded-xl text-center flex-1">
                    <p className="text-[10px] uppercase font-bold">Jumlah</p>
                    <p className="text-2xl font-black">{reports.length}</p>
                 </div>
                 <div className="p-3 bg-green-100 text-green-700 rounded-xl text-center flex-1">
                    <p className="text-[10px] uppercase font-bold">Discaj</p>
                    <p className="text-2xl font-black">{reports.filter(r => r.statusKes === 'Discaj').length}</p>
                 </div>
                 <div className="p-3 bg-red-100 text-red-700 rounded-xl text-center flex-1">
                    <p className="text-[10px] uppercase font-bold">Dirujuk</p>
                    <p className="text-2xl font-black">{reports.filter(r => r.statusKes === 'Dirujuk').length}</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                <Users className="w-4 h-4" /> Kehadiran Petugas
              </h3>
              <button 
                onClick={addManualAttendance}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Tambah Manual
              </button>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Checkpoint</th>
                    <th className="px-4 py-3">Masuk</th>
                    <th className="px-4 py-3">Keluar</th>
                    <th className="px-4 py-3">Tarikh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {localAttendance.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2">
                        <input 
                          value={log.nama} 
                          onChange={(e) => handleAttendanceChange(log.id, 'nama', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none py-1 text-gray-700"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          value={log.kawasan} 
                          onChange={(e) => handleAttendanceChange(log.id, 'kawasan', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none py-1 text-gray-700"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          value={log.loginTime || log.login_time || ''} 
                          onChange={(e) => handleAttendanceChange(log.id, 'loginTime', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none py-1 text-gray-700"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          value={log.logoutTime || log.logout_time || ''} 
                          onChange={(e) => handleAttendanceChange(log.id, 'logoutTime', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none py-1 text-gray-700"
                        />
                      </td>
                      <td className="px-4 py-2">
                         <input 
                          value={log.tarikh} 
                          onChange={(e) => handleAttendanceChange(log.id, 'tarikh', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none py-1 text-gray-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-6 text-white space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-bold">Sedia untuk Jana PDF?</h3>
                <p className="text-gray-400 text-sm">Semua maklumat di atas akan dimasukkan ke dalam dokumen rasmi.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => generatePDF()}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-white text-gray-900 rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center gap-2"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  Preview PDF
                </button>
                <button 
                  onClick={() => generatePDF(true)}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  <FileCheck className="w-5 h-5" />
                  Sahkan & Hantar
                </button>
              </div>
            </div>

            {pdfPreviewUrl && (
              <div className="space-y-4">
                <div className="aspect-[4/3] bg-white rounded-2xl overflow-hidden border-4 border-gray-800">
                  <iframe src={pdfPreviewUrl} className="w-full h-full" title="PDF Preview" />
                </div>
                <div className="flex justify-center gap-6">
                  <button onClick={shareViaWhatsApp} className="flex items-center gap-2 text-green-400 font-bold hover:text-green-300 transition-colors">
                    <Share2 className="w-5 h-5" /> Share WA
                  </button>
                  <button onClick={() => window.open(pdfPreviewUrl, '_blank')} className="flex items-center gap-2 text-blue-400 font-bold hover:text-blue-300 transition-colors">
                    <Eye className="w-5 h-5" /> Buka Tab Baru
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
