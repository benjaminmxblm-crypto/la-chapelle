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
})();
