/* ==========================================================================
   VORTEX REMOTE ENGINE v2 — محرك التنقل بالريموت لتطبيقات Smart TV
   - تنقل مكاني ذكي يحافظ على العمود
   - إدارة الطبقات والنوافذ وحبس التركيز
   - زر رجوع موحّد لكل الشركات (Tizen / webOS / Android TV / Fire TV)
   - استعادة آخر عنصر تركيز بين الصفحات
   - دعم OK / Enter / Select / Play / Pause
   ========================================================================== */
(function (window, document) {
  'use strict';
  if (window.__VORTEX_REMOTE_ENGINE__) return;
  window.__VORTEX_REMOTE_ENGINE__ = true;

  var root = document.documentElement;
  var FOCUS_KEY = 'lammet-vortex-focus-v2';
  var HINT_KEY = 'lammet-vortex-remote-hint-seen';
  var SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[role="button"]:not([aria-disabled="true"])',
    '[role="link"]',
    '[role="tab"]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  var LAYER_SELECTOR = [
    'dialog[open]',
    '.modal-backdrop.show',
    '.modal-backdrop:not(.hidden):not([aria-hidden="true"])',
    '.sidebar.open',
    '#resume-prompt:not(.hidden)',
    '#auto-next-overlay:not(.hidden)',
    '.search-suggestions:not(.hidden)',
    '#vortex-intro:not(.vortex-intro-done)'
  ].join(',');
  var tvUA = /(smart[- ]?tv|hbbtv|tizen|web0s|webos|netcast|googletv|google tv|android tv|aft[a-z0-9]*|bravia|viera|aquos|roku|apple ?tv|fire tv|hisense|philips tv|panasonic|crkey)/i.test(navigator.userAgent || '');
  var pointerMode = false;
  var hintTimer = 0;
  var currentKey = '';
  var lastFocused = null;

  function tagName(el) { return el && el.tagName ? el.tagName.toLowerCase() : ''; }

  function isEditable(el) {
    var tag = tagName(el);
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!(el && el.isContentEditable);
  }

  function isVisible(el) {
    if (!el || !el.getClientRects || !el.getClientRects().length) return false;
    if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
    if (el.closest('[hidden],.hidden,[aria-hidden="true"],dialog:not([open]),.modal-backdrop.hidden,[inert]')) return false;
    var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0)) return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isOverlaySidebar(el) {
    if (!el.classList || !el.classList.contains('sidebar') || !el.classList.contains('open')) return false;
    // على الشاشات الكبيرة القائمة الجانبية جزء من الصفحة وليست طبقة حاجبة
    return !window.matchMedia || window.matchMedia('(max-width: 980px)').matches;
  }
  function topLayer() {
    var layers = Array.prototype.slice.call(document.querySelectorAll(LAYER_SELECTOR)).filter(function (el) {
      if (el.classList && el.classList.contains('sidebar') && !isOverlaySidebar(el)) return false;
      return isVisible(el) || (el.id === 'vortex-intro' && !el.classList.contains('vortex-intro-done'));
    });
    // أعلى طبقة هي الأخيرة في ترتيب DOM
    return layers.length ? layers[layers.length - 1] : null;
  }

  function candidates() {
    var scope = topLayer() || document;
    var list = Array.prototype.slice.call(scope.querySelectorAll(SELECTOR));
    if (scope !== document && scope.matches && scope.matches(SELECTOR)) list.push(scope);
    list = list.filter(function (el) {
      return isVisible(el) && el.tabIndex !== -1 && !el.hasAttribute('data-vx-skip');
    });
    // عناصر داخل حاوية التركيز فقط عند فتح طبقة
    if (scope !== document) {
      list = list.filter(function (el) { return scope.contains(el) || el === scope; });
    }
    return list;
  }

  // الطبقات الحاجبة (نافذة/حوار) تنقل التركيز داخلها ثم تعيده عند الإغلاق
  var FOCUS_LAYERS = 'dialog[open],.modal-backdrop.show,#resume-prompt:not(.hidden),#auto-next-overlay:not(.hidden),#vortex-intro:not(.vortex-intro-done)';
  var layerKeyTracked = '';
  var layerReturnFocus = null;
  function layerIdentity(el) {
    if (!el) return '';
    if (el.id) return 'id:' + el.id;
    return el.tagName + '.' + (el.className || '');
  }
  function syncLayerFocus() {
    var layer = topLayer();
    var key = layerIdentity(layer);
    if (key === layerKeyTracked) return;
    var previousKey = layerKeyTracked;
    layerKeyTracked = key;
    if (layer && layer.matches && layer.matches(FOCUS_LAYERS)) {
      var active = document.activeElement;
      if (active && active !== document.body && !layer.contains(active)) layerReturnFocus = active;
      var list = candidates();
      if (list.length) focus(list[0]);
      return;
    }
    if (!layer && previousKey && layerReturnFocus) {
      var back = layerReturnFocus;
      layerReturnFocus = null;
      if (back && isVisible(back)) focus(back);
    }
  }

  function keyFor(el) {
    if (!el) return '';
    if (el.id) return 'id:' + el.id;
    var attrs = ['data-open-story', 'data-action', 'data-view', 'data-season', 'data-cinema-index', 'data-vx-section', 'href', 'aria-label'];
    for (var i = 0; i < attrs.length; i++) {
      var val = el.getAttribute && el.getAttribute(attrs[i]);
      if (val) return attrs[i] + ':' + val.slice(0, 120);
    }
    return tagName(el) + ':' + (el.textContent || '').trim().slice(0, 70);
  }

  function pageSignature() {
    return (location.pathname || '/') + '|' + (location.search || '');
  }

  function remember(el) {
    if (!el || el === document.body) return;
    var key = keyFor(el);
    if (!key) return;
    currentKey = key;
    lastFocused = el;
    try { window.sessionStorage.setItem(FOCUS_KEY + ':' + pageSignature(), key); } catch (e) {}
  }

  function clearFocusClasses() {
    var all = document.querySelectorAll('.vortex-focused');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('vortex-focused');
  }

  function ensureVisible(el) {
    var rect = el.getBoundingClientRect();
    var header = document.querySelector('.top, .topbar');
    var offset = header ? Math.min(header.getBoundingClientRect().height + 14, 130) : 16;
    var vh = window.innerHeight || root.clientHeight;
    var needsVertical = rect.top < offset || rect.bottom > vh - 16;
    var parent = el.parentElement;
    var needsHorizontal = false;
    while (parent && parent !== document.body) {
      var style = window.getComputedStyle ? window.getComputedStyle(parent) : null;
      if (style && (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll')) {
        var pr = parent.getBoundingClientRect();
        if (rect.left < pr.left + 4 || rect.right > pr.right - 4) needsHorizontal = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (needsVertical || needsHorizontal) {
      try {
        el.scrollIntoView({ block: needsVertical ? 'nearest' : 'nearest', inline: needsHorizontal ? 'nearest' : 'nearest', behavior: 'auto' });
      } catch (e) {
        try { el.scrollIntoView(false); } catch (ignore) {}
      }
      // تعديل بسيط بعد التمرير للتأكد من ظهور العنصر كاملًا تحت الشريط العلوي
      var after = el.getBoundingClientRect();
      if (after.top < offset) {
        var scroller = document.scrollingElement || document.documentElement;
        scroller.scrollTop -= (offset - after.top);
      }
    }
  }

  function focus(el, silent) {
    if (!el || !isVisible(el)) return false;
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (ignore) { return false; } }
    if (document.activeElement !== el) return false;
    clearFocusClasses();
    el.classList.add('vortex-focused');
    ensureVisible(el);
    if (!silent) remember(el);
    return true;
  }

  function preferredSelector() {
    var path = location.pathname || '';
    if (path.indexOf('watch.html') !== -1) return ['#play-toggle', '#big-play', '#back-details', '.control-btn'];
    if (path.indexOf('details.html') !== -1) return ['#watch-button', '.episode-play', '#detail-favorite', '#season-tabs button', '.side-link'];
    if (path.indexOf('admin.html') !== -1) return ['.view.active .btn.primary', '.view.active .btn', '.sidebar .nav button.active', '.sidebar .nav button'];
    return ['.vortex-nav-link.is-active', '.vortex-nav-link', '#cinema-open', '#cinema-details', '#search', '.card-open', '.story-card a', '.btn'];
  }

  function restoreOrStart() {
    var all = candidates();
    if (!all.length) return;
    var saved = '';
    try { saved = window.sessionStorage.getItem(FOCUS_KEY + ':' + pageSignature()) || ''; } catch (e) {}
    var i;
    if (saved) {
      for (i = 0; i < all.length; i++) {
        if (keyFor(all[i]) === saved && focus(all[i], true)) return;
      }
    }
    var prefs = preferredSelector();
    for (var p = 0; p < prefs.length; p++) {
      var target = document.querySelector(prefs[p]);
      if (target && isVisible(target) && focus(target, true)) return;
    }
    focus(all[0], true);
  }

  function rectOf(el) { return el.getBoundingClientRect(); }

  function move(direction) {
    var all = candidates();
    if (!all.length) return;
    var current = document.activeElement;
    if (!current || current === document.body || current === root || all.indexOf(current) === -1) {
      // لا نسرق التركيز إن كان المستخدم يكتب
      focus(all[0]);
      return;
    }
    var from = rectOf(current);
    var fx = from.left + from.width / 2;
    var fy = from.top + from.height / 2;
    var best = null;
    var bestScore = Infinity;
    all.forEach(function (el) {
      if (el === current) return;
      var to = rectOf(el);
      var tx = to.left + to.width / 2;
      var ty = to.top + to.height / 2;
      var dx = tx - fx;
      var dy = ty - fy;
      var primary, cross, overlapH, overlapV;
      if (direction === 'right') {
        if (dx < 8) return;
        primary = dx; cross = Math.abs(dy);
        overlapV = Math.max(0, Math.min(from.bottom, to.bottom) - Math.max(from.top, to.top));
        cross = overlapV > 0 ? cross * 0.35 : cross * 1.9 + 120;
      } else if (direction === 'left') {
        if (dx > -8) return;
        primary = -dx; cross = Math.abs(dy);
        overlapV = Math.max(0, Math.min(from.bottom, to.bottom) - Math.max(from.top, to.top));
        cross = overlapV > 0 ? cross * 0.35 : cross * 1.9 + 120;
      } else if (direction === 'down') {
        if (dy < 8) return;
        primary = dy; cross = Math.abs(dx);
        overlapH = Math.max(0, Math.min(from.right, to.right) - Math.max(from.left, to.left));
        cross = overlapH > 0 ? cross * 0.3 : cross * 1.7 + 90;
      } else {
        if (dy > -8) return;
        primary = -dy; cross = Math.abs(dx);
        overlapH = Math.max(0, Math.min(from.right, to.right) - Math.max(from.left, to.left));
        cross = overlapH > 0 ? cross * 0.3 : cross * 1.7 + 90;
      }
      var score = primary + cross;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (!best) {
      // عند الوصول لطرف الصف: لا نسمح بفقد التركيز، نبقى في مكاننا
      if (direction === 'left' || direction === 'right') {
        ensureVisible(current);
        return;
      }
      // رأسيًا: إن لم يوجد عنصر مناسب ننتقل لأقرب عنصر في أعلى/أسفل الصفحة
      var fallback = null, fd = Infinity;
      all.forEach(function (el) {
        if (el === current) return;
        var r = rectOf(el);
        var d = direction === 'up' ? (from.top - r.bottom) : (r.top - from.bottom);
        if (d > 0 && d < fd) { fd = d; fallback = el; }
      });
      best = fallback;
    }
    if (best) focus(best);
  }

  function closeSearchSuggestions() {
    var box = document.querySelector('.search-suggestions:not(.hidden), #search-history:not(.hidden)');
    if (box) {
      box.classList.add('hidden');
      var search = document.getElementById('search');
      if (search) focus(search);
      return true;
    }
    return false;
  }

  function closeLayer() {
    var layer = topLayer();
    if (!layer) return false;
    if (tagName(layer) === 'dialog' && typeof layer.close === 'function') {
      try { layer.close(); } catch (e) {}
      return true;
    }
    if (layer.id === 'resume-prompt') {
      var cont = document.getElementById('resume-continue');
      if (cont) { cont.click(); return true; }
      layer.classList.add('hidden');
      return true;
    }
    if (layer.id === 'auto-next-overlay') {
      var cancel = document.getElementById('auto-next-cancel');
      if (cancel) { cancel.click(); return true; }
      layer.classList.add('hidden');
      return true;
    }
    if (layer.classList.contains('sidebar')) {
      layer.classList.remove('open');
      var menu = document.getElementById('mobile-menu');
      if (menu) focus(menu);
      return true;
    }
    if (layer.classList.contains('search-suggestions')) {
      return closeSearchSuggestions();
    }
    var closer = layer.querySelector('[data-vx-close], .reader-close, .modal-head .close, #modal-close, .close');
    if (closer && isVisible(closer)) { closer.click(); return true; }
    layer.classList.add('hidden');
    return true;
  }

  function isSearchSuggestionsOpen() {
    return !!document.querySelector('.search-suggestions:not(.hidden), #search-history:not(.hidden)');
  }

  function goBack() {
    if (closeLayer()) return;
    closeSearchSuggestions();
    var path = location.pathname || '';
    var sameSiteReferrer = false;
    try {
      sameSiteReferrer = !!document.referrer && new URL(document.referrer, location.href).origin === location.origin;
    } catch (e) {}
    if (sameSiteReferrer && history.length > 1) {
      try { history.back(); return; } catch (e) {}
    }
    if (path.indexOf('watch.html') !== -1) {
      var back = document.getElementById('back-details') || document.getElementById('return-link');
      if (back && back.href) location.href = back.href;
      else location.href = './index.html';
      return;
    }
    if (path.indexOf('details.html') !== -1) { location.href = './index.html#library'; return; }
    if (path.indexOf('admin.html') !== -1) { location.href = './index.html'; return; }
    // في الرئيسية: لا نخرج المستخدم من الموقع. نرجع لأعلى الصفحة بهدوء.
    if (location.hash && location.hash !== '#library') { location.hash = '#library'; return; }
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  }

  function showHint() {
    if (document.getElementById('vortex-remote-hint')) return;
    var seen = false;
    try { seen = window.sessionStorage.getItem(HINT_KEY) === '1'; } catch (e) {}
    if (seen) return;
    var hint = document.createElement('div');
    hint.id = 'vortex-remote-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = '↑ ↓ ← → للتنقل   •   OK للاختيار   •   BACK للرجوع';
    document.body.appendChild(hint);
    try { window.sessionStorage.setItem(HINT_KEY, '1'); } catch (e) {}
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(function () { hint.classList.add('is-gone'); }, 6000);
  }

  function clickTarget(target) {
    if (!target || isEditable(target)) return false;
    if (typeof target.click === 'function') {
      target.click();
      return true;
    }
    return false;
  }

  function toggleMediaPlayback() {
    var toggle = document.getElementById('play-toggle') || document.getElementById('big-play');
    if (toggle) { toggle.click(); return true; }
    var video = document.querySelector('video');
    if (video) {
      if (video.paused) { video.play().catch(function () {}); } else { video.pause(); }
      return true;
    }
    return false;
  }

  function onKeyDown(event) {
    var key = event.key || '';
    var code = event.keyCode || event.which || 0;
    var target = event.target || document.activeElement;

    // مفاتيح الرجوع عبر الشركات
    var back = key === 'Escape' || key === 'Esc' || key === 'BrowserBack' || key === 'GoBack' ||
      key === 'Back' || code === 4 || code === 8 || code === 27 || code === 166 || code === 461 || code === 10009;
    if (back) {
      if (isEditable(target) && (key === 'Backspace' || code === 8)) return; // لا تمسح الكتابة
      if (event.repeat) return;
      event.preventDefault();
      event.stopPropagation();
      if (isEditable(target) && !topLayer()) { target.blur(); return; }
      goBack();
      return;
    }

    var direction =
      key === 'ArrowUp' || key === 'Up' || code === 38 ? 'up' :
      key === 'ArrowDown' || key === 'Down' || code === 40 ? 'down' :
      key === 'ArrowLeft' || key === 'Left' || code === 37 ? 'left' :
      key === 'ArrowRight' || key === 'Right' || code === 39 ? 'right' : '';

    if (direction) {
      if (isEditable(target)) {
        var tag = tagName(target);
        var type = (target.getAttribute('type') || 'text').toLowerCase();
        if (tag === 'select') {
          // أعلى/أسفل تخرج من القائمة؛ يمين/يسار للاختيار داخل القائمة
          if (direction === 'up' || direction === 'down') { event.preventDefault(); move(direction); }
          return;
        }
        if (type === 'range' || type === 'number' || type === 'date' || type === 'time') return;
        // داخل حقول النص: الأسهم الأفقية للكتابة، والرأسية للتنقل بين الحقول
        if (direction === 'left' || direction === 'right') return;
      }
      event.preventDefault();
      event.stopPropagation();
      move(direction);
      return;
    }

    var ok = key === 'Enter' || key === 'OK' || key === 'Select' || key === 'Accept' || key === 'NumpadEnter' ||
      code === 13 || code === 23 || code === 66;
    if (ok) {
      if (isEditable(target)) {
        if (tagName(target) === 'input' && (target.getAttribute('type') || 'text') !== 'search') return;
        if (tagName(target) === 'textarea') return;
        if (tagName(target) === 'select') return;
      }
      if (event.repeat) return;
      if (clickTarget(target)) { event.preventDefault(); event.stopPropagation(); }
      return;
    }

    var playPause = key === 'MediaPlayPause' || key === 'Play' || key === 'Pause' || code === 179 || code === 415 || code === 19 || code === 10252;
    if (playPause) {
      if (toggleMediaPlayback()) { event.preventDefault(); event.stopPropagation(); }
      return;
    }

    if ((key === 'GoHome' || key === 'Home' || code === 172) && (location.pathname || '').indexOf('index.html') === -1 && location.pathname !== '/') {
      event.preventDefault();
      location.href = './index.html';
    }
  }

  document.addEventListener('focusin', function (event) {
    if (event.target && event.target !== document.body) {
      clearFocusClasses();
      if (event.target.classList) event.target.classList.add('vortex-focused');
      remember(event.target);
    }
  }, true);

  document.addEventListener('focusout', function (event) {
    if (event.target && event.target.classList) event.target.classList.remove('vortex-focused');
  }, true);

  document.addEventListener('keydown', onKeyDown, true);

  document.addEventListener('mousedown', function () { pointerMode = true; }, true);
  document.addEventListener('touchstart', function () { pointerMode = true; }, { passive: true, capture: true });
  document.addEventListener('click', function (event) {
    var el = event.target && event.target.closest ? event.target.closest(SELECTOR) : null;
    if (el) remember(el);
  }, true);

  window.addEventListener('pageshow', function () { window.setTimeout(function () { if (!pointerMode) restoreOrStart(); }, 220); });

  if (tvUA) {
    root.classList.add('vortex-tv-mode', 'vortex-remote-mode');
    try { window.localStorage.setItem('lammet-tv-mode-v1', '1'); } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      restoreOrStart();
      if (tvUA || !pointerMode) showHint();
    });
  } else {
    restoreOrStart();
    if (tvUA || !pointerMode) showHint();
  }

  // استعادة التركيز بعد تحميل المحتوى غير المتزامن (Firebase)
  var restoreTimer = 0;
  if ('MutationObserver' in window) {
    var observer = new MutationObserver(function () {
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(function () {
        syncLayerFocus();
        var active = document.activeElement;
        if (!active || active === document.body || active === root || !isVisible(active)) {
          if (!pointerMode) restoreOrStart();
        }
      }, 180);
    });
    var observeOptions = { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'open', 'hidden', 'aria-hidden'] };
    if (document.body) observer.observe(document.body, observeOptions);
    else document.addEventListener('DOMContentLoaded', function () { observer.observe(document.body, observeOptions); });
  }

  window.VortexRemote = {
    move: move,
    focus: focus,
    goBack: goBack,
    closeLayer: closeLayer,
    isTV: function () { return tvUA; },
    refresh: function () { syncLayerFocus(); restoreOrStart(); }
  };
}(window, document));
