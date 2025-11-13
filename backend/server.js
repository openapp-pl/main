require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const connectDB = require('./database');
const User = require('./models/User');

const MONGO_URL = process.env.MONGO_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const PORT = process.env.PORT || 4000;

if (!MONGO_URL) {
  console.error('Brak MONGO_URL w .env — uzupełnij zgodnie z .env.example');
  process.exit(1);
}

connectDB(MONGO_URL);

const app = express();
app.use(express.json());
app.use(cookieParser());

// Serwujemy frontend jako static (pliki z folderu frontend będą dostępne pod /static)
app.use('/static', express.static(path.join(__dirname, '..', 'frontend')));

// Endpointy API
const TOKEN_NAME = 'token';

// helper - tworzy token
function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// middleware do autoryzacji z cookie
function authMiddleware(req, res, next) {
  const token = req.cookies[TOKEN_NAME];
  if (!token) return res.status(401).json({ message: 'Brak tokena' });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Nieprawidłowy token' });
  }
}

// rejestracja
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Brakuje danych' });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Użytkownik już istnieje' });

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await User.create({ email, passwordHash });

    // od razu logujemy: generujemy token i ustawiamy cookie
    const token = createToken({ id: user._id, email: user.email });
    res.cookie(TOKEN_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // w produkcji ustaw na true i używaj HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ id: user._id, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// logowanie
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Brakuje danych' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Nieprawidłowe dane' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Nieprawidłowe dane' });

    const token = createToken({ id: user._id, email: user.email });
    res.cookie(TOKEN_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // w prod -> true
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ id: user._id, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// logout - czyścimy ciasteczko
app.post('/api/logout', (req, res) => {
  res.clearCookie(TOKEN_NAME);
  res.json({ ok: true });
});

// sprawdzenie aktualnego użytkownika
app.get('/api/me', authMiddleware, async (req, res) => {
  // req.user zawiera id i email z tokena
  res.json({ id: req.user.id, email: req.user.email });
});

// odpalamy serwis: serwujemy index.html dla root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

