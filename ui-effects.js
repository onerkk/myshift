/* Presentation-only interactions. No account, weather, or payroll data is changed. */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastScreen = null;
  let scheduled = false;
  let lightFrame = 0;
  function motionOff() { return reduceMotion.matches || document.documentElement.classList.contains('ui-still'); }
  function sync() {
    scheduled = false;
    const visualOff = typeof window.anyVisualFxEnabled === 'function' && !window.anyVisualFxEnabled();
    document.documentElement.classList.toggle('ui-still', reduceMotion.matches || visualOff);
    const shell = document.querySelector('.app-shell[data-screen]');
    if (!shell) return;
    const screen = shell.dataset.screen;
    if (screen !== lastScreen) {
      const main = shell.querySelector('.app-main');
      if (main && !motionOff()) {
        main.classList.add('ui-enter');
        window.setTimeout(() => main.classList.remove('ui-enter'), 750);
      }
      lastScreen = screen;
    }
  }
  const app = document.getElementById('app');
  if (app) new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }).observe(app, { childList: true, subtree: true });
  sync();

  document.addEventListener('pointerdown', event => {
    if (motionOff() || (event.button !== undefined && event.button !== 0)) return;
    const button = event.target.closest('.bottom-nav-item,.insight-row,.settings-row,.schedule-day,.day');
    if (!button || button.disabled) return;
    const box = button.getBoundingClientRect();
    const size = Math.max(box.width, box.height) * 1.6;
    const ripple = document.createElement('span');
    ripple.className = 'ui-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    Object.assign(ripple.style, {
      width: size + 'px', height: size + 'px',
      left: event.clientX - box.left - size / 2 + 'px',
      top: event.clientY - box.top - size / 2 + 'px'
    });
    // Only the ripple is clipped; raised icons and holiday rails retain their edges.
    if (getComputedStyle(button).position === 'static') button.style.position = 'relative';
    const clip = document.createElement('span');
    clip.className = 'ui-ripple-clip';
    clip.setAttribute('aria-hidden', 'true');
    clip.appendChild(ripple);
    button.appendChild(clip);
    window.setTimeout(() => clip.remove(), 500);
  }, { passive: true });

  document.addEventListener('pointermove', event => {
    if (motionOff() || event.pointerType !== 'mouse' || lightFrame) return;
    const card = event.target.closest('[data-depth]');
    if (!card) return;
    lightFrame = requestAnimationFrame(() => {
      lightFrame = 0;
      if (!card.isConnected) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--light-x', ((event.clientX-r.left)/r.width*100).toFixed(1)+'%');
      card.style.setProperty('--light-y', ((event.clientY-r.top)/r.height*100).toFixed(1)+'%');
    });
  }, { passive: true });
})();
