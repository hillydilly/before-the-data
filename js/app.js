/* === Before The Data — Shared App Logic === */

// Highlight active nav link
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page) {
    document.querySelectorAll('[data-page]').forEach(a => {
      if (a.dataset.page === page) a.classList.add('active');
    });
  }
});
