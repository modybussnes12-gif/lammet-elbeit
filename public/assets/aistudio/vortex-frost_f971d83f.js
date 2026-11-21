/* VORTEX FROST: tiny seasonal preference controller (no dependencies). */
(() => {
  'use strict';
  const KEY = 'vortex-frost-snow-v1';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dataSaver = root.classList.contains('vortex-data-saver') || root.classList.contains('vortex-saver');
  let enabled = true;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === '0') enabled = false;
    if (saved === '1') enabled = true;
  } catch (_) {}
  if (reducedMotion || dataSaver) enabled = false;

  function apply() {
    root.classList.toggle('vortex-no-snow', !enabled || reducedMotion || dataSaver);
  }
  function updateButton(button) {
    const blocked = reducedMotion || dataSaver;
    button.setAttribute('aria-pressed', String(enabled && !blocked));
    button.textContent = blocked ? '❄ الثلج متوقف' : (enabled ? '❄ الثلج يعمل' : '❄ تشغيل الثلج');
    button.title = blocked ? 'تم تقليل الحركة أو تفعيل توفير الموارد' : 'تغيير تأثير الثلج';
    button.disabled = blocked;
  }
  function addToggle() {
    const nav = document.querySelector('.vortex-nav');
    if (!nav || nav.querySelector('.frost-snow-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'frost-snow-toggle';
    button.setAttribute('aria-label', 'تشغيل أو إيقاف تأثير الثلج');
    button.addEventListener('click', () => {
      if (reducedMotion || dataSaver) return;
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (_) {}
      apply();
      updateButton(button);
    });
    const anchor = nav.querySelector('.vortex-nav-spacer, .vortex-status');
    if (anchor) nav.insertBefore(button, anchor); else nav.appendChild(button);
    updateButton(button);
  }
  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addToggle, { once: true });
  } else {
    addToggle();
  }
})();
