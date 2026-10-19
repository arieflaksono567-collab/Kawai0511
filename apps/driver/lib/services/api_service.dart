import 'dart:io';
import 'dart:convert';

class ApiService {
  static const String baseUrl = 'https://kawai-backend.dev'; // SHOULD BE CONFIGURABLE
  final HttpClient _client = HttpClient();

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body, {String? token}) async {
    final url = Uri.parse('$baseUrl$path');
    final request = await _client.postUrl(url);
    request.headers.set('Content-Type', 'application/json');
    if (token != null) {
      request.headers.set('Authorization', 'Bearer $token');
    }
    request.add(utf8.encode(json.encode(body)));
    final response = await request.close();
    final responseBody = await utf8.decodeStream(response);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(responseBody);
    } else {
      throw Exception('API Error: ${response.statusCode} - $responseBody');
    }
  }

  Future<Map<String, dynamic>> get(String path, {String? token}) async {
    final url = Uri.parse('$baseUrl$path');
    final request = await _client.getUrl(url);
    if (token != null) {
      request.headers.set('Authorization', 'Bearer $token');
    }
    final response = await request.close();
    final responseBody = await utf8.decodeStream(response);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(responseBody);
    } else {
      throw Exception('API Error: ${response.statusCode} - $responseBody');
    }
  }
}
