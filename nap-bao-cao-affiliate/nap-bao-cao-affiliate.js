// =========================================================================
// HELPER UTILITIES
// =========================================================================
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

// Chuyển đổi hiển thị giữa Chi Phí Ads và Hoa Hồng Sàn
window.setAffViewMode = function(mode) {
  const secCosts = document.getElementById("section-costs");
  const secComms = document.getElementById("section-comms");
  const btnAll = document.getElementById("view-all-btn");
  const btnCosts = document.getElementById("view-costs-btn");
  const btnComms = document.getElementById("view-comms-btn");

  if (!secCosts || !secComms) return;

  if (mode === 'costs') {
    secCosts.style.display = 'block';
    secComms.style.display = 'none';
    if (btnAll) btnAll.className = 'btn btn-sm btn-secondary';
    if (btnCosts) btnCosts.className = 'btn btn-sm btn-primary';
    if (btnComms) btnComms.className = 'btn btn-sm btn-secondary';
  } else if (mode === 'comms') {
    secCosts.style.display = 'none';
    secComms.style.display = 'block';
    if (btnAll) btnAll.className = 'btn btn-sm btn-secondary';
    if (btnCosts) btnCosts.className = 'btn btn-sm btn-secondary';
    if (btnComms) btnComms.className = 'btn btn-sm btn-primary';
  } else {
    // all
    secCosts.style.display = 'block';
    secComms.style.display = 'block';
    if (btnAll) btnAll.className = 'btn btn-sm btn-primary';
    if (btnCosts) btnCosts.className = 'btn btn-sm btn-secondary';
    if (btnComms) btnComms.className = 'btn btn-sm btn-secondary';
  }
};

// =========================================================================
// AFFILIATE REPORT HUB INTEGRATION (Massoffer, Ecomobi, Adpia -> Sheets)
// =========================================================================
const AFF_CONFIG_KEY = "AFF_ADS_TOOL_CONFIG_V2";
const affDefaultConfig = {
  // Ưu tiên đọc từ config.local.js (chỉ có trên máy của bạn). Khi lên GitHub, biến này rỗng.
  scriptUrl: (typeof window !== 'undefined' && window.ADS_LOCAL_SECRETS && window.ADS_LOCAL_SECRETS.AFFILIATE_SCRIPT_URL)
    ? window.ADS_LOCAL_SECRETS.AFFILIATE_SCRIPT_URL
    : "",
  startCells: {
    Raw_MO: "A5571",
    Raw_EC: "A1399",
    Raw_AP: "A549",
    Raw_gg: "A532",
    Raw_gg_detail: "A3947"
  }
};

let affParsedImports = {
  Raw_MO: { headers: [], rows: [] },
  Raw_EC: { headers: [], rows: [] },
  Raw_AP: { headers: [], rows: [] },
  Raw_gg: { headers: [], rows: [] },
  Raw_gg_detail: { headers: [], rows: [] }
};

function getAffConfig() {
  const saved = localStorage.getItem(AFF_CONFIG_KEY);
  if (!saved) return JSON.parse(JSON.stringify(affDefaultConfig));
  try {
    const parsed = JSON.parse(saved);
    return {
      ...affDefaultConfig,
      ...parsed,
      startCells: {
        ...affDefaultConfig.startCells,
        ...(parsed.startCells || {})
      }
    };
  } catch (e) {
    return JSON.parse(JSON.stringify(affDefaultConfig));
  }
}

function saveAffConfig(cfg) {
  localStorage.setItem(AFF_CONFIG_KEY, JSON.stringify(cfg));
}

// Modal Cấu hình
window.toggleAffSettingsModal = function(show) {
  const modal = document.getElementById("aff-settings-modal");
  if (!modal) return;
  if (show) {
    const cfg = getAffConfig();
    document.getElementById("cfg-url").value = cfg.scriptUrl;
    document.getElementById("cfg-mo-cell").value = (cfg.startCells && cfg.startCells.Raw_MO) || "A5571";
    document.getElementById("cfg-ec-cell").value = (cfg.startCells && cfg.startCells.Raw_EC) || "A1399";
    document.getElementById("cfg-ap-cell").value = (cfg.startCells && cfg.startCells.Raw_AP) || "A549";
    const ggInput = document.getElementById("cfg-gg-cell");
    if (ggInput) ggInput.value = (cfg.startCells && cfg.startCells.Raw_gg) || "A532";
    const ggDetailInput = document.getElementById("cfg-gg-detail-cell");
    if (ggDetailInput) ggDetailInput.value = (cfg.startCells && cfg.startCells.Raw_gg_detail) || "A3947";
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
};

window.saveAffSettingsUI = function() {
  const ggInput = document.getElementById("cfg-gg-cell");
  const ggDetailInput = document.getElementById("cfg-gg-detail-cell");
  const cfg = {
    scriptUrl: document.getElementById("cfg-url").value.trim(),
    startCells: {
      Raw_MO: document.getElementById("cfg-mo-cell").value.trim() || "A1",
      Raw_EC: document.getElementById("cfg-ec-cell").value.trim() || "A1",
      Raw_AP: document.getElementById("cfg-ap-cell").value.trim() || "A1",
      Raw_gg: ggInput ? ggInput.value.trim() || "A532" : "A532",
      Raw_gg_detail: ggDetailInput ? ggDetailInput.value.trim() || "A3947" : "A3947"
    }
  };
  saveAffConfig(cfg);
  updateTopBarDisplay(cfg);
  window.toggleAffSettingsModal(false);
  showToast("✅ Đã lưu cấu hình Google Apps Script thành công!");
};

window.resetDefaultAffSettings = function() {
  if (confirm("Bạn có chắc chắn muốn khôi phục về cấu hình mặc định ban đầu không?")) {
    saveAffConfig(affDefaultConfig);
    const cfg = affDefaultConfig;
    document.getElementById("cfg-url").value = cfg.scriptUrl;
    document.getElementById("cfg-mo-cell").value = cfg.startCells.Raw_MO;
    document.getElementById("cfg-ec-cell").value = cfg.startCells.Raw_EC;
    document.getElementById("cfg-ap-cell").value = cfg.startCells.Raw_AP;
    const ggInput = document.getElementById("cfg-gg-cell");
    if (ggInput) ggInput.value = cfg.startCells.Raw_gg;
    const ggDetailInput = document.getElementById("cfg-gg-detail-cell");
    if (ggDetailInput) ggDetailInput.value = cfg.startCells.Raw_gg_detail;
    updateTopBarDisplay(cfg);
    showToast("Đã khôi phục cấu hình mặc định.");
  }
};

function updateTopBarDisplay(cfg) {
  const moEl = document.getElementById("dispMoCell");
  const ecEl = document.getElementById("dispEcCell");
  const apEl = document.getElementById("dispApCell");
  const ggEl = document.getElementById("dispGgCell");
  const ggDetailEl = document.getElementById("dispGgDetailCell");
  const statusEl = document.getElementById("dispEndpointStatus");

  if (cfg.startCells) {
    if (moEl) moEl.innerText = cfg.startCells.Raw_MO || 'A1';
    if (ecEl) ecEl.innerText = cfg.startCells.Raw_EC || 'A1';
    if (apEl) apEl.innerText = cfg.startCells.Raw_AP || 'A1';
    if (ggEl) ggEl.innerText = cfg.startCells.Raw_gg || 'A532';
    if (ggDetailEl) ggDetailEl.innerText = cfg.startCells.Raw_gg_detail || 'A3947';
  }
  if (statusEl) {
    statusEl.innerText = cfg.scriptUrl ? 'Sẵn sàng đẩy dữ liệu' : 'Chưa nhập Web App URL';
    statusEl.style.color = cfg.scriptUrl ? '#38bdf8' : '#f87171';
  }
}

function autoSaveAffSettings() {
  const urlEl = document.getElementById("cfg-url");
  const moEl = document.getElementById("cfg-mo-cell");
  const ecEl = document.getElementById("cfg-ec-cell");
  const apEl = document.getElementById("cfg-ap-cell");
  const ggEl = document.getElementById("cfg-gg-cell");
  const ggDetailEl = document.getElementById("cfg-gg-detail-cell");

  if (!urlEl || !moEl || !ecEl || !apEl) return;

  const cfg = {
    scriptUrl: urlEl.value.trim(),
    startCells: {
      Raw_MO: moEl.value.trim() || "A1",
      Raw_EC: ecEl.value.trim() || "A1",
      Raw_AP: apEl.value.trim() || "A1",
      Raw_gg: ggEl ? ggEl.value.trim() || "A532" : "A532",
      Raw_gg_detail: ggDetailEl ? ggDetailEl.value.trim() || "A3947" : "A3947"
    }
  };
  saveAffConfig(cfg);
  updateTopBarDisplay(cfg);
}

document.addEventListener('DOMContentLoaded', () => {
  const cfg = getAffConfig();
  updateTopBarDisplay(cfg);

  // Lắng nghe sự kiện gõ / thay đổi trên các ô cấu hình để tự động lưu ngay lập tức (Auto-save)
  ['cfg-url', 'cfg-mo-cell', 'cfg-ec-cell', 'cfg-ap-cell', 'cfg-gg-cell', 'cfg-gg-detail-cell'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', autoSaveAffSettings);
      el.addEventListener('change', autoSaveAffSettings);
    }
  });
});

// Drag and drop handlers
window.handleAffDragOver = function(e) {
  e.preventDefault();
  e.stopPropagation();
};

window.handleAffDrop = function(e, net) {
  e.preventDefault();
  e.stopPropagation();
  const files = e.dataTransfer.files;
  if (!files.length) return;

  if (net === 'MO') window.processFileMO(files[0]);
  if (net === 'EC') window.processFileEC(files);
  if (net === 'AP') window.processFileAP(files[0]);
  if (net === 'GG') window.processFileGG(files[0]);
  if (net === 'GG_DETAIL') window.processFileGGDetail(files[0]);
};

// 1. Process Massoffer (.xlsx)
window.processFileMO = function(file) {
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    showToast("Thư viện SheetJS XLSX đang tải, vui lòng thử lại sau giây lát!", true);
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const firstSheetName = wb.SheetNames[0];
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[firstSheetName], { header: 1, defval: "" });

      if (raw.length < 6) {
        showToast("File Massoffer không đủ dữ liệu (tối thiểu 6 dòng tiêu đề).", true);
        return;
      }

      const headers = raw[5];
      const dataRows = raw.slice(6);
      affParsedImports.Raw_MO = { headers, rows: dataRows };

      document.getElementById("status-mo").innerHTML = `<span class="text-success font-semibold">✓ Đã nạp ${dataRows.length.toLocaleString()} dòng</span> (${file.name})`;
      showToast(`Đã nạp ${dataRows.length} dòng từ file Massoffer!`);
    } catch (err) {
      showToast("Lỗi xử lý file Excel: " + err.message, true);
    }
  };
  reader.readAsBinaryString(file);
};

// 2. Process Ecomobi (Multi .csv)
window.processFileEC = function(files) {
  if (!files || !files.length) return;
  let mergedRows = [];
  let headerRow = [];
  let loadedCount = 0;

  Array.from(files).forEach((file, index) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        if (data.length > 0) {
          if (index === 0) headerRow = data[0];
          mergedRows = mergedRows.concat(data.slice(1));
        }
        loadedCount++;
        if (loadedCount === files.length) {
          // Khử trùng lặp theo Checkout ID / Order ID (Cột 4 hoặc 5 nếu có)
          const seenOrders = new Set();
          let duplicateCount = 0;
          const dedupedRows = [];

          mergedRows.forEach(r => {
            // Giả định orderId hoặc checkoutId ở cột 4 hoặc 5
            const key = (r[5] || r[4] || r[0] || '').trim();
            if (key && seenOrders.has(key)) {
              duplicateCount++;
            } else {
              if (key) seenOrders.add(key);
              dedupedRows.push(r);
            }
          });

          affParsedImports.Raw_EC = { headers: headerRow, rows: dedupedRows };
          let statusText = `✓ Đã ghép ${files.length} file (${dedupedRows.length.toLocaleString()} dòng)`;
          if (duplicateCount > 0) {
            statusText += ` <span style="color: #fbbf24; font-size: 0.75rem;">(Lọc bỏ ${duplicateCount} đơn trùng)</span>`;
          }
          document.getElementById("status-ec").innerHTML = `<span class="text-success font-semibold">${statusText}</span>`;
          showToast(`Đã ghép thành công ${files.length} file Ecomobi! (${dedupedRows.length} đơn, ${duplicateCount} trùng)`);
        }
      },
      error: (err) => {
        showToast(`Lỗi file ${file.name}: ` + err.message, true);
      }
    });
  });
};

// 3. Process Adpia (.csv)
window.processFileAP = function(file) {
  if (!file) return;
  Papa.parse(file, {
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data;
      if (data.length === 0) return;

      const rawHeader = data[0];
      const prodCodeIdx = rawHeader.findIndex(h => String(h).trim().toLowerCase() === "product code");

      let finalHeaders = rawHeader;
      let finalRows = data.slice(1);

      // Filter out Product Code column if present
      if (prodCodeIdx !== -1) {
        finalHeaders = rawHeader.filter((_, i) => i !== prodCodeIdx);
        finalRows = finalRows.map(row => row.filter((_, i) => i !== prodCodeIdx));
      }

      affParsedImports.Raw_AP = { headers: finalHeaders, rows: finalRows };
      document.getElementById("status-ap").innerHTML = `<span class="text-success font-semibold">✓ Đã nạp ${finalRows.length.toLocaleString()} dòng (Đã lọc Product Code)</span> (${file.name})`;
      showToast(`Đã nạp ${finalRows.length} dòng từ Adpia!`);
    },
    error: (err) => {
      showToast("Lỗi đọc file Adpia: " + err.message, true);
    }
  });
};

// 4. Process Google Ads (.csv) -> Raw_gg
window.processFileGG = function(file) {
  if (!file) return;
  Papa.parse(file, {
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data;
      if (!data || data.length === 0) {
        showToast("File Google Ads không có dữ liệu!", true);
        return;
      }

      // Tìm dòng tiêu đề (chứa "tên tài khoản" hoặc "chi phí" hoặc "lượt nhấp" hoặc "cost" / "account")
      let headerIdx = -1;
      for (let i = 0; i < Math.min(data.length, 10); i++) {
        const rowStr = data[i].map(c => String(c).toLowerCase()).join(" ");
        if (rowStr.includes("tài khoản") || rowStr.includes("chi phí") || rowStr.includes("cost") || rowStr.includes("account")) {
          headerIdx = i;
          break;
        }
      }

      let rawHeaders = [];
      let rawDataRows = [];

      if (headerIdx !== -1) {
        rawHeaders = data[headerIdx];
        rawDataRows = data.slice(headerIdx + 1);
      } else {
        rawHeaders = data[0];
        rawDataRows = data.slice(1);
      }

      // Chuẩn hóa Header: Cột A-F (index 0-5), chèn Cột G trống (""), Cột H là CTR (index 6)
      const finalHeaders = [
        rawHeaders[0] !== undefined ? String(rawHeaders[0]).trim() : "Tên tài khoản",
        rawHeaders[1] !== undefined ? String(rawHeaders[1]).trim() : "Mã khách hàng",
        rawHeaders[2] !== undefined ? String(rawHeaders[2]).trim() : "Ngày",
        rawHeaders[3] !== undefined ? String(rawHeaders[3]).trim() : "Mã đơn vị tiền tệ",
        rawHeaders[4] !== undefined ? String(rawHeaders[4]).trim() : "Chi phí",
        rawHeaders[5] !== undefined ? String(rawHeaders[5]).trim() : "Lượt nhấp",
        "", // Cột G để trống
        rawHeaders[6] !== undefined ? String(rawHeaders[6]).trim() : "CTR"
      ];

      // Lọc dữ liệu: bỏ dòng rỗng, bỏ dòng tổng cộng ("tổng số", "total", hoặc không có ngày)
      const validRows = [];
      let summaryRowsRemoved = 0;

      rawDataRows.forEach(r => {
        if (!r || r.length === 0) return;
        const isAllEmpty = r.every(cell => !cell || !String(cell).trim());
        if (isAllEmpty) return;

        const firstCell = String(r[0] || '').trim().toLowerCase();
        const dateCell = String(r[2] || '').trim();

        // Kiểm tra dòng tổng cộng
        if (firstCell.startsWith("tổng") || firstCell.startsWith("total") || dateCell === "--" || dateCell === "") {
          summaryRowsRemoved++;
          return;
        }

        // Chuẩn hóa cột F (Lượt nhấp): xóa tất cả dấu chấm (ví dụ: 1.409 -> 1409)
        const rawClicks = r[5] !== undefined ? String(r[5]).trim() : "";
        const cleanClicks = rawClicks.replace(/\./g, "");

        // Chuẩn hóa cột H (CTR): chuyển dấu phẩy thành dấu chấm (ví dụ: 12,03% -> 12.03%)
        const rawCtr = r[6] !== undefined ? String(r[6]).trim() : "";
        const cleanCtr = rawCtr.replace(/,/g, ".");

        // Chèn cột G trống vào giữa cột F (Lượt nhấp) và cột H (CTR)
        const transformed = [
          r[0] !== undefined ? String(r[0]).trim() : "",
          r[1] !== undefined ? String(r[1]).trim() : "",
          r[2] !== undefined ? String(r[2]).trim() : "",
          r[3] !== undefined ? String(r[3]).trim() : "",
          r[4] !== undefined ? String(r[4]).trim() : "",
          cleanClicks,
          "", // Cột G để trống
          cleanCtr
        ];
        validRows.push(transformed);
      });

      affParsedImports.Raw_gg = { headers: finalHeaders, rows: validRows };

      let statusMsg = `✓ Đã nạp ${validRows.length.toLocaleString()} dòng (Đã chèn cột G trống)`;
      if (summaryRowsRemoved > 0) {
        statusMsg += ` <span style="color: #38bdf8; font-size: 0.75rem;">(Bỏ ${summaryRowsRemoved} dòng tổng)</span>`;
      }
      document.getElementById("status-gg").innerHTML = `<span class="text-success font-semibold">${statusMsg}</span> (${file.name})`;
      addAffLog(`Đã nạp file Google Ads [${file.name}]: ${validRows.length} dòng dữ liệu hợp lệ (Đã chèn cột G trống, bỏ ${summaryRowsRemoved} dòng tổng).`, 'info');
      showToast(`Đã nạp thành công ${validRows.length} dòng Google Ads!`);
    },
    error: (err) => {
      showToast("Lỗi đọc file Google Ads: " + err.message, true);
      addAffLog(`Lỗi đọc file Google Ads: ${err.message}`, 'error');
    }
  });
};

// 5. Process Google Ads Chi Tiết (.csv) -> Raw_gg_detail
window.processFileGGDetail = function(file) {
  if (!file) return;
  Papa.parse(file, {
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data;
      if (!data || data.length === 0) {
        showToast("File Google Ads Chi Tiết không có dữ liệu!", true);
        return;
      }

      // Tìm dòng tiêu đề (chứa "chiến dịch" hoặc "campaign" hoặc "tài khoản")
      let headerIdx = -1;
      for (let i = 0; i < Math.min(data.length, 10); i++) {
        const rowStr = data[i].map(c => String(c).toLowerCase()).join(" ");
        if (rowStr.includes("chiến dịch") || rowStr.includes("campaign") || rowStr.includes("tài khoản")) {
          headerIdx = i;
          break;
        }
      }

      let rawHeaders = [];
      let rawDataRows = [];

      if (headerIdx !== -1) {
        rawHeaders = data[headerIdx];
        rawDataRows = data.slice(headerIdx + 1);
      } else {
        rawHeaders = data[0];
        rawDataRows = data.slice(1);
      }

      // Chuẩn hóa Header: lấy đầy đủ 9 cột
      const finalHeaders = rawHeaders.map(h => String(h !== undefined ? h : '').trim());

      // Lọc dữ liệu: bỏ dòng rỗng, bỏ dòng tổng cộng ("tổng số", "total", hoặc không có ngày)
      const validRows = [];
      let summaryRowsRemoved = 0;

      rawDataRows.forEach(r => {
        if (!r || r.length === 0) return;
        const isAllEmpty = r.every(cell => !cell || !String(cell).trim());
        if (isAllEmpty) return;

        const firstCell = String(r[0] || '').trim().toLowerCase();
        const dateCell = String(r[2] || '').trim();

        // Kiểm tra dòng tổng cộng
        if (firstCell.startsWith("tổng") || firstCell.startsWith("total") || dateCell === "--" || dateCell === "") {
          summaryRowsRemoved++;
          return;
        }

        // Chuẩn hóa cột Lượt nhấp (Index 7): xóa tất cả dấu chấm (ví dụ: 1.409 -> 1409)
        const rawClicks = r[7] !== undefined ? String(r[7]).trim() : "";
        const cleanClicks = rawClicks.replace(/\./g, "");

        // Chuẩn hóa cột CTR (Index 8): chuyển dấu phẩy thành dấu chấm (ví dụ: 4,09% -> 4.09%)
        const rawCtr = r[8] !== undefined ? String(r[8]).trim() : "";
        const cleanCtr = rawCtr.replace(/,/g, ".");

        const transformed = [
          r[0] !== undefined ? String(r[0]).trim() : "",
          r[1] !== undefined ? String(r[1]).trim() : "",
          r[2] !== undefined ? String(r[2]).trim() : "",
          r[3] !== undefined ? String(r[3]).trim() : "",
          r[4] !== undefined ? String(r[4]).trim() : "",
          r[5] !== undefined ? String(r[5]).trim() : "",
          r[6] !== undefined ? String(r[6]).trim() : "",
          cleanClicks,
          cleanCtr
        ];
        validRows.push(transformed);
      });

      affParsedImports.Raw_gg_detail = { headers: finalHeaders, rows: validRows };

      let statusMsg = `✓ Đã nạp ${validRows.length.toLocaleString()} dòng (Đã chuẩn hóa . ,)`;
      if (summaryRowsRemoved > 0) {
        statusMsg += ` <span style="color: #a5b4fc; font-size: 0.75rem;">(Bỏ ${summaryRowsRemoved} dòng tổng)</span>`;
      }
      document.getElementById("status-gg-detail").innerHTML = `<span class="text-success font-semibold">${statusMsg}</span> (${file.name})`;
      addAffLog(`Đã nạp file Google Ads Chi Tiết [${file.name}]: ${validRows.length} dòng dữ liệu hợp lệ (Đã chuẩn hóa dấu . và ,, bỏ ${summaryRowsRemoved} dòng tổng).`, 'info');
      showToast(`Đã nạp thành công ${validRows.length} dòng Google Ads Chi Tiết!`);
    },
    error: (err) => {
      showToast("Lỗi đọc file Google Ads Chi Tiết: " + err.message, true);
      addAffLog(`Lỗi đọc file Google Ads Chi Tiết: ${err.message}`, 'error');
    }
  });
};

// Helper: Log console message
window.addAffLog = function(msg, type = 'info') {
  const box = document.getElementById('affConsoleLogs');
  if (!box) return;
  const time = new Date().toLocaleTimeString();
  const div = document.createElement('div');
  div.className = `log-line ${type}`;
  div.innerHTML = `[${time}] ${msg}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
};

window.clearAffLogs = function() {
  const box = document.getElementById('affConsoleLogs');
  if (box) {
    box.innerHTML = `<div class="log-line text-muted">[Sẵn sàng] Nhật ký đã được xóa.</div>`;
  }
};

// Push to Google Sheet with robust error handling and log feedback
window.pushToGoogleSheet = async function(sheetName) {
  const pkg = affParsedImports[sheetName];
  if (!pkg || !pkg.rows || pkg.rows.length === 0) {
    showToast("Vui lòng tải file dữ liệu lên trước khi đẩy!", true);
    addAffLog(`Lỗi: Không tìm thấy dữ liệu file cho sàn [${sheetName}]. Vui lòng kéo thả file trước!`, 'error');
    return;
  }

  const suffix = sheetName.toLowerCase().replace('raw_', '');
  const checkbox = document.getElementById(`header-${suffix}`);
  const includeHeader = checkbox ? checkbox.checked : false;
  let rowsToPush = includeHeader ? [pkg.headers, ...pkg.rows] : pkg.rows;

  const cfg = getAffConfig();
  if (!cfg.scriptUrl || !cfg.scriptUrl.includes("script.google.com")) {
    showToast("Vui lòng cài đặt URL Google Apps Script hợp lệ trong mục Cấu Hình!", true);
    addAffLog("Lỗi: URL Google Apps Script chưa được cấu hình chính xác.", 'error');
    window.toggleAffSettingsModal(true);
    return;
  }

  const startCell = (cfg.startCells && cfg.startCells[sheetName]) ? cfg.startCells[sheetName] : (affDefaultConfig.startCells[sheetName] || "A1");

  const btnId = `btnPush${suffix.toUpperCase()}`;
  const btn = document.getElementById(btnId);
  const oldText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `⏳ Đang đẩy ${rowsToPush.length} dòng...`;
  }

  addAffLog(`Bắt đầu đẩy ${rowsToPush.length} dòng lên bảng tính [${sheetName}] tại ô [${startCell}]...`, 'info');
  showToast(`Đang đẩy ${rowsToPush.length} dòng lên [${sheetName}]...`);

  try {
    const payload = JSON.stringify({
      sheetName: sheetName,
      startCell: startCell,
      rows: rowsToPush
    });

    // Send via fetch with mode: 'no-cors' for Google Apps Script Web App
    await fetch(cfg.scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    addAffLog(`✅ THÀNH CÔNG: Đã truyền lệnh nạp ${rowsToPush.length} dòng lên Google Sheet [${sheetName}] tại ô ${startCell}!`, 'success');
    showToast(`✅ Đã đẩy thành công ${rowsToPush.length} dòng lên [${sheetName}]!`);
  } catch (err) {
    addAffLog(`❌ Lỗi kết nối Google Sheets: ${err.message}`, 'error');
    showToast("❌ Lỗi kết nối Google Sheets: " + err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldText;
    }
  }
};

// Copy TSV to Clipboard for manual pasting into Google Sheets
window.copyAffToClipboard = function(sheetName) {
  const pkg = affParsedImports[sheetName];
  if (!pkg || !pkg.rows || pkg.rows.length === 0) {
    showToast("Chưa có dữ liệu để sao chép!", true);
    addAffLog(`Chưa có dữ liệu cho sàn [${sheetName}] để copy.`, 'warn');
    return;
  }

  const suffix = sheetName.toLowerCase().replace('raw_', '');
  const checkbox = document.getElementById(`header-${suffix}`);
  const includeHeader = checkbox ? checkbox.checked : false;
  const allRows = includeHeader ? [pkg.headers, ...pkg.rows] : pkg.rows;

  const tsvContent = allRows.map(r => r.join("\t")).join("\n");
  navigator.clipboard.writeText(tsvContent).then(() => {
    addAffLog(`📋 Đã copy ${allRows.length} dòng dữ liệu [${sheetName}] dạng TSV vào Clipboard.`, 'info');
    showToast(`✅ Đã sao chép ${allRows.length} dòng vào Clipboard! Nhấn Ctrl+V tại Google Sheets.`);
  }).catch(err => {
    addAffLog(`Lỗi sao chép Clipboard: ${err}`, 'error');
    showToast("Không thể sao chép: " + err, true);
  });
};
