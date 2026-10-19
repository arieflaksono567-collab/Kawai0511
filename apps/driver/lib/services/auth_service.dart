import 'api_service.dart';

class AuthService {
  final ApiService _api = ApiService();
  
  static String? _accessToken;
  static String? _refreshToken;
  static Map<String, dynamic>? _user;

  static String? get accessToken => _accessToken;
  static Map<String, dynamic>? get user => _user;

  Future<void> requestOtp(String phoneNumber) async {
    await _api.post('/auth/request-otp', {
      'phoneNumber': phoneNumber,
      'purpose': 'LOGIN',
      'role': 'DRIVER'
    });
  }

  Future<void> verifyOtp(String phoneNumber, String otp) async {
    final response = await _api.post('/auth/verify-otp', {
      'phoneNumber': phoneNumber,
      'otp': otp,
      'purpose': 'LOGIN',
      'role': 'DRIVER'
    });
    
    _accessToken = response['accessToken'];
    _refreshToken = response['refreshToken'];
    _user = response['user'];
  }
  
  Future<void> logout() async {
     _accessToken = null;
     _refreshToken = null;
     _user = null;
  }
}
