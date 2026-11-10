// =========================================================================
// SHARED SIDEBAR COLLAPSE CONTROLLER
// Quản lý việc thu gọn / mở rộng thanh menu sidebar dùng chung cho toàn bộ web
// =========================================================================

(function() {
  function getSafeStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setSafeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Ignored if storage is blocked by tracking prevention
    }
  }

  function initSidebarCollapse() {
    const sidebar = document.querySelector('.sidebar');
    const btnToggle = document.getElementById('btnToggleSidebar');
    if (!sidebar) return;

    // Phục hồi trạng thái đã lưu
    const isCollapsed = getSafeStorage('sidebar_collapsed') === 'true';
    if (isCollapsed) {
      sidebar.classList.add('collapsed');
      if (btnToggle) {
        btnToggle.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
        `;
      }
    }

    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const nowCollapsed = sidebar.classList.contains('collapsed');
        setSafeStorage('sidebar_collapsed', nowCollapsed);

        if (nowCollapsed) {
          btnToggle.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
            </svg>
          `;
        } else {
          btnToggle.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
            </svg>
          `;
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarCollapse);
  } else {
    initSidebarCollapse();
  }
})();

