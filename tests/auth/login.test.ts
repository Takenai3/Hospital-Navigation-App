import nock from 'nock';
import { login, LoginRequest, LoginResponse } from '../../src/auth/login';

describe('Login API Unit Test - Comprehensive Suite', () => {
  const baseUrl = 'https://api.hospital.com';

  beforeEach(() => {
    if (!nock.isActive()) nock.activate();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // 1. Success: Standard valid credentials
  it('1. should return success (Code 4) with valid credentials', async () => {
    const mockRequest: LoginRequest = { phone_number: '0123456789', password: 'password123' };
    const mockResponse: LoginResponse = {
      code: '4',
      message: 'Hoàn thành mục tiêu hoặc giao dịch thành công.',
      data: { user_id: 'u1', full_name: 'User One', phone_number: '0123456789' }
    };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(200, mockResponse);
    const result = await login(baseUrl, mockRequest);
    expect(result.code).toBe('4');
  });

  // 2. Success: With device token and platform
  it('2. should handle login with device_token and android platform', async () => {
    const mockRequest: LoginRequest = { 
        phone_number: '0123456789', 
        password: 'password123',
        device_token: 'fcm_token_123',
        platform: 'android'
    };
    const mockResponse: LoginResponse = {
      code: '4',
      message: 'Success',
      data: { user_id: 'u1', full_name: 'User One', phone_number: '0123456789' }
    };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(200, mockResponse);
    const result = await login(baseUrl, mockRequest);
    expect(result.code).toBe('4');
  });

  // 3. Success: iOS platform
  it('3. should handle login with ios platform', async () => {
    const mockRequest: LoginRequest = { 
        phone_number: '0123456789', 
        password: 'password123',
        platform: 'ios'
    };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(200, { code: '4', message: 'OK', data: {} });
    const result = await login(baseUrl, mockRequest);
    expect(result.code).toBe('4');
  });

  // 4. Success: No optional fields
  it('4. should work correctly without optional fields', async () => {
    const mockRequest: LoginRequest = { phone_number: '0999888777', password: 'pass' };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(200, { code: '4', message: 'OK', data: {} });
    const result = await login(baseUrl, mockRequest);
    expect(result.code).toBe('4');
  });

  // 5. Failure: Invalid credentials (Code 5)
  it('5. should return failed (Code 5) for wrong credentials', async () => {
    const mockRequest: LoginRequest = { phone_number: '000', password: 'bad' };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(401, { code: '5', message: 'Lỗi xử lý hệ thống.' });
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 6. Failure: Rejected (Code 6)
  it('6. should return rejected (Code 6) for banned accounts', async () => {
    const mockRequest: LoginRequest = { phone_number: '0111222333', password: 'pass' };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(403, { code: '6', message: 'Yêu cầu bị từ chối.' });
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 7. Validation: Missing phone number
  it('7. should fail when phone_number is missing', async () => {
    const mockRequest: any = { password: 'pass' };
    nock(baseUrl).post('/api/auth/login', mockRequest).reply(400, { code: '5', message: 'Missing phone' });
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 8. Validation: Missing password
  it('8. should fail when password is missing', async () => {
    const mockRequest: any = { phone_number: '0123456789' };
    nock(baseUrl).post('/api/auth/login', mockRequest).reply(400, { code: '5', message: 'Missing password' });
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 9. Validation: Empty body
  it('9. should fail for empty request body', async () => {
    const mockRequest: any = {};
    nock(baseUrl).post('/api/auth/login', mockRequest).reply(400, { code: '5', message: 'Empty body' });
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 10. Validation: Phone too short
  it('10. should fail for short phone number', async () => {
    const mockRequest: LoginRequest = { phone_number: '123', password: 'pass' };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(400, { code: '5', message: 'Invalid phone' });
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 11. Validation: Phone with letters
  it('11. should fail for phone number containing letters', async () => {
    const mockRequest: LoginRequest = { phone_number: '0123abc789', password: 'pass' };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(400, { code: '5', message: 'Invalid phone' });
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 12. System: 500 Internal Server Error
  it('12. should handle 500 Internal Server Error', async () => {
    const mockRequest: LoginRequest = { phone_number: '0123456789', password: 'pass' };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(500);
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 13. System: 503 Service Unavailable
  it('13. should handle 503 Service Unavailable', async () => {
    const mockRequest: LoginRequest = { phone_number: '0123456789', password: 'pass' };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(503);
    await expect(login(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 14. System: Timeout
  it('14. should handle request timeout', async () => {
    const mockRequest: LoginRequest = { phone_number: '0123456789', password: 'pass' };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).delay(2000).reply(200);
    // Note: Axios default timeout is usually infinite unless configured
    // This just tests that it handles delayed responses if we added a timeout
    const result = await login(baseUrl, mockRequest);
    expect(result).toBeDefined();
  });

  // 15. Success: Awaiting Review status (Code 3) - User needs to complete profile/review
  it('15. should handle Awaiting Review (Code 3) status', async () => {
    const mockRequest: LoginRequest = { phone_number: '0123456789', password: 'pass' };
    const mockResponse = {
      code: '3',
      message: 'Awaiting Review',
      data: { user_id: 'u1' }
    };
    nock(baseUrl).post('/api/auth/login', mockRequest as any).reply(200, mockResponse);
    const result = await login(baseUrl, mockRequest);
    expect(result.code).toBe('3');
  });
});
