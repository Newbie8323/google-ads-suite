// =========================================================================
// QUICK COMMAND PALETTE & GLOBAL KEYBOARD SHORTCUTS
// Kích hoạt bằng phím tắt: Ctrl + K (hoặc Cmd + K trên Mac)
// =========================================================================

(function() {
  const COMMANDS = [
    {
      id: 'nav-home',
      title: 'Về Trang Chủ Hub',
      category: 'Điều hướng',
      icon: '🏠',
      action: () => { window.location.href = window.location.pathname.includes('/') ? '../index.html' : 'index.html'; }
    },
    {
      id: 'nav-search-terms',
      title: 'Mở module: Lọc Cụm Từ Tìm Kiếm',
      category: 'Điều hướng',
      icon: '🔍',
      action: () => {
        if (window.location.pathname.includes('loc-cum-tu-tim-kiem')) return;
        window.location.href = window.location.pathname.includes('/') ? '../loc-cum-tu-tim-kiem/index.html' : 'loc-cum-tu-tim-kiem/index.html';
      }
    },
    {
      id: 'nav-affiliate',
      title: 'Mở module: Nạp Báo Cáo Affiliate',
      category: 'Điều hướng',
      icon: '📊',
      action: () => {
        if (window.location.pathname.includes('nap-bao-cao-affiliate')) return;
        window.location.href = window.location.pathname.includes('/') ? '../nap-bao-cao-affiliate/index.html' : 'nap-bao-cao-affiliate/index.html';
      }
    },
    {
      id: 'nav-shopee',
      title: 'Mở module: Phân Tích Sản Phẩm Shopee',
      category: 'Điều hướng',
      icon: '🛒',
      action: () => {
        if (window.location.pathname.includes('phan-tich-san-pham-shopee')) return;
        window.location.href = window.location.pathname.includes('/') ? '../phan-tich-san-pham-shopee/index.html' : 'phan-tich-san-pham-shopee/index.html';
      }
    },
    {
      id: 'act-toggle-sidebar',
      title: 'Thu gọn / Mở rộng thanh Menu Sidebar',
      category: 'Giao diện',
      icon: '📐',
      action: () => {
        const btn = document.getElementById('btnToggleSidebar');
        if (btn) btn.click();
      }
    },
    {
      id: 'act-sync-sheet',
      title: 'Đồng bộ Google Sheets ngay (Shopee)',
      category: 'Hành động',
      icon: '🔄',
      action: () => {
        const btn = document.getElementById('btnToolbarSyncSheet');
        if (btn) btn.click();
        else alert('Tính năng này nằm ở trang Phân Tích Shopee!');
      }
    },
    {
      id: 'act-focus-search',
      title: 'Tìm kiếm nhanh trong bảng hiện tại',
      category: 'Thao tác',
      icon: '🔎',
      action: () => {
        const input = document.getElementById('urlSearchFilter') || 
                      document.getElementById('shopeeSearchInput') || 
                      document.getElementById('stSearchInput');
        if (input) {
          input.focus();
          input.select();
        }
      }
    }
  ];

  function createModal() {
    const modalHtml = `
      <div id="cmdPaletteModal" class="cmd-palette-backdrop" style="display: none;">
        <div class="cmd-palette-container">
          <div class="cmd-palette-header">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input type="text" id="cmdPaletteInput" placeholder="Gõ lệnh hoặc tìm tính năng... (hoặc Esc để đóng)" autocomplete="off">
            <span class="cmd-badge">ESC</span>
          </div>
          <div class="cmd-palette-list" id="cmdPaletteList"></div>
          <div class="cmd-palette-footer">
            <span>Dùng <kbd>↑</kbd> <kbd>↓</kbd> để di chuyển</span>
            <span><kbd>Enter</kbd> để chọn</span>
            <span><kbd>Ctrl+K</kbd> để mở nhanh</span>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const backdrop = document.getElementById('cmdPaletteModal');
    const input = document.getElementById('cmdPaletteInput');
    const list = document.getElementById('cmdPaletteList');

    let selectedIndex = 0;
    let filteredCommands = [...COMMANDS];

    function renderList() {
      if (filteredCommands.length === 0) {
        list.innerHTML = `<div class="cmd-empty">Không tìm thấy lệnh hoặc trang nào</div>`;
        return;
      }
      let html = '';
      filteredCommands.forEach((cmd, idx) => {
        const isSel = idx === selectedIndex ? 'selected' : '';
        html += `
          <div class="cmd-item ${isSel}" data-index="${idx}">
            <span class="cmd-icon">${cmd.icon}</span>
            <div class="cmd-info">
              <div class="cmd-title">${cmd.title}</div>
              <div class="cmd-cat">${cmd.category}</div>
            </div>
          </div>
        `;
      });
      list.innerHTML = html;

      // Click event
      list.querySelectorAll('.cmd-item').forEach(el => {
        el.addEventListener('click', () => {
          const i = parseInt(el.dataset.index, 10);
          executeCommand(filteredCommands[i]);
        });
      });
    }

    function executeCommand(cmd) {
      if (!cmd) return;
      closePalette();
      cmd.action();
    }

    function openPalette() {
      backdrop.style.display = 'flex';
      input.value = '';
      filteredCommands = [...COMMANDS];
      selectedIndex = 0;
      renderList();
      input.focus();
    }

    function closePalette() {
      backdrop.style.display = 'none';
    }

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closePalette();
    });

    input.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      filteredCommands = COMMANDS.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.category.toLowerCase().includes(q)
      );
      selectedIndex = 0;
      renderList();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closePalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          selectedIndex = (selectedIndex + 1) % filteredCommands.length;
          renderList();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
          renderList();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
      }
    });

    // Bắt phím tắt toàn cục Ctrl + K hoặc Cmd + K
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (backdrop.style.display === 'flex') {
          closePalette();
        } else {
          openPalette();
        }
      }
    });
  }

  // Đăng ký Service Worker cho PWA
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createModal);
  } else {
    createModal();
  }
})();