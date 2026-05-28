/* ================================================================
   MOQUA — Main JavaScript
   Custom cursor · Three.js particles · Tilt · Reveal · Navbar
   ================================================================ */

// ----------------------------------------------------------------
// 1. CUSTOM CURSOR
// ----------------------------------------------------------------
(function initCursor() {
  const dot  = document.createElement('div'); dot.id  = 'cursor-dot';
  const ring = document.createElement('div'); ring.id = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = 0, my = 0;
  let rx = 0, ry = 0;

  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
  });

  // Smooth ring follow
  function animateRing() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Hover detection
  document.addEventListener('mouseover', e => {
    const el = e.target;
    const hoverable = el.closest('a, button, .btn, .feature-card, .api-table tr, .install-code i, .dot');
    document.body.classList.toggle('cursor-hover', !!hoverable);
  });
})();

// ----------------------------------------------------------------
// 2. NAVBAR SCROLL EFFECT
// ----------------------------------------------------------------
(function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const tick = () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', tick, { passive: true });
  tick();
})();

// ----------------------------------------------------------------
// 3. REVEAL ON SCROLL
// ----------------------------------------------------------------
(function initReveal() {
  const els = document.querySelectorAll(
    '.glass-card, .feature-card, .install-box, .api-group, .pricer-card, .reveal'
  );
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        // Add reveal class if not present
        if (!e.target.classList.contains('reveal')) {
          e.target.style.opacity = '';
          e.target.style.transform = '';
        }
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  els.forEach((el, i) => {
    if (!el.classList.contains('reveal')) {
      el.classList.add('reveal');
      // Stagger delay per group
      const delay = Math.min(i % 4 * 0.1, 0.3);
      el.style.transitionDelay = delay + 's';
    }
    io.observe(el);
  });
})();

// ----------------------------------------------------------------
// 4. 3D TILT CARDS
// ----------------------------------------------------------------
(function initTilt() {
  document.querySelectorAll('.feature-card, .pricer-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const x  = (e.clientX - r.left) / r.width  - 0.5;
      const y  = (e.clientY - r.top)  / r.height - 0.5;
      const rx = -y * 8;
      const ry =  x * 8;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

// ----------------------------------------------------------------
// 5. THREE.JS HERO PARTICLES
// ----------------------------------------------------------------
(function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  // Load Three.js from CDN
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
  script.onload = () => buildScene(canvas);
  document.head.appendChild(script);

  function buildScene(canvas) {
    const W = canvas.offsetWidth, H = canvas.offsetHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 5;

    // Particles
    const COUNT = 1800;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 12;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.03,
      transparent: true,
      opacity: 0.55,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    // Connecting lines (sparse mesh)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xd1d5db, transparent: true, opacity: 0.12 });
    for (let i = 0; i < 80; i++) {
      const lGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3((Math.random()-0.5)*12, (Math.random()-0.5)*12, (Math.random()-0.5)*12),
        new THREE.Vector3((Math.random()-0.5)*12, (Math.random()-0.5)*12, (Math.random()-0.5)*12),
      ]);
      scene.add(new THREE.Line(lGeo, lineMat));
    }

    // Mouse parallax
    let targetX = 0, targetY = 0;
    window.addEventListener('mousemove', e => {
      targetX = (e.clientX / window.innerWidth  - 0.5) * 0.6;
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    });

    // Resize
    const ro = new ResizeObserver(() => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas.parentElement);

    // Animate
    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.003;

      pts.rotation.y = t * 0.04 + targetX * 0.3;
      pts.rotation.x = t * 0.02 + targetY * 0.2;

      camera.position.x += (targetX * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (-targetY * 0.3 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }
    animate();
  }
})();

// ----------------------------------------------------------------
// 6. SMOOTH ANCHOR SCROLL
// ----------------------------------------------------------------
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const id = this.getAttribute('href');
    if (id === '#') return;
    const el = document.querySelector(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ----------------------------------------------------------------
// 7. MARKET PULSE CAROUSEL
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const API_KEY = 'd7h7g2pr01qhiu0aitcgd7h7g2pr01qhiu0aitd0';
  const API_URL = `https://finnhub.io/api/v1/news?category=general&token=${API_KEY}`;

  const carouselEl = document.getElementById('newsCarousel');
  const dotsEl     = document.getElementById('newsDots');
  const statusEl   = document.getElementById('status');
  if (!carouselEl) return;

  let newsData = [], currentSlide = 0, slideInterval = null;

  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  async function fetchNews() {
    try {
      const res  = await fetch(API_URL);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      newsData = (Array.isArray(data) ? data : [])
        .filter(i => i && i.headline && i.url && i.source)
        .slice(0, 10);
      if (!newsData.length) { if (statusEl) statusEl.textContent = 'No market news.'; return; }
      if (statusEl) statusEl.style.display = 'none';
      render(); start();
    } catch { if (statusEl) statusEl.textContent = 'Market Pulse unavailable.'; }
  }

  function render() {
    if (!newsData.length) return;
    const item = newsData[currentSlide];
    carouselEl.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener"><span>${esc(item.source)}:</span>${esc(item.headline)}</a>`;
    if (dotsEl) {
      dotsEl.innerHTML = newsData.map((_,i) => `<span class="dot${i===currentSlide?' active':''}" data-i="${i}"></span>`).join('');
      dotsEl.querySelectorAll('.dot').forEach(d => {
        d.addEventListener('click', e => { currentSlide = +e.target.dataset.i; render(); start(); });
      });
    }
  }
  function next()  { currentSlide = (currentSlide+1) % newsData.length; render(); }
  function start() { clearInterval(slideInterval); slideInterval = setInterval(next, 6000); }

  fetchNews();
  setInterval(fetchNews, 5 * 60 * 1000);
});

// ----------------------------------------------------------------
// 8. COPY TO CLIPBOARD
// ----------------------------------------------------------------
function copyCmd(text) {
  navigator.clipboard.writeText(text).then(() => {
    const icons = document.querySelectorAll('.install-code i');
    icons.forEach(ic => {
      if (ic.getAttribute('data-copy') === text) {
        ic.classList.replace('fa-copy', 'fa-check');
        setTimeout(() => ic.classList.replace('fa-check', 'fa-copy'), 1800);
      }
    });
  });
}
