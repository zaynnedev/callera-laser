// auth.js — controla login/logout e gate do Admin

(() => {
  const gate = document.getElementById('authGate');
  const form = document.getElementById('authForm');
  const btnLogout = document.getElementById('btnLogout');

  function showGate() { gate && (gate.style.display = 'grid'); }
  function hideGate() { gate && (gate.style.display = 'none'); }

  async function ensureSession() {
    try {
      const { data: { session } } = await SUPA.auth.getSession();
      if (session) { hideGate(); return true; }
      showGate();  return false;
    } catch { showGate(); return false; }
  }

  // login
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail')?.value?.trim();
    const pass  = document.getElementById('authPass')?.value?.trim();
    if (!email || !pass) return;

    try {
      const { error } = await SUPA.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      hideGate();
      location.reload();
    } catch (err) {
      console.error(err);
      alert('Falha no login. Verifique e-mail/senha.');
    }
  });

  // logout
  btnLogout?.addEventListener('click', async () => {
    try {
      await SUPA.auth.signOut();
      showGate();
    } catch (err) {
      console.error(err);
      alert('Não foi possível sair.');
    }
  });

  document.addEventListener('DOMContentLoaded', ensureSession);
})();
