import express from 'express';

const app = express();
app.use(express.json());

// Đây là skeleton cho API của bạn
app.post('/api/auth/signup', (req, res) => {
  // Logic giả lập: Trả về 200 cho tất cả, code phân biệt trong body
  const { phone_number, password } = req.body;
  if (!phone_number || !password) {
    return res.status(200).json({ code: 2001, message: 'Missing param' });
  }
  return res.status(200).json({ code: 1000, message: 'Success', user_id: 'uuid-123' });
});

app.post('/api/auth/login', (req, res) => {
  const { phone_number, password } = req.body;
  if (!phone_number || !password) {
    return res.status(200).json({ code: 2001, message: 'Missing param' });
  }
  // Logic so sánh password
  if (password === 'wrong_pass') {
    return res.status(200).json({ code: 3008, message: 'Wrong password' });
  }
  return res.status(200).json({ 
    code: 1000, 
    message: 'Success', 
    data: { accessToken: 'token-' + Math.random(), refreshToken: 'ref-' + Math.random() } 
  });
});

export default app;
