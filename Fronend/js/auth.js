let mnxAuthReturnFocusEl = null;

function mnxOpenAuthModal(initialTab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  mnxSwitchAuthTab(initialTab);
  mnxResetAuthModal();

  mnxAuthReturnFocusEl = document.activeElement;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Focus the first field of the visible panel for keyboard users
  setTimeout(() => {
    modal.querySelector('.auth-modal__panel.is-active input')?.focus();
  }, 250);
}

function mnxCloseAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
  mnxAuthReturnFocusEl?.focus?.();
}

function mnxResetAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.querySelectorAll('form').forEach((form) => form.reset());
  modal.querySelectorAll('.auth-field').forEach((f) => f.classList.remove('has-error'));
  modal.querySelector('#auth-modal-success')?.classList.remove('is-active');
  modal.querySelector('#auth-modal-forms')?.style.removeProperty('display');
  mnxHideAuthError();

  // Reset lifestyle preference pickers back to their defaults
  modal.querySelectorAll('#register-interests button').forEach((b) => b.classList.remove('is-active'));
  modal.querySelectorAll('#register-env-pref button').forEach((b) => b.classList.toggle('is-active', b.dataset.env === 'both'));
  modal.querySelectorAll('#register-pace-pref button').forEach((b) => b.classList.toggle('is-active', b.dataset.pace === 'both'));
}

function mnxShowAuthError(message) {
  const modal = document.getElementById('auth-modal');
  const banner = modal?.querySelector('#auth-modal-api-error');
  if (!banner) return;
  banner.textContent = message;
  banner.classList.add('is-active');
}

function mnxHideAuthError() {
  const banner = document.getElementById('auth-modal')?.querySelector('#auth-modal-api-error');
  banner?.classList.remove('is-active');
}

function mnxSetFormLoading(form, isLoading) {
  form?.querySelectorAll('button').forEach((btn) => btn.classList.toggle('is-loading', isLoading));
}

function mnxSwitchAuthTab(tab) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  modal.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.authTab === tab);
  });
  modal.querySelectorAll('[data-auth-panel]').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.authPanel === tab);
  });

  const title = modal.querySelector('#auth-modal-title');
  const subtitle = modal.querySelector('.auth-modal__subtitle');
  if (title && subtitle) {
    if (tab === 'register') {
      title.textContent = 'สร้างบัญชีใหม่';
      subtitle.textContent = 'สมัครสมาชิกเพื่อเช็คอิน กดหัวใจ และคอมเมนต์ได้เต็มรูปแบบ';
    } else {
      title.textContent = 'ยินดีต้อนรับ';
      subtitle.textContent = 'เข้าสู่ระบบเพื่อเช็คอิน กดหัวใจ และคอมเมนต์ได้เต็มรูปแบบ';
    }
  }
}

function mnxValidateField(fieldEl, isValid) {
  fieldEl.classList.toggle('has-error', !isValid);
  return isValid;
}

const MNX_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function mnxHandleLoginSubmit(e) {
  e.preventDefault();
  const modal = document.getElementById('auth-modal');
  const form = e.target;
  const emailField = modal.querySelector('[data-field="login-email"]');
  const passField = modal.querySelector('[data-field="login-password"]');
  const email = emailField.querySelector('input').value.trim();
  const password = passField.querySelector('input').value;

  const emailOk = mnxValidateField(emailField, MNX_EMAIL_RE.test(email));
  const passOk = mnxValidateField(passField, password.length > 0);
  if (!emailOk || !passOk) return;

  mnxHideAuthError();
  mnxSetFormLoading(form, true);
  try {
    await window.MNX_AUTH.login({ email, password });
    mnxShowAuthSuccess('เข้าสู่ระบบสำเร็จ');
  } catch (err) {
    mnxShowAuthError(err.message);
  } finally {
    mnxSetFormLoading(form, false);
  }
}

async function mnxHandleRegisterSubmit(e) {
  e.preventDefault();
  const modal = document.getElementById('auth-modal');
  const form = e.target;
  const nameField = modal.querySelector('[data-field="register-name"]');
  const emailField = modal.querySelector('[data-field="register-email"]');
  const passField = modal.querySelector('[data-field="register-password"]');
  const birthdateField = modal.querySelector('[data-field="register-birthdate"]');
  const name = nameField.querySelector('input').value.trim();
  const email = emailField.querySelector('input').value.trim();
  const password = passField.querySelector('input').value;
  const birthdate = birthdateField.querySelector('input').value;

  const nameOk = mnxValidateField(nameField, name.length > 0);
  const emailOk = mnxValidateField(emailField, MNX_EMAIL_RE.test(email));
  const passOk = mnxValidateField(passField, password.length >= 8);
  const birthdateOk = mnxValidateField(birthdateField, !!birthdate);
  if (!nameOk || !emailOk || !passOk || !birthdateOk) return;

  const interests = [...modal.querySelectorAll('#register-interests button.is-active')].map((b) => b.dataset.interest);
  const envPref = modal.querySelector('#register-env-pref button.is-active')?.dataset.env || 'both';
  const pacePref = modal.querySelector('#register-pace-pref button.is-active')?.dataset.pace || 'both';

  mnxHideAuthError();
  mnxSetFormLoading(form, true);
  try {
    await window.MNX_AUTH.register({
      name,
      email,
      password,
      profile: { birthdate, interests, envPref, pacePref },
    });
    mnxShowAuthSuccess('สมัครสมาชิกสำเร็จ');
  } catch (err) {
    mnxShowAuthError(err.message);
  } finally {
    mnxSetFormLoading(form, false);
  }
}

async function mnxHandleGoogleAuth(e) {
  const btn = e.currentTarget;
  const form = btn.closest('form');

  mnxHideAuthError();
  mnxSetFormLoading(form, true);
  try {
    await window.MNX_AUTH.loginWithGoogle();
    mnxShowAuthSuccess('เข้าสู่ระบบด้วย Google สำเร็จ');
  } catch (err) {
    mnxShowAuthError(err.message);
  } finally {
    mnxSetFormLoading(form, false);
  }
}

function mnxShowAuthSuccess(message) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  modal.querySelector('#auth-modal-forms').style.display = 'none';
  const success = modal.querySelector('#auth-modal-success');
  modal.querySelector('#auth-success-title').textContent = message;
  success.classList.add('is-active');

  setTimeout(mnxCloseAuthModal, 1400);
}

function initAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  document.body.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-auth-open]');
    if (!trigger) return;
    e.preventDefault();
    mnxOpenAuthModal(trigger.dataset.authOpen || 'login');
  });

  modal.querySelector('#auth-modal-close')?.addEventListener('click', mnxCloseAuthModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) mnxCloseAuthModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) mnxCloseAuthModal();
  });

  modal.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    btn.addEventListener('click', () => mnxSwitchAuthTab(btn.dataset.authTab));
  });
  modal.querySelectorAll('[data-auth-switch]').forEach((btn) => {
    btn.addEventListener('click', () => mnxSwitchAuthTab(btn.dataset.authSwitch));
  });

  modal.querySelector('#auth-panel-login')?.addEventListener('submit', mnxHandleLoginSubmit);
  modal.querySelector('#auth-panel-register')?.addEventListener('submit', mnxHandleRegisterSubmit);
  modal.querySelectorAll('[data-auth-google]').forEach((btn) => {
    btn.addEventListener('click', mnxHandleGoogleAuth);
  });

  modal.querySelectorAll('#register-interests button').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('is-active'));
  });
  modal.querySelectorAll('#register-env-pref button').forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('#register-env-pref button').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });
  modal.querySelectorAll('#register-pace-pref button').forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('#register-pace-pref button').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });

  document.addEventListener('auth:changed', (e) => {
    if (e.detail?.session && modal.classList.contains('is-open')) {
    }
  });
}

document.addEventListener('includes:loaded', initAuthModal);
