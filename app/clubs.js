// Legacy placeholder for dataset (moved)
// The dataset is now loaded via /assets/data/rk7a9nq3.js which hydrates window.* from a base64 file.
// This stub exists to avoid 404s from old links or tooling. It dynamically loads the new script once.
(function(){
  if (typeof window === 'undefined') return;
  if (window.__CLUBS_STUB_LOADED__) return;
  window.__CLUBS_STUB_LOADED__ = true;
  if (!window.allClubs) {
    try {
      var s = document.createElement('script');
      s.src = '/assets/data/rk7a9nq3.js';
      s.async = true;
      document.head.appendChild(s);
    } catch (e) { /* ignore */ }
  }
})();

