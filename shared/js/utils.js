/**
 * AdsInsight Pro - Common Utilities & Helpers
 * Tập trung các hàm tiện ích dùng chung (Toast, Format tiền, Escape HTML, Clipboard)
 */

(function () {
  'use strict';

  // Hiển thị thông báo Toast chuẩn
  function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) {
      console.log(`[Toast ${isError ? 'Error' : 'Info'}]: ${message}`);
      return;
    }
    toast.innerText = message;
    toast.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(window.__toastTimeout);
    window.__toastTimeout = setTimeout(() => {
      toast.className = 'toast';
    }, 3500);
  }

  // Chống XSS khi render chuỗi vào HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Định dạng số tiền VNĐ chuẩn (vd: 125.000₫)
  function formatCurrency(val) {
    if (isNaN(val) || val === null || val === undefined) return '0₫';
    return Number(val).toLocaleString('vi-VN') + '₫';
  }

  // Định dạng số nguyên có dấu phân cách hàng nghìn
  function formatNumber(val) {
    if (isNaN(val) || val === null || val === undefined) return '0';
    return Number(val).toLocaleString('vi-VN');
  }

  // Sao chép an toàn vào Clipboard
  async function copyToClipboard(text, successMessage = 'Đã sao chép vào bộ nhớ tạm!') {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
      return true;
    } catch (err) {
      showToast('Lỗi khi sao chép: ' + err, true);
      return false;
    }
  }

  // Export các hàm ra namespace dùng chung và tương thích ngược window
  window.AppUtils = {
    showToast,
    escapeHtml,
    formatCurrency,
    formatNumber,
    copyToClipboard
  };

  // Giữ lại các hàm ở window để không làm gãy code cũ đang gọi trực tiếp
  window.showToast = window.showToast || showToast;
  window.escapeHtml = window.escapeHtml || escapeHtml;
  window.formatCurrency = window.formatCurrency || formatCurrency;
  window.formatNumber = window.formatNumber || formatNumber;
  window.copyToClipboard = window.copyToClipboard || copyToClipboard;
})();

