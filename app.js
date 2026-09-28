(function () {
  var lang = document.documentElement.lang || 'fr';
  var T = {
    fr: { prev: 'Mois précédent', next: 'Mois suivant', free: 'Libre', busy: 'Réservé', pick: 'Vos dates' },
    en: { prev: 'Previous month', next: 'Next month', free: 'Available', busy: 'Booked', pick: 'Your dates' }
  }[lang] || {};

  /* 1. L'ogive s'ouvre au défilement */
  var portal = document.querySelector('.portal');
  var stage = document.querySelector('.portal-stage');
  var header = document.querySelector('header');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function onScroll() {
    if (!portal) return;
    var r = portal.getBoundingClientRect();
    var total = portal.offsetHeight - window.innerHeight;
    var p = reduce ? 1 : Math.min(1, Math.max(0, -r.top / (total * 0.8)));
    stage.style.setProperty('--p', p.toFixed(4));
    if (header) header.classList.toggle('on-dark', r.bottom > 72);
  }
  /* La visite : défilement horizontal */
  var tour = document.querySelector('.tour'), track = document.querySelector('.tour-track'), bar = document.querySelector('.tour-bar i');
  function onTour() {
    if (!tour) return;
    if (reduce || window.innerWidth <= 720) { track.style.transform = ''; return; }
    var r = tour.getBoundingClientRect();
    var total = tour.offsetHeight - window.innerHeight;
    var tp = Math.min(1, Math.max(0, -r.top / total));
    var dist = track.scrollWidth - window.innerWidth;
    track.style.transform = 'translateX(' + (-tp * dist).toFixed(1) + 'px)';
    if (bar) bar.style.width = (tp * 100).toFixed(2) + '%';
  }
  window.addEventListener('scroll', function () { requestAnimationFrame(onTour); }, { passive: true });
  window.addEventListener('resize', onTour);
  onTour();

  if (portal) {
    window.addEventListener('scroll', function () { requestAnimationFrame(onScroll); }, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* 2. Galerie */
  var buttons = document.querySelectorAll('.gallery button');
  var lb = document.getElementById('lb');
  if (lb && buttons.length) {
    var im = document.getElementById('lb-img'), cap = document.getElementById('lb-cap'), cur = 0;
    var photos = Array.prototype.map.call(buttons, function (b) {
      var i = b.querySelector('img');
      return [i.getAttribute('src'), i.getAttribute('alt')];
    });
    var show = function (i) {
      cur = (i + photos.length) % photos.length;
      im.src = photos[cur][0]; im.alt = photos[cur][1]; cap.textContent = photos[cur][1];
    };
    buttons.forEach(function (b, i) { b.addEventListener('click', function () { show(i); lb.showModal(); }); });
    document.getElementById('lb-prev').onclick = function () { show(cur - 1); };
    document.getElementById('lb-next').onclick = function () { show(cur + 1); };
    document.getElementById('lb-close').onclick = function () { lb.close(); };
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
  }

  /* 3. Dates du formulaire */
  var a = document.getElementById('arrivee'), d = document.getElementById('depart');
  function iso(dt) { var t = new Date(dt); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); }
  function addDays(s, n) { var t = new Date(s + 'T12:00:00'); t.setDate(t.getDate() + n); return iso(t); }
  var today = iso(new Date());
  var MIN = 2; // nuits minimum (règle Airbnb)
  var first = addDays(today, 1); // réservation au plus tard la veille
  var lastD = new Date(); lastD.setMonth(lastD.getMonth() + 9); var last = iso(lastD); // 9 mois à l'avance
  if (a && d) {
    a.min = first; a.max = last; d.min = addDays(first, MIN); d.max = addDays(last, 30);
    a.addEventListener('change', function () {
      if (!a.value) return;
      d.min = addDays(a.value, MIN);
      if (d.value && d.value < d.min) d.value = d.min;
      render();
    });
    d.addEventListener('change', render);
  }

  /* 4. Calendrier des disponibilités (lu depuis Airbnb via la fonction Netlify) */
  var cal = document.getElementById('cal');
  var busy = {}; var offset = 0;
  // en fin de mois, ouvrir directement sur le mois suivant
  (function () { var f = new Date(first + 'T12:00:00'); var dim = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate(); if (dim - f.getDate() < 7) offset = 1; })();
  function isBusy(s) { return !!busy[s]; }
  function rangeFree(s, e) { for (var x = s; x < e; x = addDays(x, 1)) if (isBusy(x)) return false; return true; }
  function render() {
    if (!cal || cal.hidden) return;
    var wrap = cal.querySelector('.cal-months'); wrap.innerHTML = '';
    var base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset);
    var fmtM = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' });
    var fmtW = new Intl.DateTimeFormat(lang, { weekday: 'narrow' });
    for (var k = 0; k < 2; k++) {
      var m = new Date(base.getFullYear(), base.getMonth() + k, 1);
      var box = document.createElement('div'); box.className = 'm';
      var h = document.createElement('h4'); h.textContent = fmtM.format(m); box.appendChild(h);
      var g = document.createElement('div'); g.className = 'g';
      for (var w = 0; w < 7; w++) { var wd = document.createElement('span'); wd.className = 'wd'; wd.textContent = fmtW.format(new Date(2024, 0, 1 + w)); g.appendChild(wd); }
      var lead = (m.getDay() + 6) % 7;
      for (var e = 0; e < lead; e++) g.appendChild(document.createElement('span'));
      var days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (var day = 1; day <= days; day++) {
        var s = iso(new Date(m.getFullYear(), m.getMonth(), day, 12));
        var b = document.createElement('button'); b.type = 'button'; b.textContent = day; b.dataset.d = s;
        var past = s < first || s > last && !(a.value && !d.value);
        var tooShort = a.value && !d.value && s > a.value && s < addDays(a.value, MIN);
        // un jour réservé peut quand même servir de jour de départ
        var canBeDeparture = a.value && !d.value && s >= addDays(a.value, MIN) && rangeFree(a.value, s);
        b.disabled = past || tooShort || (isBusy(s) && !canBeDeparture);
        if (a.value && s === a.value || d.value && s === d.value) b.className = 'sel';
        if (past) b.classList.add('past');
        else if (a.value && d.value && s > a.value && s < d.value) b.className = 'in';
        b.setAttribute('aria-label', s + (isBusy(s) ? ' – ' + T.busy : ''));
        g.appendChild(b);
      }
      box.appendChild(g); wrap.appendChild(box);
    }
  }
  if (cal) {
    cal.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-d]'); if (!b) return;
      var s = b.dataset.d;
      if (!a.value || d.value || s < addDays(a.value, MIN) || !rangeFree(a.value, s)) { a.value = s; d.value = ''; d.min = addDays(s, MIN); }
      else { d.value = s; }
      render();
    });
    cal.querySelector('.prev').onclick = function () { if (offset > 0) { offset--; render(); } };
    cal.querySelector('.next').onclick = function () { if (offset < 8) { offset++; render(); } };
    fetch('/.netlify/functions/dispo')
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) {
        (j.busy || []).forEach(function (r) { for (var x = r[0]; x < r[1]; x = addDays(x, 1)) busy[x] = 1; });
        cal.hidden = false; render();
      })
      .catch(function () { /* fonction non activée : le formulaire fonctionne sans calendrier */ });
  }

  /* En-tête : transparent sur la photo d'accueil, blanc ensuite */
  var hero = document.querySelector('.hero');
  function onHeader() { if (header && hero) header.classList.toggle('solid', window.scrollY > hero.offsetHeight - 100); }
  window.addEventListener('scroll', onHeader, { passive: true }); onHeader();

  /* Diaporama d'accueil */
  var slides = document.querySelectorAll('.slides img');
  if (slides.length > 1 && !reduce) {
    var si = 0;
    setInterval(function () {
      slides[si].classList.remove('on');
      si = (si + 1) % slides.length;
      var s = slides[si]; s.loading = 'eager';
      s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
      s.classList.add('on');
    }, 6500);
  }

  /* Barre de réservation de l'accueil */
  var bb = document.getElementById('bookbar');
  if (bb && a && d) {
    var bi = document.getElementById('bb-in'), bo = document.getElementById('bb-out'), bg = document.getElementById('bb-g');
    bi.min = a.min; bi.max = a.max; bo.min = d.min;
    bi.addEventListener('change', function () { if (bi.value) { bo.min = addDays(bi.value, MIN); if (!bo.value || bo.value < bo.min) bo.value = bo.min; } });
    bb.addEventListener('submit', function (e) {
      e.preventDefault();
      a.value = bi.value; d.value = bo.value;
      var ad = document.getElementById('adultes'); if (ad) ad.value = bg.value;
      if (a.value) { var t = new Date(a.value + 'T12:00:00'), n = new Date(); offset = Math.max(0, (t.getFullYear() - n.getFullYear()) * 12 + t.getMonth() - n.getMonth()); }
      render();
      document.getElementById('reserver').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* Envoi du formulaire : d'abord notre fonction (Resend, e-mails + confirmation client),
     sinon Web3Forms en secours pour ne jamais perdre une demande */
  var form = document.getElementById('booking');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]'), msg = form.querySelector('.form-msg');
      var fd = new FormData(form);
      var svc = fd.getAll('services');
      var data = {
        langue: fd.get('langue'), arrivee: fd.get('arrivee'), depart: fd.get('depart'),
        adultes: fd.get('adultes'), enfants: fd.get('enfants'), nom: fd.get('nom'),
        telephone: fd.get('telephone'), email: fd.get('email'), message: fd.get('message'),
        services: svc, botcheck: fd.get('botcheck') ? 1 : 0
      };
      var ok = function () { location.href = form.dataset.thanks; };
      var fail = function () { btn.disabled = false; msg.textContent = form.dataset.err; };
      var viaWeb3 = function () {
        var f = function (s) { return s ? s.split('-').reverse().join('/') : ''; };
        fd.delete('services'); if (svc.length) fd.append('services', svc.join(', '));
        fd.delete('consentement'); fd.delete('redirect');
        fd.set('subject', 'Demande de réservation La Chapelle – ' + f(data.arrivee) + ' au ' + f(data.depart) + ' – ' + (data.nom || ''));
        fd.set('replyto', data.email || '');
        return fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: fd })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (j.success) ok(); else throw 0; });
      };
      btn.disabled = true; msg.textContent = '';
      fetch('/.netlify/functions/reservation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) {
          if (r.ok) return ok();
          if (r.status === 400) throw 0;      // données invalides : inutile de réessayer ailleurs
          return viaWeb3();                   // fonction non configurée ou indisponible
        })
        .catch(function (err) { if (err === 0) return fail(); return viaWeb3().catch(fail); });
    });
  }
})();
