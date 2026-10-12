import 'package:flutter/material.dart';
import 'dart:convert';

void main() {
  runApp(const KawaiPassengerApp());
}

class KawaiPassengerApp extends StatelessWidget {
  const KawaiPassengerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KAWAI 0511 — Penumpang',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFDC2626),
          primary: const Color(0xFFDC2626),
        ),
        useMaterial3: true,
      ),
      home: const PassengerSplashScreen(),
    );
  }
}

// 1. SPLASH SCREEN (Check Stored Session)
class PassengerSplashScreen extends StatefulWidget {
  const PassengerSplashScreen({super.key});

  @override
  State<PassengerSplashScreen> createState() => _PassengerSplashScreenState();
}

class _PassengerSplashScreenState extends State<PassengerSplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkStoredAuth();
  }

  Future<void> _checkStoredAuth() async {
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    // Navigasi ke Login
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const PassengerPhoneLoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                color: const Color(0xFFDC2626),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFDC2626).withOpacity(0.4),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  )
                ],
              ),
              child: const Icon(Icons.two_wheeler, color: Colors.white, size: 48),
            ),
            const SizedBox(height: 20),
            const Text(
              'KAWAI 0511',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Ojek Online Khas Banua Banjarmasin',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
            ),
            const SizedBox(height: 32),
            const CircularProgressIndicator(color: Color(0xFFDC2626)),
          ],
        ),
      ),
    );
  }
}

// 2. PHONE LOGIN SCREEN
class PassengerPhoneLoginScreen extends StatefulWidget {
  const PassengerPhoneLoginScreen({super.key});

  @override
  State<PassengerPhoneLoginScreen> createState() => _PassengerPhoneLoginScreenState();
}

class _PassengerPhoneLoginScreenState extends State<PassengerPhoneLoginScreen> {
  final TextEditingController _phoneController = TextEditingController(text: '081255110987');
  bool _isLoading = false;

  void _requestOtp() async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 600));
    setState(() => _isLoading = false);

    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PassengerOtpScreen(phoneNumber: _phoneController.text),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Masuk / Daftar', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Masukkan Nomor Handphone',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            const Text(
              'Kami akan mengirimkan 6 digit kode OTP verifikasi aman melalui SMS/WhatsApp.',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                prefixIcon: const Padding(
                  padding: EdgeInsets.all(14),
                  child: Text('+62', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
                hintText: '812-xxxx-xxxx',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _requestOtp,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('KIRIM KODE OTP', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 3. OTP VERIFY SCREEN
class PassengerOtpScreen extends StatefulWidget {
  final String phoneNumber;
  const PassengerOtpScreen({super.key, required this.phoneNumber});

  @override
  State<PassengerOtpScreen> createState() => _PassengerOtpScreenState();
}

class _PassengerOtpScreenState extends State<PassengerOtpScreen> {
  final TextEditingController _otpController = TextEditingController(text: '051100');
  bool _isVerifying = false;

  void _verifyOtp() async {
    setState(() => _isVerifying = true);
    await Future.delayed(const Duration(milliseconds: 700));
    setState(() => _isVerifying = false);

    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const PassengerHomeScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(elevation: 0),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Verifikasi Kode OTP',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            Text(
              'Masukkan 6 digit kode yang dikirim ke +62 ${widget.phoneNumber}',
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              maxLength: 6,
              style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                counterText: '',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isVerifying ? null : _verifyOtp,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _isVerifying
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('VERIFIKASI & MASUK', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 4. PASSENGER HOME SCREEN
class PassengerHomeScreen extends StatelessWidget {
  const PassengerHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('KAWAI 0511', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2)),
        centerTitle: true,
        backgroundColor: const Color(0xFFDC2626),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PassengerProfileScreen()));
            },
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 64),
              const SizedBox(height: 16),
              const Text(
                'Selamat Datang, Arief Laksono!',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),
              const Text(
                'Akun Anda terautentikasi dengan peran: CUSTOMER (+6281255110987)',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PassengerTripHistoryScreen()),
                    );
                  },
                  icon: const Icon(Icons.history),
                  label: const Text('RIWAYAT PERJALANAN (TRIP HISTORY API)'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PassengerProfileScreen()),
                    );
                  },
                  icon: const Icon(Icons.account_circle),
                  label: const Text('Buka Profil Saya'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// 4a. PASSENGER TRIP HISTORY SCREEN (Calls Trip History API: GET /rides/history?role=CUSTOMER)
class PassengerTripHistoryScreen extends StatefulWidget {
  const PassengerTripHistoryScreen({super.key});

  @override
  State<PassengerTripHistoryScreen> createState() => _PassengerTripHistoryScreenState();
}

class _PassengerTripHistoryScreenState extends State<PassengerTripHistoryScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _trips = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchTripHistory();
  }

  Future<void> _fetchTripHistory() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    // Simulated API call matching GET /rides/history?role=CUSTOMER
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;

    setState(() {
      _isLoading = false;
      _trips = [
        {
          'id': 'ride-0511-102',
          'rideId': 'ride-0511-102',
          'status': 'COMPLETED',
          'pickupAddress': 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
          'destinationAddress': 'Kampus ULM Banjarmasin, Kayu Tangi',
          'totalFare': 16200,
          'createdAt': '2026-10-12T01:10:00Z',
          'rating': null,
          'driver': {
            'name': 'Ahmad Gazali',
            'vehiclePlate': 'DA 5110 KAW',
            'rating': 4.9,
          },
        },
        {
          'id': 'ride-0511-103',
          'rideId': 'ride-0511-103',
          'status': 'COMPLETED',
          'pickupAddress': 'Pasar Terapung Siring Pierre Tendean',
          'destinationAddress': 'Menara Pandang Banjarmasin',
          'totalFare': 10000,
          'createdAt': '2026-10-10T09:00:00Z',
          'rating': {'score': 5, 'comment': 'Paham jalan tikus, bebas macet!'},
          'driver': {
            'name': 'Ahmad Gazali',
            'vehiclePlate': 'DA 5110 KAW',
            'rating': 4.9,
          },
        },
        {
          'id': 'ride-0511-104',
          'rideId': 'ride-0511-104',
          'status': 'CANCELLED',
          'pickupAddress': 'Kuripan, Jl. Veteran',
          'destinationAddress': 'Patung Bekantan Siring Tendean',
          'totalFare': 10000,
          'createdAt': '2026-10-09T04:10:00Z',
          'rating': null,
          'driver': null,
        },
      ];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Riwayat Perjalanan Penumpang'),
        backgroundColor: const Color(0xFFDC2626),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchTripHistory,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFDC2626)))
          : _error != null
              ? Center(child: Text(_error!))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _trips.length,
                  itemBuilder: (context, index) {
                    final trip = _trips[index];
                    final bool isCompleted = trip['status'] == 'COMPLETED';
                    final bool isRated = trip['rating'] != null;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => PassengerTripDetailScreen(
                                rideId: trip['rideId'] ?? trip['id'],
                                tripData: trip,
                              ),
                            ),
                          ).then((_) => _fetchTripHistory());
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.between,
                                children: [
                                  Text(
                                    trip['createdAt'] != null
                                        ? trip['createdAt'].toString().substring(0, 10)
                                        : '-',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                  ),
                                  Chip(
                                    label: Text(
                                      trip['status'] ?? 'UNKNOWN',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isCompleted ? Colors.green[800] : Colors.red[800],
                                      ),
                                    ),
                                    backgroundColor: isCompleted ? Colors.green[50] : Colors.red[50],
                                    padding: EdgeInsets.zero,
                                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  const Icon(Icons.circle, size: 8, color: Colors.green),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      trip['pickupAddress'] ?? '',
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  const Icon(Icons.circle, size: 8, color: Colors.red),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      trip['destinationAddress'] ?? '',
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.between,
                                children: [
                                  Text(
                                    'Rp ${(trip['totalFare'] ?? 0).toString()}',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      if (isRated)
                                        Row(
                                          children: [
                                            const Icon(Icons.star, size: 14, color: Colors.amber),
                                            Text(
                                              ' ${trip['rating']['score']}.0',
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        )
                                      else if (isCompleted)
                                        const Text(
                                          'Belum Dinilai',
                                          style: TextStyle(fontSize: 11, color: Colors.grey),
                                        ),
                                      const SizedBox(width: 8),
                                      const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

// 4b. PASSENGER TRIP DETAIL SCREEN (Calls Trip Detail API: GET /rides/:id/detail?role=CUSTOMER)
class PassengerTripDetailScreen extends StatefulWidget {
  final String rideId;
  final Map<String, dynamic>? tripData;

  const PassengerTripDetailScreen({
    super.key,
    required this.rideId,
    this.tripData,
  });

  @override
  State<PassengerTripDetailScreen> createState() => _PassengerTripDetailScreenState();
}

class _PassengerTripDetailScreenState extends State<PassengerTripDetailScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _detail;

  @override
  void initState() {
    super.initState();
    _fetchTripDetail();
  }

  Future<void> _fetchTripDetail() async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;

    setState(() {
      _isLoading = false;
      _detail = widget.tripData ?? {
        'id': widget.rideId,
        'rideId': widget.rideId,
        'status': 'COMPLETED',
        'pickupAddress': 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
        'destinationAddress': 'Kampus ULM Banjarmasin, Kayu Tangi',
        'distanceKm': 4.2,
        'durationMinutes': 14,
        'totalFare': 16200,
        'fare': {
          'baseFare': 7000,
          'distanceFare': 9240,
          'durationFare': 2800,
        },
        'payment': {
          'status': 'PAID',
          'method': 'DIGITAL',
        },
        'driver': {
          'name': 'Ahmad Gazali',
          'vehiclePlate': 'DA 5110 KAW',
          'vehicleModel': 'Honda Vario 160',
          'rating': 4.9,
        },
        'rating': null,
      };
    });
  }

  void _openRatingDialog() {
    showDialog(
      context: context,
      builder: (_) => PassengerRatingDialog(
        rideId: widget.rideId,
        driverName: _detail?['driver']?['name'] ?? 'Mitra Driver',
        onSuccess: (score, comment) {
          setState(() {
            _detail?['rating'] = {'score': score, 'comment': comment};
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('Detail Order #${widget.rideId.substring(widget.rideId.length > 8 ? widget.rideId.length - 8 : 0)}'),
        backgroundColor: const Color(0xFFDC2626),
        foregroundColor: Colors.white,
      ),
      body: _isLoading || _detail == null
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFDC2626)))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Rute Card
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('RUTE PERJALANAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.circle, color: Colors.green, size: 10),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_detail!['pickupAddress'] ?? '-', style: const TextStyle(fontWeight: FontWeight.bold))),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(Icons.circle, color: Colors.red, size: 10),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_detail!['destinationAddress'] ?? '-', style: const TextStyle(fontWeight: FontWeight.bold))),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Driver Card
                if (_detail!['driver'] != null)
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const CircleAvatar(
                            backgroundColor: Color(0xFFDC2626),
                            child: Icon(Icons.two_wheeler, color: Colors.white),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_detail!['driver']['name'] ?? 'Mitra Driver', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                Text('${_detail!['driver']['vehiclePlate']} • ${_detail!['driver']['vehicleModel'] ?? ''}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                          ),
                          if (_detail!['driver']['rating'] != null)
                            Chip(
                              avatar: const Icon(Icons.star, size: 14, color: Colors.amber),
                              label: Text('${_detail!['driver']['rating']}'),
                            ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 12),

                // Fare Card
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('RINCIAN TARIF', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.between,
                          children: [
                            const Text('Tarif Dasar'),
                            Text('Rp ${(_detail!['fare']?['baseFare'] ?? 7000)}'),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.between,
                          children: [
                            const Text('Total Pembayaran', style: TextStyle(fontWeight: FontWeight.bold)),
                            Text('Rp ${_detail!['totalFare']}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Rating Section
                if (_detail!['rating'] != null)
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    color: Colors.amber[50],
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('PENILAIAN ANDA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.amber)),
                          const SizedBox(height: 6),
                          Row(
                            children: List.generate(
                              5,
                              (index) => Icon(
                                Icons.star,
                                size: 18,
                                color: index < (_detail!['rating']['score'] ?? 5) ? Colors.amber : Colors.grey[300],
                              ),
                            ),
                          ),
                          if (_detail!['rating']['comment'] != null) ...[
                            const SizedBox(height: 6),
                            Text('"${_detail!['rating']['comment']}"', style: const TextStyle(fontStyle: FontStyle.italic)),
                          ],
                        ],
                      ),
                    ),
                  )
                else if (_detail!['status'] == 'COMPLETED')
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: _openRatingDialog,
                      icon: const Icon(Icons.star),
                      label: const Text('BERI PENILAIAN MITRA DRIVER (RATING API)'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

// 4c. PASSENGER RATING DIALOG (Calls Rating API: POST /rides/:id/rating)
class PassengerRatingDialog extends StatefulWidget {
  final String rideId;
  final String driverName;
  final Function(int score, String comment) onSuccess;

  const PassengerRatingDialog({
    super.key,
    required this.rideId,
    required this.driverName,
    required this.onSuccess,
  });

  @override
  State<PassengerRatingDialog> createState() => _PassengerRatingDialogState();
}

class _PassengerRatingDialogState extends State<PassengerRatingDialog> {
  int _score = 5;
  final TextEditingController _commentCtrl = TextEditingController();
  bool _isSubmitting = false;

  void _submitRating() async {
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    widget.onSuccess(_score, _commentCtrl.text);
    Navigator.of(context).pop();

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Terima kasih! Penilaian berhasil disimpan ke Rating API.'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Beri Rating ${widget.driverName}'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final starValue = index + 1;
                return IconButton(
                  icon: Icon(
                    Icons.star,
                    color: starValue <= _score ? Colors.amber : Colors.grey[300],
                    size: 32,
                  ),
                  onPressed: () => setState(() => _score = starValue),
                );
              }),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _commentCtrl,
              decoration: const InputDecoration(
                hintText: 'Tulis komentar/ulasan (opsional)...',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          child: const Text('Batal'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitRating,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFDC2626),
            foregroundColor: Colors.white,
          ),
          child: _isSubmitting
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('KIRIM RATING'),
        ),
      ],
    );
  }
}

// 5. PASSENGER PROFILE & LOGOUT SCREEN
class PassengerProfileScreen extends StatefulWidget {
  const PassengerProfileScreen({super.key});

  @override
  State<PassengerProfileScreen> createState() => _PassengerProfileScreenState();
}

class _PassengerProfileScreenState extends State<PassengerProfileScreen> {
  final TextEditingController _nameController = TextEditingController(text: 'Arief Laksono');
  final TextEditingController _emailController = TextEditingController(text: 'arief@kawai0511.id');

  void _logout() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const PassengerPhoneLoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(title: const Text('Profil Pengguna')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const CircleAvatar(radius: 40, backgroundColor: Color(0xFFDC2626), child: Icon(Icons.person, size: 48, color: Colors.white)),
            const SizedBox(height: 16),
            const Text('+6281255110987', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF64748B))),
            const SizedBox(height: 24),
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Nama Lengkap', border: OutlineInputBorder())),
            const SizedBox(height: 16),
            TextField(controller: _emailController, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton(
                onPressed: _logout,
                style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                child: const Text('KELUAR (LOGOUT)', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
