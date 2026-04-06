import nock from 'nock';
import { signup, SignupRequest, SignupResponse } from '../../src/auth/signup';

describe('Signup API Unit Test - Comprehensive Suite', () => {
  const baseUrl = 'https://api.hospital.com';

  beforeEach(() => {
    if (!nock.isActive()) nock.activate();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // 1. Success: Valid signup with all fields (Need to call on DB to check if DB is updated or not)
  it('1. should return success (Code 4) with all fields provided', async () => {
    const mockRequest: SignupRequest = {
      phone_number: '0123456789',
      password: 'StrongPassword123!',
      full_name: 'John Doe',
      dob: '1990-01-01',
      gender: 1
    };
    const mockResponse: SignupResponse = {
      code: '1000',
      message: 'OK',
      user_id: 'user_new_001'
    };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(200, mockResponse);
    const result = await signup(baseUrl, mockRequest);
    expect(result.code).toBe('1000');
    expect(result.user_id).toBe('user_new_001');
  });

  // 2. Success: Minimal mandatory fields
  it('2. should return success (Code 4) with only mandatory fields', async () => {
    const mockRequest: SignupRequest = {
      phone_number: '0987654321',
      password: 'password123',
      full_name: 'Jane Smith'
    };
    const mockResponse: SignupResponse = {
      code: '1000',
      message: 'OK',
      user_id: 'user_new_002'
    };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(200, mockResponse);
    const result = await signup(baseUrl, mockRequest);
    expect(result.code).toBe('1000');
  });

  // 3. Success: Gender Female (0)
  it('3. should handle female gender (0) correctly', async () => {
    const mockRequest: SignupRequest = {
      phone_number: '0123456788',
      password: 'pass',
      full_name: 'Mary Jane',
      gender: 0
    };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(200, { code: '4', message: 'OK', user_id: 'u3' });
    const result = await signup(baseUrl, mockRequest);
    expect(result.code).toBe('1000');
  });

  // 4. Failure: Phone number already exists (Call signup API twice, to check on if the numbers are signed up in DB)
  it('4. should fail (Code 5) if phone number is already registered', async () => {
    const mockRequest: SignupRequest = {
      phone_number: '0123456789',
      password: 'password',
      full_name: 'Duplicate'
    };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(409, { code: '3006', message: 'Số điện thoại đã tồn tại.' });
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 5. Failure: Password too weak
  it('5. should fail if password does not meet security requirements', async () => {
    const mockRequest: SignupRequest = {
      phone_number: '0123456790',
      password: '123',
      full_name: 'Weak Pass'
    };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(400, { code: '2002', message: 'Mật khẩu quá yếu.' });
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 6. Validation: Missing phone_number (Need more test case about too short phone number or too long)
  it('6. should fail if phone_number is missing', async () => {
    const mockRequest: any = { password: 'pass', full_name: 'Missing Phone' };
    nock(baseUrl).post('/api/auth/signup', mockRequest).reply(400, { code: '2001', message: 'Thiếu số điện thoại.' });
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 7. Validation: Missing password
  it('7. should fail if password is missing', async () => {
    const mockRequest: any = { phone_number: '0123456791', full_name: 'Missing Pass' };
    nock(baseUrl).post('/api/auth/signup', mockRequest).reply(400, { code: '2001', message: 'Thiếu mật khẩu.' });
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 8. Validation: Missing full_name
  it('8. should fail if full_name is missing', async () => {
    const mockRequest: any = { phone_number: '0123456792', password: 'pass' };
    nock(baseUrl).post('/api/auth/signup', mockRequest).reply(400, { code: '2001', message: 'Thiếu họ tên.' });
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 9. Validation: Invalid phone format (letters)
  it('9. should fail for phone number with letters', async () => {
    const mockRequest: SignupRequest = { phone_number: '0123abc789', password: 'pass', full_name: 'Invalid Phone' };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(400, { code: '2002', message: 'SĐT không hợp lệ.' });
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 10. Validation: Invalid DOB format (Need more test case for invalid date or months)
  it('10. should fail if date of birth format is invalid', async () => {
    const mockRequest: SignupRequest = {
      phone_number: '0123456793',
      password: 'pass',
      full_name: 'Bad Date',
      dob: '01/01/1990' // Wrong format
    };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(400, { code: '2002', message: 'Định dạng ngày sinh sai.' });
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 11. System: 500 Internal Server Error
  it('11. should handle server-side errors (500)', async () => {
    const mockRequest: SignupRequest = { phone_number: '0123456794', password: 'pass', full_name: 'Server Error' };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(500);
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 12. System: 503 Service Unavailable
  it('12. should handle service unavailable (503)', async () => {
    const mockRequest: SignupRequest = { phone_number: '0123456795', password: 'pass', full_name: 'Down' };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(503);
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 13. System: Timeout simulation
  it('13. should handle request timeouts', async () => {
    const mockRequest: SignupRequest = { phone_number: '0123456796', password: 'pass', full_name: 'Slow' };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).delay(3000).reply(200);
    const result = await signup(baseUrl, mockRequest);
    expect(result).toBeDefined();
  });

  // 14. Validation: Gender invalid (out of range)
  it('14. should handle invalid gender value (e.g., 2)', async () => {
    const mockRequest: SignupRequest = { phone_number: '0123456797', password: 'pass', full_name: 'Gender Invalid', gender: 2 };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(400, { code: '2003', message: 'Giới tính không hợp lệ.' });
    await expect(signup(baseUrl, mockRequest)).rejects.toThrow();
  });

  // 15. Success: Leap year DOB
  it('15. should handle valid leap year date of birth', async () => {
    const mockRequest: SignupRequest = {
      phone_number: '0123456798',
      password: 'pass',
      full_name: 'Leap Year',
      dob: '2000-02-29'
    };
    nock(baseUrl).post('/api/auth/signup', mockRequest as any).reply(200, { code: '1000', message: 'OK', user_id: 'u15' });
    const result = await signup(baseUrl, mockRequest);
    expect(result.code).toBe('1000');
  });
});
