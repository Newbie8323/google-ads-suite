// =========================================================================
// SHARED SIDEBAR COLLAPSE & THEME CONTROLLER
// Quản lý việc thu gọn/mở rộng thanh menu sidebar và Chế độ Giao diện Sáng/Tối
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

  // 1. Thực thi ngay lập tức để gắn class lên <html> ngăn chặn FOUC/giật animation
  const isCollapsed = getSafeStorage('sidebar_collapsed') === 'true';
  if (isCollapsed) {
    document.documentElement.classList.add('sidebar-is-collapsed');
  }

  // Khôi phục theme đã lưu (mặc định dark nếu chưa lưu)
  const savedTheme = getSafeStorage('app_theme') || 'dark';
  function applyThemeClass(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      if (document.body) {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      }
    } else {
      document.documentElement.classList.remove('light-theme');
      document.documentElement.classList.add('dark-theme');
      if (document.body) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
      }
    }
  }
  applyThemeClass(savedTheme);

  // Cập nhật icon trên nút đổi theme
  function updateThemeButtonUI(theme) {
    const btnTheme = document.getElementById('btnToggleTheme');
    if (!btnTheme) return;
    const sunIcon = btnTheme.querySelector('.sun-icon');
    const moonIcon = btnTheme.querySelector('.moon-icon');
    if (theme === 'light') {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
      btnTheme.title = 'Chuyển sang giao diện Tối (Ctrl + Shift + D)';
    } else {
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
      btnTheme.title = 'Chuyển sang giao diện Sáng (Ctrl + Shift + D)';
    }
  }

  // Bật lại transition mượt mà sau khi trang đã render xong trạng thái ban đầu
  window.initSidebarToggleEvent = function() {
    const sidebar = document.querySelector('.sidebar');
    const btnToggle = document.getElementById('btnToggleSidebar');
    const btnTheme = document.getElementById('btnToggleTheme');
    if (!sidebar) return;

    // Đồng bộ theme lên body khi body đã sẵn sàng
    const currentTheme = getSafeStorage('app_theme') || 'dark';
    applyThemeClass(currentTheme);
    updateThemeButtonUI(currentTheme);

    if (btnTheme && !btnTheme.dataset.bound) {
      btnTheme.dataset.bound = 'true';
      btnTheme.addEventListener('click', () => {
        const activeIsLight = document.documentElement.classList.contains('light-theme');
        const nextTheme = activeIsLight ? 'dark' : 'light';
        setSafeStorage('app_theme', nextTheme);
        applyThemeClass(nextTheme);
        updateThemeButtonUI(nextTheme);

        // Kích hoạt custom event để các component vẽ biểu đồ (Chart.js) có thể vẽ lại màu phù hợp
        window.dispatchEvent(new CustomEvent('appThemeChanged', { detail: { theme: nextTheme } }));
      });
    }

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

    requestAnimationFrame(() => {
      document.documentElement.classList.remove('sidebar-is-collapsed');
    });

    if (btnToggle && !btnToggle.dataset.bound) {
      btnToggle.dataset.bound = 'true';
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

      // Lắng nghe phím tắt tiện ích:
      // Ctrl + B hoặc phím '[': thu gọn/mở rộng sidebar
      // Ctrl + Shift + D hoặc 'T' (khi không focus input): chuyển theme Sáng / Tối
      if (!window.__sidebarShortcutBound) {
        window.__sidebarShortcutBound = true;
        document.addEventListener('keydown', (e) => {
          // Tránh kích hoạt khi người dùng đang gõ phím trong ô input hoặc textarea
          const tag = e.target.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

          if ((e.ctrlKey && e.key.toLowerCase() === 'b') || e.key === '[') {
            e.preventDefault();
            btnToggle.click();
          } else if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd')) {
            e.preventDefault();
            if (btnTheme) btnTheme.click();
          }
        });
      }
    }
  };

  function initSidebarCollapse() {
    window.initSidebarToggleEvent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarCollapse);
  } else {
    initSidebarCollapse();
  }
})();

