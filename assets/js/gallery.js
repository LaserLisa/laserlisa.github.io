/* Turns every <div class="gallery"> into a slider with arrows, and opens its
   images in a full-screen viewer with zoom. No changes to the HTML needed:
   just add or remove <figure> elements inside the gallery. */
(() => {
  const MAX_ZOOM = 8;
  const CLICK_ZOOM = 2.5;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function button(cls, label, text, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- Full-screen viewer ---------- */
  function createViewer() {
    const dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Image viewer');

    const stage = document.createElement('div');
    stage.className = 'lightbox-stage';
    const img = document.createElement('img');
    img.draggable = false;
    stage.append(img);

    const caption = document.createElement('p');
    caption.className = 'lightbox-caption';
    caption.setAttribute('aria-live', 'polite');

    const prev = button('gallery-arrow prev', 'Previous image', '‹', () => step(-1));
    const next = button('gallery-arrow next', 'Next image', '›', () => step(1));
    const zoomOut = button('', 'Zoom out', '−', () => zoomBy(1 / 1.5));
    const zoomReset = button('zoom-level', 'Reset zoom', '100%', reset);
    const zoomIn = button('', 'Zoom in', '+', () => zoomBy(1.5));
    const close = button('', 'Close', '×', () => dialog.close());
    const bar = document.createElement('div');
    bar.className = 'lightbox-bar';
    bar.append(zoomOut, zoomReset, zoomIn, close);

    dialog.append(stage, prev, next, bar, caption);
    document.body.append(dialog);

    let slides = [], index = 0;
    let scale = 1, x = 0, y = 0; // pan is measured from the centre of the stage

    function imageSize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      const nw = img.naturalWidth || w, nh = img.naturalHeight || h;
      const fit = Math.min(w / nw, h / nh);
      return { w, h, iw: nw * fit, ih: nh * fit };
    }

    function render() {
      const { w, h, iw, ih } = imageSize();
      const mx = Math.max(0, (iw * scale - w) / 2);
      const my = Math.max(0, (ih * scale - h) / 2);
      x = clamp(x, -mx, mx);
      y = clamp(y, -my, my);
      img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      stage.classList.toggle('zoomed', scale > 1);
      zoomReset.textContent = Math.round(scale * 100) + '%';
      zoomOut.disabled = scale <= 1;
      zoomIn.disabled = scale >= MAX_ZOOM;
    }

    function reset() { scale = 1; x = y = 0; render(); }

    // Zoom while keeping the point under (px, py) in place
    function zoomTo(target, px = 0, py = 0) {
      const s = clamp(target, 1, MAX_ZOOM);
      x = px - (px - x) * s / scale;
      y = py - (py - y) * s / scale;
      scale = s;
      render();
    }
    function zoomBy(factor, px, py) { zoomTo(scale * factor, px, py); }

    function show(i) {
      index = (i + slides.length) % slides.length;
      const { src, text } = slides[index];
      img.src = src;
      img.alt = text;
      caption.textContent = text +
        (slides.length > 1 ? ` (${index + 1} / ${slides.length})` : '');
      prev.hidden = next.hidden = slides.length < 2;
      reset();
    }
    function step(d) { if (slides.length > 1) show(index + d); }

    img.addEventListener('load', render);
    addEventListener('resize', () => { if (dialog.open) render(); });

    function fromCentre(e) {
      const r = stage.getBoundingClientRect();
      return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2];
    }
    function onImage([px, py]) {
      const { iw, ih } = imageSize();
      return Math.abs(px) <= iw / 2 && Math.abs(py) <= ih / 2;
    }

    stage.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 33 : 1);
      zoomBy(Math.exp(-clamp(delta, -150, 150) * 0.002), ...fromCentre(e));
    }, { passive: false });

    /* Drag to pan, pinch to zoom, swipe to change image */
    const pointers = new Map();
    let moved = false, pinched = false, startX = 0, startY = 0;

    stage.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      stage.setPointerCapture(e.pointerId);
      if (!pointers.size) {
        moved = pinched = false;
        startX = e.clientX; startY = e.clientY;
      }
      pointers.set(e.pointerId, fromCentre(e));
      if (pointers.size > 1) pinched = true;
    });

    stage.addEventListener('pointermove', e => {
      const old = pointers.get(e.pointerId);
      if (!old) return;
      const now = fromCentre(e);
      if (pointers.size === 1) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) moved = true;
        if (scale > 1 && moved) {
          x += now[0] - old[0];
          y += now[1] - old[1];
          render();
        }
      } else if (pointers.size === 2) {
        const other = [...pointers].find(([id]) => id !== e.pointerId)[1];
        const dist = p => Math.hypot(p[0] - other[0], p[1] - other[1]) || 1;
        x += (now[0] - old[0]) / 2;
        y += (now[1] - old[1]) / 2;
        zoomBy(dist(now) / dist(old), (now[0] + other[0]) / 2, (now[1] + other[1]) / 2);
      }
      pointers.set(e.pointerId, now);
    });

    stage.addEventListener('pointercancel', e => pointers.delete(e.pointerId));
    stage.addEventListener('pointerup', e => {
      if (!pointers.delete(e.pointerId) || pointers.size || pinched || !moved) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (scale === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    });

    /* Click the image to zoom in / back out; click beside it to close */
    stage.addEventListener('click', e => {
      if (moved || pinched) return;
      const p = fromCentre(e);
      if (scale > 1) reset();
      else if (onImage(p)) zoomTo(CLICK_ZOOM, ...p);
      else dialog.close();
    });

    dialog.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const actions = {
        ArrowLeft: () => step(-1),
        ArrowRight: () => step(1),
        '+': () => zoomBy(1.5),
        '=': () => zoomBy(1.5),
        '-': () => zoomBy(1 / 1.5),
        0: reset,
      };
      if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
    });
    dialog.addEventListener('close', () => pointers.clear());

    return (list, i) => {
      slides = list;
      dialog.showModal();
      show(i);
      close.focus();
    };
  }

  let openViewer;

  /* ---------- Slider ---------- */
  document.querySelectorAll('.gallery').forEach(track => {
    const figures = [...track.querySelectorAll('figure')];
    const slides = figures.map(f => {
      const img = f.querySelector('img');
      const text = f.querySelector('figcaption')?.textContent.trim() || img.alt;
      return { src: img.src, text };
    });

    figures.forEach((f, i) => {
      const img = f.querySelector('img');
      const open = button('gallery-open', `View full screen: ${slides[i].text}`, '', () => {
        openViewer ||= createViewer();
        openViewer(slides, i);
      });
      img.replaceWith(open);
      open.append(img);
    });

    const slider = document.createElement('div');
    slider.className = 'gallery-slider';
    track.replaceWith(slider);

    // Distance between two neighbouring slides, gap included
    const stride = () => figures.length > 1 ? figures[1].offsetLeft - figures[0].offsetLeft : 1;
    const slide = d => track.scrollTo({
      left: (Math.round(track.scrollLeft / stride()) + d) * stride(),
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
    const prev = button('gallery-arrow prev', 'Previous images', '‹', () => slide(-1));
    const next = button('gallery-arrow next', 'Next images', '›', () => slide(1));
    slider.append(track, prev, next);

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      prev.hidden = next.hidden = max < 2;
      prev.disabled = track.scrollLeft < 2;
      next.disabled = track.scrollLeft > max - 2;
    };
    track.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(track);
    update();
  });
})();
