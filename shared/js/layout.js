/**
 * AdsInsight Pro - Shared Navigation Sidebar Component
 * Tự động tạo và quản lý Sidebar thống nhất trên toàn bộ các trang
 */

(function () {
  'use strict';

  // Định nghĩa danh sách các module trung tâm
  const NAV_ITEMS = [
    {
      id: 'home',
      name: 'Trang Chủ Hub',
      path: 'index.html',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
    },
    {
      id: 'search-terms',
      name: 'Lọc Cụm Từ Tìm Kiếm',
      path: 'loc-cum-tu-tim-kiem/index.html',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`
    },
    {
      id: 'affiliate-upload',
      name: 'Nạp Báo Cáo Affiliate',
      path: 'nap-bao-cao-affiliate/index.html',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`
    },
    {
      id: 'shopee-analytics',
      name: 'Phân Tích Sản Phẩm Shopee',
      path: 'phan-tich-san-pham-shopee/index.html',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
    },
    {
      id: 'profit-tracker',
      name: 'Theo Dõi Lời Lãi',
      path: 'theo-doi-loi-nhuan/index.html',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
    }
  ];

  function renderSharedSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Chuẩn hóa đường dẫn pathname (chuyển backslash sang forward slash nếu mở qua file://)
    const rawPath = window.location.pathname.replace(/\\/g, '/');
    const pathParts = rawPath.split('/').filter(Boolean);
    const lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';

    // Nhận diện xem trang hiện tại có đang nằm trong thư mục con của 4 module hay không
    const KNOWN_MODULES = [
      'loc-cum-tu-tim-kiem',
      'nap-bao-cao-affiliate',
      'phan-tich-san-pham-shopee',
      'theo-doi-loi-nhuan'
    ];

    const currentModule = KNOWN_MODULES.find(m => rawPath.includes('/' + m + '/') || rawPath.endsWith('/' + m));
    const isSubFolder = Boolean(currentModule);
    const prefix = isSubFolder ? '../' : './';

    // Tạo HTML các nav items
    const navItemsHtml = NAV_ITEMS.map(item => {
      let targetHref = prefix + item.path;

      // Xác định trạng thái active
      let isActive = false;
      if (item.id === 'home') {
        isActive = !isSubFolder;
      } else {
        isActive = (currentModule === item.path.split('/')[0]);
      }

      return `
        <a href="${targetHref}" class="nav-item ${isActive ? 'active' : ''}" style="text-decoration: none;">
          ${item.icon}
          <span>${item.name}</span>
        </a>
      `;
    }).join('');

    // Inject toàn bộ cấu trúc Sidebar chuẩn
    sidebar.innerHTML = `
      <div class="brand">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div class="brand-text">
          <h2>AdsInsight<span class="pro-badge">PRO</span></h2>
          <p>Google Ads Analytics Hub</p>
        </div>
        <button type="button" class="sidebar-toggle-btn" id="btnToggleSidebar" title="Thu gọn / Mở rộng thanh điều hướng">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav class="nav-menu">
        ${navItemsHtml}
      </nav>

      <div class="sidebar-footer">
        <div class="status-card">
          <div class="pulse-indicator"></div>
          <div>
            <div class="text-sm font-semibold">100% Offline & Bảo mật</div>
            <div class="text-xs text-muted">Dữ liệu xử lý trên trình duyệt của bạn</div>
          </div>
        </div>
      </div>
    `;

    // Gọi lại controller toggle để bind sự kiện click
    if (window.initSidebarToggleEvent) {
      window.initSidebarToggleEvent();
    }
  }

  // Khởi chạy ngay khi DOM đã load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSharedSidebar);
  } else {
    renderSharedSidebar();
  }
})();

