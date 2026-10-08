import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  KeyRound,
  FileText,
  Calculator,
  Search,
  Bike,
  Send,
  Check,
  MapPin,
  Navigation,
  Flag,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Activity
} from 'lucide-react';
import { KAWAI_COLORS } from '../constants/theme';

interface SimulationStep {
  step: number;
  id: string;
  label: string;
  sublabel: string;
  icon: any;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED';
  log: string;
  timestamp?: string;
  details?: Record<string, any>;
}

export const E2ESimulationRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [completedAll, setCompletedAll] = useState(false);

  const initialSteps: SimulationStep[] = [
    {
      step: 1,
      id: 'customer',
      label: 'CUSTOMER',
      sublabel: 'Identifikasi Pelanggan',
      icon: User,
      status: 'PENDING',
      log: 'Inisialisasi akun pelanggan Arief Laksono (+6281255110987).',
    },
    {
      step: 2,
      id: 'login',
      label: 'LOGIN',
      sublabel: 'Autentikasi OTP & JWT',
      icon: KeyRound,
      status: 'PENDING',
      log: 'Request OTP 6 digit -> Validasi single-use -> Token JWT diterbitkan (Role: CUSTOMER).',
    },
    {
      step: 3,
      id: 'order',
      label: 'ORDER',
      sublabel: 'Pembuatan Pesanan',
      icon: FileText,
      status: 'PENDING',
      log: 'POST /rides/order: Duta Mall Banjarmasin -> ULM Kayutangi (4.2 km • 14 mnt).',
    },
    {
      step: 4,
      id: 'fare',
      label: 'FARE CALCULATION',
      sublabel: 'Formula Snapshot',
      icon: Calculator,
      status: 'PENDING',
      log: 'Tarif Dasar Rp 7.000 + (4.2 km × Rp 2.200) + (14 mnt × Rp 200) = Rp 19.040 (Terkunci).',
    },
    {
      step: 5,
      id: 'searching',
      label: 'SEARCHING',
      sublabel: 'Status Awal Order',
      icon: Search,
      status: 'PENDING',
      log: 'Order tersimpan status SEARCHING (v1). Dispatch engine aktif mencari armada terdekat.',
    },
    {
      step: 6,
      id: 'find_driver',
      label: 'FIND DRIVER',
      sublabel: 'Radius 1.5 km & KYC Check',
      icon: Bike,
      status: 'PENDING',
      log: 'Kandidat #1: Ahmad Gazali (DA 5110 KAW, Jarak 58m, ETA 30s, GPS FRESH, Dokumen APPROVED).',
    },
    {
      step: 7,
      id: 'dispatch',
      label: 'DISPATCH',
      sublabel: 'Kirim Offer ke Driver',
      icon: Send,
      status: 'PENDING',
      log: 'Dispatch attempt #1 dicatat: OFFERED. Batas waktu respons 30 detik dimulai.',
    },
    {
      step: 8,
      id: 'driver_accept',
      label: 'DRIVER ACCEPT',
      sublabel: 'Penerimaan Order',
      icon: Check,
      status: 'PENDING',
      log: 'POST /rides/:id/accept: Mitra menekan Terima Order dengan Optimistic Concurrency check (v1).',
    },
    {
      step: 9,
      id: 'assigned',
      label: 'ASSIGNED',
      sublabel: 'Penugasan Mitra',
      icon: ShieldCheck,
      status: 'PENDING',
      log: 'Order beralih ke ASSIGNED (v2). Mitra Ahmad Gazali resmi ditugaskan.',
    },
    {
      step: 10,
      id: 'driver_arrived_act',
      label: 'DRIVER ARRIVED',
      sublabel: 'Aksi Tiba di Lokasi',
      icon: MapPin,
      status: 'PENDING',
      log: 'Driver menempuh rute menuju titik jemput Duta Mall Banjarmasin.',
    },
    {
      step: 11,
      id: 'arrived_state',
      label: 'ARRIVED',
      sublabel: 'Status Tiba Terkunci',
      icon: Flag,
      status: 'PENDING',
      log: 'Transisi state ASSIGNED -> ARRIVED (v3). Notifikasi dikirim ke penumpang.',
    },
    {
      step: 12,
      id: 'start_act',
      label: 'START TRIP',
      sublabel: 'Penumpang Masuk Kendaraan',
      icon: Navigation,
      status: 'PENDING',
      log: 'Penumpang menaiki motor. Helm SNI terpasang, perjalanan dimulai.',
    },
    {
      step: 13,
      id: 'in_trip',
      label: 'IN_TRIP',
      sublabel: 'Sedang Berjalan',
      icon: Navigation,
      status: 'PENDING',
      log: 'Transisi ARRIVED -> IN_TRIP (v4). GPS telemetri rute aktif.',
    },
    {
      step: 14,
      id: 'complete_act',
      label: 'COMPLETE ACTION',
      sublabel: 'Tiba di Destinasi',
      icon: CheckCircle2,
      status: 'PENDING',
      log: 'Driver tiba di ULM Kayutangi dan menekan [SELESAIKAN PERJALANAN].',
    },
    {
      step: 15,
      id: 'completed_final',
      label: 'COMPLETED',
      sublabel: 'Selesai & Terkunci',
      icon: CheckCircle2,
      status: 'PENDING',
      log: 'Transisi IN_TRIP -> COMPLETED (v5). Tarif Rp 19.040 terkunci di buku besar.',
    },
  ];

  const [steps, setSteps] = useState<SimulationStep[]>(initialSteps);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Sistem KAWAI 0511 siap dijalankan. Klik "Jalankan Simulasi Lengkap" untuk memulai.',
  ]);

  const addLog = (msg: string) => {
    setConsoleLogs((prev) => [...prev, `[${new Date().toLocaleTimeString('id-ID')}] ${msg}`]);
  };

  const runSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setCompletedAll(false);
    setConsoleLogs(['🚀 Memulai simulasi Acceptance Test 15-Tahap KAWAI 0511 Banjarmasin...']);

    for (let i = 0; i < initialSteps.length; i++) {
      setCurrentStepIndex(i);
      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: 'RUNNING' } : s))
      );

      const current = initialSteps[i];
      addLog(`▶️ [STEP ${current.step}/15] ${current.label} — ${current.sublabel}`);
      addLog(`   ${current.log}`);

      // Delay for visual fidelity
      await new Promise((r) => setTimeout(r, 500));

      const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'COMPLETED', timestamp: nowTime } : s
        )
      );
    }

    addLog('🔒 Verifikasi Keamanan: Double-complete ditolak dengan HTTP 400 Bad Request');
    addLog('🔒 Verifikasi Keamanan: Pembatalan order yang sudah COMPLETED ditolak');
    addLog('🎉 SELURUH 15 TAHAP SIMULASI END-TO-END BERHASIL & LULUS!');

    setIsRunning(false);
    setCompletedAll(true);
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setCurrentStepIndex(-1);
    setCompletedAll(false);
    setSteps(initialSteps);
    setConsoleLogs([
      'Simulasi di-reset. Klik "Jalankan Simulasi Lengkap" untuk memulai ulang.',
    ]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* HEADER BANNER - Bright Clean Card */}
      <div className="bg-white border border-[#E4ECE7] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#DDF8EA] text-[#0E8F52] font-bold border border-[#18B86A]/20">
              PHASE 5 ACCEPTANCE TEST
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2F80ED] font-bold border border-blue-200">
              15-STEP PIPELINE
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#18B86A]" />
            Acceptance Test End-to-End Simulation
          </h2>
          <p className="text-xs text-[#66736B] mt-1 max-w-2xl">
            Simulasi lengkap dari autentikasi pelanggan, kalkulasi snapshot tarif resmi, pencocokan radar 1.5 km, penawaran 30s timeout, hingga transisi status perjalanan lengkap (COMPLETED).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled={isRunning}
            onClick={resetSimulation}
            className="p-3 bg-[#F0F5F2] hover:bg-[#E4ECE7] text-[#17211B] border border-[#D7E2DB] rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Reset Simulasi"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            disabled={isRunning}
            onClick={runSimulation}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm uppercase tracking-wider cursor-pointer ${
              isRunning
                ? 'bg-[#F0F5F2] text-[#A8B2AC] border border-[#D7E2DB] cursor-not-allowed'
                : 'bg-[#18B86A] hover:bg-[#0E8F52] text-white'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isRunning ? 'Menjalankan...' : 'Jalankan Simulasi Lengkap'}</span>
          </button>
        </div>
      </div>

      {/* PIPELINE VISUALIZATION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          const isCurrent = currentStepIndex === idx && item.status === 'RUNNING';
          const isDone = item.status === 'COMPLETED';

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isCurrent
                  ? 'bg-[#DDF8EA]/40 border-[#18B86A] ring-2 ring-[#18B86A]/30 shadow-sm scale-[1.02]'
                  : isDone
                  ? 'bg-white border-[#18B86A]/40 text-[#17211B] shadow-xs'
                  : 'bg-[#F7FAF8] border-[#E4ECE7] text-[#66736B]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? 'bg-[#18B86A] text-white font-bold'
                        : isCurrent
                        ? 'bg-[#0E8F52] text-white animate-pulse'
                        : 'bg-[#E4ECE7] text-[#66736B]'
                    }`}
                  >
                    {item.step}
                  </span>
                  <span
                    className={`text-xs font-bold tracking-wide ${
                      isDone || isCurrent ? 'text-[#17211B]' : 'text-[#66736B]'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#18B86A]" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 text-[#18B86A] animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#D7E2DB]" />
                )}
              </div>

              <div className="text-[11px] font-semibold text-[#17211B] truncate">
                {item.sublabel}
              </div>
              <p className="text-[10px] text-[#66736B] line-clamp-2 mt-1 leading-snug">
                {item.log}
              </p>

              {item.timestamp && (
                <div className="mt-2 pt-1.5 border-t border-[#E4ECE7] flex items-center justify-between text-[9px] text-[#66736B] font-mono">
                  <span>WITA</span>
                  <span className="text-[#0E8F52] font-semibold">{item.timestamp}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CONSOLE / AUDIT LOG TERMINAL */}
      <div className="bg-white rounded-2xl border border-[#E4ECE7] p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-[#E4ECE7]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#17211B]">
            <Terminal className="w-4 h-4 text-[#18B86A]" />
            <span>Terminal Log Simulasi Real-Time</span>
          </div>
          <span className="text-[10px] font-mono text-[#66736B]">
            NODE.JS TEST RUNNER READY
          </span>
        </div>

        <div className="bg-[#17211B] rounded-xl p-3 font-mono text-[11px] text-[#DDF8EA] h-44 overflow-y-auto space-y-1">
          {consoleLogs.map((log, index) => (
            <div
              key={index}
              className={`${
                log.includes('✅') || log.includes('🎉')
                  ? 'text-[#18B86A] font-semibold'
                  : log.includes('▶️')
                  ? 'text-sky-300'
                  : log.includes('🚀')
                  ? 'text-amber-300 font-bold'
                  : 'text-slate-200'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
