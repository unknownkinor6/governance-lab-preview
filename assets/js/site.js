/* The Governance Lab: small progressive enhancements. Everything works without this file. */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  doc.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* header: solid once the page scrolls */
  var header = $('[data-header]');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    updateSticky();
  }

  /* mobile menu */
  var toggle = $('.menu-toggle');
  var menu = $('#mobile-menu');
  function setMenu(open, fromKeyboard) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.label').textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('menu-open', open);
    if (open) {
      // start the list just below the header, wherever it sits (the draft bar can push it down)
      var hb = header ? header.getBoundingClientRect().bottom : 76;
      menu.style.paddingTop = Math.round(Math.max(hb, 0) + 20) + 'px';
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      var first = menu.querySelector('a');
      if (first && fromKeyboard) setTimeout(function () { first.focus(); }, 60);
    } else {
      menu.classList.remove('is-open');
      setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 360);
    }
  }
  if (toggle && menu) {
    // e.detail is 0 when the button is pressed with Enter or Space
    toggle.addEventListener('click', function (e) { setMenu(toggle.getAttribute('aria-expanded') !== 'true', e.detail === 0); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a, button', menu).concat([toggle]);
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1200) setMenu(false); });
  }

  /* sticky "Discuss your needs" on small screens */
  var sticky = $('.sticky-cta');
  var footer = $('.site-footer');
  var footerVisible = false;
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { footerVisible = en[0].isIntersecting; updateSticky(); }, { threshold: 0 }).observe(footer);
  }
  function updateSticky() {
    if (!sticky) return;
    var show = window.scrollY > Math.min(560, window.innerHeight * 0.75) && !footerVisible && !document.body.classList.contains('menu-open');
    sticky.classList.toggle('is-visible', show);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* split hero heading lines into words for a staggered reveal */
  $$('.reveal-words').forEach(function (h) {
    if (reduce) return;
    var i = 0;
    $$('.line', h).forEach(function (line) {
      var nodes = Array.prototype.slice.call(line.childNodes);
      line.textContent = '';
      nodes.forEach(function (n) {
        var isEl = n.nodeType === 1;
        var text = isEl ? n.textContent : n.textContent;
        text.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { line.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'w';
          w.style.animationDelay = (0.08 + i * 0.06) + 's';
          i++;
          if (isEl) { var em = n.cloneNode(false); em.textContent = part; w.appendChild(em); }
          else w.textContent = part;
          line.appendChild(w);
        });
      });
    });
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
  });

  /* reveal on scroll */
  var revealables = $$('[data-reveal], .process');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el, idx) {
      var d = el.getAttribute('data-reveal-delay');
      if (d) el.style.transitionDelay = d + 'ms';
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* hero cards: gentle pointer parallax on desktop */
  var hv = $('.hv-panel');
  if (hv && !reduce && window.matchMedia('(pointer: fine)').matches) {
    var cards = $$('.hv-card', hv);
    hv.parentElement.addEventListener('pointermove', function (e) {
      var r = hv.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cards.forEach(function (c, k) {
        var depth = k === 0 ? 10 : 16;
        c.style.translate = (x * depth).toFixed(1) + 'px ' + (y * depth).toFixed(1) + 'px';
      });
    });
    hv.parentElement.addEventListener('pointerleave', function () { cards.forEach(function (c) { c.style.translate = ''; }); });
  }

  /* tabs (document previews, product gallery) */
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function select(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowLeft' || k === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') n = tabs[0];
        if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* services index: highlight the section in view */
  var idxLinks = $$('.svc-index a');
  if (idxLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    idxLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          idxLinks.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
          var a = map[e.target.id];
          if (a) { a.classList.add('is-active'); a.setAttribute('aria-current', 'true'); }
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    $$('.svc[id]').forEach(function (s) { sio.observe(s); });
  }

  /* insights topic filter */
  var filterBar = $('[data-filters]');
  if (filterBar) {
    var buttons = $$('button', filterBar);
    var posts = $$('[data-topic]');
    var status = $('[data-filter-status]');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var t = b.getAttribute('data-filter');
        var shown = 0;
        posts.forEach(function (p) {
          var ok = t === 'all' || p.getAttribute('data-topic').split(' ').indexOf(t) >= 0;
          p.classList.toggle('is-hidden', !ok);
          if (ok) shown++;
        });
        if (status) status.textContent = shown + (shown === 1 ? ' item' : ' items') + ' shown';
      });
    });
  }

  /* contact form: validation, then a success message.
     While data-endpoint is empty (review draft) nothing is sent anywhere. */
  var form = $('form[data-contact]');
  if (form) {
    // ?area=... (from "Register interest" and service links) pre-selects the area of interest
    try {
      var area = new URLSearchParams(location.search).get('area');
      var sel = $('select[name="area"]', form);
      if (area && sel && $('option[value="' + area.replace(/[^a-z-]/g, '') + '"]', sel)) sel.value = area;
    } catch (err) { /* old browsers: leave the default */ }
    form.setAttribute('novalidate', '');
    var success = $('.form-success');
    function check(field) {
      var input = $('input, select, textarea', field);
      if (!input) return true;
      var ok = input.checkValidity();
      field.classList.toggle('has-error', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    }
    $$('.field', form).forEach(function (f) {
      var input = $('input, select, textarea', f);
      if (input) input.addEventListener('blur', function () { if (f.classList.contains('has-error') || input.value) check(f); });
    });
    form.addEventListener('submit', function (e) {
      var fields = $$('.field', form);
      var bad = fields.filter(function (f) { return !check(f); });
      var hp = $('.hp input', form);
      if (bad.length) {
        e.preventDefault();
        var first = $('input, select, textarea', bad[0]);
        if (first) first.focus();
        return;
      }
      if (hp && hp.value) { e.preventDefault(); return; }
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        e.preventDefault();
        form.hidden = true;
        if (success) { success.classList.add('is-shown'); success.setAttribute('tabindex', '-1'); success.focus(); }
      }
    });
  }

  /* current year */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
