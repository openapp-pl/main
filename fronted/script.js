// script.js - prosty frontend dla logowania/rejestracji
document.addEventListener('DOMContentLoaded', () => {
  const loginOpen = document.getElementById('login-open');
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('close-modal');
  const authForm = document.getElementById('auth-form');
  const switchBtn = document.getElementById('switch-btn');
  const modalTitle = document.getElementById('modal-title');
  const submitBtn = document.getElementById('submit-btn');
  const formMsg = document.getElementById('form-msg');
  const authArea = document.getElementById('auth-area');
  const message = document.getElementById('message');
  const privateSection = document.getElementById('private');

  let mode = 'login'; // albo 'register'

  loginOpen.addEventListener('click', () => {
    openModal('login');
  });

  closeModal.addEventListener('click', () => modal.classList.add('hidden'));

  switchBtn.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    updateModalMode();
  });

  function openModal(m) {
    mode = m || 'login';
    updateModalMode();
    formMsg.textContent = '';
    modal.classList.remove('hidden');
  }

  function updateModalMode() {
    if (mode === 'login') {
      modalTitle.textContent = 'Zaloguj się';
      submitBtn.textContent = 'Zaloguj';
      switchBtn.textContent = 'Nie masz konta? Zarejestruj się';
    } else {
      modalTitle.textContent = 'Zarejestruj się';
      submitBtn.textContent = 'Zarejestruj';
      switchBtn.textContent = 'Masz konto? Zaloguj się';
    }
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) { formMsg.textContent = 'Wypełnij wszystkie pola'; return; }

    try {
      const url = mode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password})
      });
      const data = await res.json();
      if (!res.ok) {
        formMsg.textContent = data.message || 'Błąd';
        return;
      }
      // sukces -> cookie httpOnly ustawione z backendu, więc tylko odpytać /api/me
      modal.classList.add('hidden');
      await refreshAuth();
    } catch (err) {
      formMsg.textContent = 'Błąd połączenia';
      console.error(err);
    }
  });

  // Wyloguj
  authArea.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'logout-btn') {
      await fetch('/api/logout', {method: 'POST'});
      await refreshAuth();
    }
  });

  // Przy starcie sprawdź czy zalogowany
  async function refreshAuth() {
    try {
      const res = await fetch('/api/me', {method: 'GET'});
      if (!res.ok) {
        renderLoggedOut();
        return;
      }
      const user = await res.json();
      renderLoggedIn(user);
    } catch (err) {
      console.error(err);
      renderLoggedOut();
    }
  }

  function renderLoggedIn(user) {
    authArea.innerHTML = `
      <span style="margin-right:10px">Witaj, <strong>${escapeHtml(user.email)}</strong></span>
      <button id="logout-btn">Wyloguj się</button>
    `;
    message.textContent = 'Jesteś zalogowany — masz dostęp do prywatnej sekcji.';
    privateSection.classList.remove('hidden');
  }

  function renderLoggedOut() {
    authArea.innerHTML = `<button id="login-open">Zaloguj się</button>`;
    document.getElementById('login-open').addEventListener('click', () => openModal('login'));
    message.textContent = 'Nie jesteś zalogowany.';
    privateSection.classList.add('hidden');
  }

  // prosta sanitacja do wstawiania emaila
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Inicjuj
  refreshAuth();
});

