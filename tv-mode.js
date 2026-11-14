/* VORTEX TV Experience — lightweight, compatible with older TV browser engines. */
(function (window, document) {
  'use strict';

  var STORAGE_KEY = 'lammet-tv-mode-v1';
  var root = document.documentElement;
  var button = null;

  function readEnabled() {
    try { return window.localStorage.getItem(STORAGE_KEY) === '1'; }
    catch (error) { return false; }
  }

  function setEnabled(enabled, persist) {
    if (enabled) root.classList.add('vortex-tv-mode');
    else root.classList.remove('vortex-tv-mode');

    if (persist !== false) {
      try { window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); }
      catch (error) { /* TV browsers may block storage; current-page mode still works. */ }
    }

    updateButton();
    try {
      var event;
      if (typeof window.CustomEvent === 'function') {
        event = new window.CustomEvent('vortex-tv-mode-change', { detail: { enabled: !!enabled } });
        window.dispatchEvent(event);
      }
    } catch (error) { /* The visual mode remains applied without custom events. */ }
  }

  function updateButton() {
    if (!button) return;
    var enabled = root.classList.contains('vortex-tv-mode');
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.textContent = enabled ? 'وضع التلفزيون: مُفعّل' : 'وضع التلفزيون';
    button.setAttribute('aria-label', enabled ? 'إيقاف وضع التلفزيون' : 'تفعيل وضع التلفزيون');
    button.title = enabled ? 'إيقاف الواجهة الكبيرة للتلفزيون' : 'تكبير العناصر وتحسين المؤشر للتلفزيون';
  }

  function createButton() {
    if (document.getElementById('vortex-tv-mode-toggle')) {
      button = document.getElementById('vortex-tv-mode-toggle');
      updateButton();
      return;
    }

    var host = document.querySelector('.nav-actions');
    var appendToTopbar = false;
    if (!host) {
      host = document.querySelector('.topbar');
      appendToTopbar = true;
    }
    if (!host) host = document.querySelector('header');
    if (!host) return;

    button = document.createElement('button');
    button.type = 'button';
    button.id = 'vortex-tv-mode-toggle';
    button.className = 'tv-mode-toggle';
    button.setAttribute('aria-pressed', root.classList.contains('vortex-tv-mode') ? 'true' : 'false');
    button.setAttribute('aria-label', 'تفعيل وضع التلفزيون');
    button.textContent = 'وضع التلفزيون';
    button.addEventListener('click', function () {
      setEnabled(!root.classList.contains('vortex-tv-mode'), true);
    });

    if (appendToTopbar && host.querySelector('.top-spacer')) {
      host.insertBefore(button, host.querySelector('.top-spacer').nextSibling);
    } else {
      host.appendChild(button);
    }
    updateButton();
  }

  function init() {
    setEnabled(readEnabled(), false);
    createButton();
  }

  window.addEventListener('storage', function (event) {
    if (event && event.key === STORAGE_KEY) setEnabled(event.newValue === '1', false);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VortexTVMode = {
    isEnabled: function () { return root.classList.contains('vortex-tv-mode'); },
    setEnabled: setEnabled
  };
}(window, document));
