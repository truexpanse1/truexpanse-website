// TrueXpanse Nav — hamburger + dropdown
(function () {
  function toggleMenu() {
    var links = document.querySelector('.nav-links');
    var open = links.classList.toggle('mobile-open');
    if (open) {
      links.style.display = 'flex';
      links.style.flexDirection = 'column';
      links.style.position = 'absolute';
      links.style.top = '68px';
      links.style.left = '0';
      links.style.right = '0';
      links.style.background = 'var(--white)';
      links.style.padding = '1rem 1.25rem 1.5rem';
      links.style.borderBottom = '1px solid var(--border)';
      links.style.zIndex = '999';
      links.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      links.style.gap = '0.25rem';
    } else {
      links.style.display = '';
      links.classList.remove('mobile-open');
    }
  }

  // expose for onclick
  window.toggleMenu = toggleMenu;

  // Dropdown: toggle on click (mobile), hover handled by CSS (desktop)
  document.addEventListener('DOMContentLoaded', function () {
    var triggers = document.querySelectorAll('.dropdown-trigger');
    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        var parent = this.closest('.has-dropdown');
        var wasOpen = parent.classList.contains('open');
        // close all dropdowns
        document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
          el.classList.remove('open');
        });
        if (!wasOpen) parent.classList.add('open');
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.has-dropdown')) {
        document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
          el.classList.remove('open');
        });
      }
    });
  });
})();
