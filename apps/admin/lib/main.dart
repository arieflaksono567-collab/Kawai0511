import 'package:flutter/material.dart';

void main() {
  runApp(const KawaiAdminApp());
}

class KawaiAdminApp extends StatelessWidget {
  const KawaiAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KAWAI 0511 — Admin Operations',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFDC2626),
          primary: const Color(0xFFDC2626),
        ),
        useMaterial3: true,
      ),
      home: const AdminDriverQueueScreen(),
    );
  }
}

class AdminDriverQueueScreen extends StatefulWidget {
  const AdminDriverQueueScreen({super.key});

  @override
  State<AdminDriverQueueScreen> createState() => _AdminDriverQueueScreenState();
}

class _AdminDriverQueueScreenState extends State<AdminDriverQueueScreen> {
  // Verification Queue Data
  final List<Map<String, dynamic>> _drivers = [
    {
      'id': 'drv-01',
      'name': 'Ahmad Gazali',
      'phone': '+6281390511200',
      'vehicle': 'Honda Vario 160 (DA 5110 KAW)',
      'kycStatus': 'APPROVED',
      'vehicleStatus': 'APPROVED',
      'overallStatus': 'APPROVED',
    },
    {
      'id': 'drv-02',
      'name': 'Rahmat Hidayatullah',
      'phone': '+6281255443322',
      'vehicle': 'Yamaha NMAX 155 (DA 5110 KAW)',
      'kycStatus': 'UNDER_REVIEW',
      'vehicleStatus': 'PENDING',
      'overallStatus': 'UNDER_REVIEW',
    },
    {
      'id': 'drv-03',
      'name': 'Dedy Kurniawan',
      'phone': '+6281399778855',
      'vehicle': 'Honda Beat Street (DA 4820 BJM)',
      'kycStatus': 'REJECTED',
      'vehicleStatus': 'APPROVED',
      'overallStatus': 'REJECTED',
    },
  ];

  void _approveDriver(String name) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Mitra driver $name berhasil disetujui (APPROVED)'), backgroundColor: Colors.green),
    );
  }

  void _rejectDriver(String name) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Pengajuan $name ditolak'), backgroundColor: Colors.red),
    );
  }

  void _suspendDriver(String name) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Driver $name telah disuspend dari operasional'), backgroundColor: Colors.orange),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Admin — Driver Verification Queue (KYC)'),
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _drivers.length,
        itemBuilder: (context, index) {
          final d = _drivers[index];
          return Card(
            color: const Color(0xFF1E293B),
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      Text(d['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      Chip(
                        label: Text(d['overallStatus'], style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                        backgroundColor: d['overallStatus'] == 'APPROVED'
                            ? Colors.green[800]
                            : d['overallStatus'] == 'UNDER_REVIEW'
                            ? Colors.amber[800]
                            : Colors.red[800],
                      ),
                    ],
                  ),
                  Text(d['phone'], style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                  const SizedBox(height: 6),
                  Text(d['vehicle'], style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      ElevatedButton(
                        onPressed: () => _approveDriver(d['name']),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
                        child: const Text('Setujui (Approve)'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () => _rejectDriver(d['name']),
                        style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                        child: const Text('Tolak (Reject)'),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.block, color: Colors.orange),
                        onPressed: () => _suspendDriver(d['name']),
                        tooltip: 'Suspend Driver',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
