import 'package:flutter/material.dart';
import 'dart:convert';

void main() {
  runApp(const KawaiDriverApp());
}

class KawaiDriverApp extends StatelessWidget {
  const KawaiDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KAWAI 0511 — Mitra Driver',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F172A),
          primary: const Color(0xFF0F172A),
        ),
        useMaterial3: true,
      ),
      home: const DriverHomeScreen(),
    );
  }
}

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  // Driver System State
  String _verificationStatus = 'APPROVED'; // PENDING, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED
  String _operationalStatus = 'OFFLINE';   // OFFLINE, ONLINE, SUSPENDED
  bool _isEligible = true;

  // KYC Checklist State
  final Map<String, String> _kycStatus = {
    'KTP': 'APPROVED',
    'SIM_C': 'APPROVED',
    'STNK': 'APPROVED',
    'SKCK': 'APPROVED',
    'VEHICLE': 'APPROVED',
  };

  void _toggleOnline() {
    if (_verificationStatus != 'APPROVED' || !_isEligible) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Gagal Online: Driver belum memenuhi persyaratan verifikasi KYC.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _operationalStatus = _operationalStatus == 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _operationalStatus == 'ONLINE'
              ? 'Status: ONLINE (Siap menerima order di Phase 5)'
              : 'Status: OFFLINE (Istirahat)',
        ),
        backgroundColor: _operationalStatus == 'ONLINE' ? Colors.green : Colors.grey[800],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('KAWAI 0511', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5)),
        centerTitle: true,
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => _openTripHistoryScreen(),
            tooltip: 'Riwayat Trip Driver (Trip History API)',
          ),
          IconButton(
            icon: const Icon(Icons.account_balance_wallet),
            onPressed: () => _openEarningsScreen(),
            tooltip: 'Buku Besar Pendapatan (Earnings API)',
          ),
          IconButton(
            icon: const Icon(Icons.two_wheeler),
            onPressed: () => _openVehicleScreen(),
            tooltip: 'Kendaraan Saya',
          ),
          IconButton(
            icon: const Icon(Icons.assignment),
            onPressed: () => _openKycScreen(),
            tooltip: 'Dokumen KYC',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Status Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                children: [
                  Text(
                    'Status Operasional: $_operationalStatus',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: _operationalStatus == 'ONLINE' ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _verificationStatus == 'APPROVED' ? const Color(0xFF064E3B) : const Color(0xFF78350F),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Verifikasi: $_verificationStatus',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: _verificationStatus == 'APPROVED' ? const Color(0xFF34D399) : const Color(0xFFFBBF24),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Online button (Only active if APPROVED)
                  if (_verificationStatus == 'APPROVED')
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _toggleOnline,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _operationalStatus == 'ONLINE' ? const Color(0xFFDC2626) : const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: Text(
                          _operationalStatus == 'ONLINE' ? 'SET OFFLINE' : 'GO ONLINE',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 1),
                        ),
                      ),
                    )
                  else
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF450A0A),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Tombol Online terkunci: Anda belum dapat online hingga dokumen disetujui admin.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Requirements Checklist (Section 28)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Daftar Kelengkapan Syarat Operasional', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 14),
                  _buildChecklistItem('KTP (Kartu Tanda Penduduk)', _kycStatus['KTP']!),
                  _buildChecklistItem('SIM C (Surat Izin Mengemudi C)', _kycStatus['SIM_C']!),
                  _buildChecklistItem('STNK (Surat Tanda Nomor Kendaraan)', _kycStatus['STNK']!),
                  _buildChecklistItem('SKCK (Surat Keterangan Catatan Kepolisian)', _kycStatus['SKCK']!),
                  _buildChecklistItem('Kendaraan Aktif (Sepeda Motor)', _kycStatus['VEHICLE']!),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _openKycScreen(),
                      icon: const Icon(Icons.upload_file),
                      label: const Text('Lengkapi / Periksa Dokumen'),
                      style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF38BDF8)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChecklistItem(String title, String status) {
    final bool isOk = status == 'APPROVED';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.between,
        children: [
          Text(title, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13)),
          Row(
            children: [
              Icon(isOk ? Icons.check_circle : Icons.pending, size: 16, color: isOk ? const Color(0xFF10B981) : const Color(0xFFF59E0B)),
              const SizedBox(width: 4),
              Text(status, style: TextStyle(color: isOk ? const Color(0xFF10B981) : const Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  void _openKycScreen() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DriverKycScreen()));
  }

  void _openVehicleScreen() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DriverVehicleScreen()));
  }
}

// 2. KYC SCREEN (Section 31)
class DriverKycScreen extends StatelessWidget {
  const DriverKycScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(title: const Text('KYC / Verifikasi Dokumen'), backgroundColor: const Color(0xFF1E293B), foregroundColor: Colors.white),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildDocCard('KTP (Identitas)', '6371************0001', 'Disetujui (APPROVED)', Colors.green),
          _buildDocCard('SIM C (Surat Izin Mengemudi)', '9004********5678', 'Disetujui (APPROVED)', Colors.green),
          _buildDocCard('STNK (Surat Tanda Nomor Kendaraan)', 'STNK-6371-****-0511', 'Disetujui (APPROVED)', Colors.green),
          _buildDocCard('SKCK (Catatan Kepolisian)', 'SKCK-POLRESTA-BJM-****', 'Disetujui (APPROVED)', Colors.green),
        ],
      ),
    );
  }

  Widget _buildDocCard(String type, String maskedNumber, String status, Color color) {
    return Card(
      color: const Color(0xFF1E293B),
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ListTile(
        title: Text(type, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        subtitle: Text(maskedNumber, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
        trailing: Chip(
          label: Text(status, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
          backgroundColor: color.withOpacity(0.3),
        ),
      ),
    );
  }
}

// 3. VEHICLE SCREEN (Section 32)
class DriverVehicleScreen extends StatelessWidget {
  const DriverVehicleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(title: const Text('Kendaraan Saya'), backgroundColor: const Color(0xFF1E293B), foregroundColor: Colors.white),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Honda Vario 160 (Tahun 2023)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              SizedBox(height: 6),
              Text('Plat: DA 5110 KAW (Warna: Hitam Matte)', style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
              SizedBox(height: 6),
              Text('Jenis: MOTORCYCLE • Status: APPROVED', style: TextStyle(color: Color(0xFF10B981), fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}
