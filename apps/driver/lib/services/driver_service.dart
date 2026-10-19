import 'api_service.dart';
import 'auth_service.dart';

class DriverService {
  final ApiService _api = ApiService();

  Future<Map<String, dynamic>> getMyProfile() async {
    final token = AuthService.accessToken;
    if (token == null) throw Exception('Not authenticated');
    
    return await _api.get('/drivers/me', token: token);
  }

  Future<Map<String, dynamic>> getVerificationStatus() async {
    final token = AuthService.accessToken;
    if (token == null) throw Exception('Not authenticated');
    
    return await _api.get('/drivers/me/verification', token: token);
  }
}
