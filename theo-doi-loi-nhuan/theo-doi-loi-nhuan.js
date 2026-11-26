/**
 * Theo Dõi Lời Lãi Google Ads & Affiliate Campaigns
 * Kéo dữ liệu tự động trực tiếp từ Google Sheets API (gviz)
 */

(function () {
  'use strict';

  // Config ID Google Sheet và danh sách tab Dashboard
  // Ưu tiên đọc từ config.local.js (chỉ có trên máy cá nhân). Khi lên GitHub, biến này rỗng để bảo mật.
  const SPREADSHEET_ID = (typeof window !== 'undefined' && window.ADS_LOCAL_SECRETS && window.ADS_LOCAL_SECRETS.SPREADSHEET_ID)
    ? window.ADS_LOCAL_SECRETS.SPREADSHEET_ID
    : "";
  const GID_DATA_TONGHOP = '1901670114'; // Chứa dữ liệu CTR theo từng ngày của các camp (Raw_gg_detail)
  const GID_RAW_MO = '780943603'; // Dữ liệu đơn hàng & hoa hồng Masoffer
  const GID_RAW_EC = '1821183995'; // Dữ liệu đơn hàng & hoa hồng Ecomobi
  const GID_RAW_AP = '958780946'; // Dữ liệu đơn hàng & hoa hồng Adpia

  const TABS_CONFIG = {
    'thang11': { name: 'Tháng 11 (Mới nhất)', gid: '584036190' },
    '14days': { name: '14 Ngày Gần Nhất', gid: '1061401403' },
    'thang10': { name: 'Tháng 10', gid: '929883108' },
    'thang9': { name: 'Tháng 9', gid: '376887396' },
    'thang8': { name: 'Tháng 8', gid: '1442744265' }
  };

  // State
  let currentTabKey = 'thang11'; // Mặc định mở Tháng 11
  let currentViewTab = 'dashboard'; // 'dashboard', 'details' hoặc 'products'
  let rawCampaigns = [];
  let filteredCampaigns = [];
  let periodMeta = { from: '', to: '' };
  let currentSort = { col: 'profit', dir: 'desc' }; // default sort by profit descending
  let ctrMap = {}; // Lưu CTR tính toán theo campId
  let dailyStatsMap = {}; // Lưu stats tổng hợp theo khoảng ngày tùy chọn
  let dailyOrdersMap = {}; // Lưu doanh thu và số đơn theo ngày của từng campId
  let adGroupMap = {}; // Lưu dữ liệu phân tách cấp Nhóm quảng cáo { campId: { adGroupId: { name, orders, revenue } } }
  let productsList = []; // Lưu danh sách phân tích sản phẩm/offer đã bán
  let expandedRows = new Set(); // Lưu trạng thái expand sub-table AdGroup
  let expandedCategories = new Set(); // Lưu trạng thái expand danh sách camp trong ngành
  let campProductsMap = {}; // Lưu cơ cấu loại sản phẩm { campId: { ptype: { orders, revenue } } }
  let rawSheetsCache = {
    jsonTongHop: null,
    jsonMO: null,
    jsonEC: null,
    jsonAP: null,
    cachedAt: 0
  };
  const CACHE_TTL_MS = 5 * 60 * 1000; // Cache 5 phút cho các sheet raw lớn
  let chartInstances = {}; // Lưu các instance của Chart.js

  // DOM Elements
  const elBtnTabDashboard = document.getElementById('btnTabDashboard');
  const elBtnTabDetails = document.getElementById('btnTabDetails');
  const elBtnTabProducts = document.getElementById('btnTabProducts');
  const elTabContentDashboard = document.getElementById('tabContentDashboard');
  const elTabContentDetails = document.getElementById('tabContentDetails');
  const elTabContentProducts = document.getElementById('tabContentProducts');
  const elProductTableBody = document.getElementById('productTableBody');
  const elProductCount = document.getElementById('productCount');

  const elPeriodSelect = document.getElementById('periodSelect');
  const elStartDateInput = document.getElementById('startDateInput');
  const elEndDateInput = document.getElementById('endDateInput');
  const elBtnApplyDateFilter = document.getElementById('btnApplyDateFilter');
  const elBtnResetDateFilter = document.getElementById('btnResetDateFilter');
  const elLagStatusNotice = document.getElementById('lagStatusNotice');
  const elBtnSync = document.getElementById('btnSync');
  const elSyncSpinner = document.getElementById('syncSpinner');
  const elLastSyncTime = document.getElementById('lastSyncTime');
  const elPeriodBadge = document.getElementById('periodBadge');
  
  const elAccountFilter = document.getElementById('accountFilter');
  const elStatusFilter = document.getElementById('statusFilter');
  const elSearchInput = document.getElementById('searchInput');

  // KPI Elements
  const elKpiCost = document.getElementById('kpiCost');
  const elKpiRevenue = document.getElementById('kpiRevenue');
  const elKpiProfit = document.getElementById('kpiProfit');
  const elKpiRoas = document.getElementById('kpiRoas');
  const elKpiCpc = document.getElementById('kpiCpc');
  const elKpiCtr = document.getElementById('kpiCtr');
  const elKpiClicks = document.getElementById('kpiClicks');
  const elKpiOrders = document.getElementById('kpiOrders');
  const elKpiMargin = document.getElementById('kpiMargin');
  const elKpiTotalCamp = document.getElementById('kpiTotalCamp');
  const elKpiProfitableCamp = document.getElementById('kpiProfitableCamp');
  const elPeriodBadgeText = document.getElementById('periodBadgeText');
  const elHeaderPeriodText = document.getElementById('headerPeriodText');

  // Table
  const elTableBody = document.getElementById('campaignTableBody');
  const elRowCount = document.getElementById('rowCount');

  // Initialize
  function init() {
    bindEvents();
    syncData(currentTabKey);
  }

  function bindEvents() {

    // Bắt sự kiện click nút Toggle Product Breakdown tại Tab 3
    if (elProductTableBody) {
      elProductTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-toggle-sub');
        if (!btn) return;
        const cid = btn.getAttribute('data-camp-product') || btn.getAttribute('data-category');
        if (!cid) return;
        if (expandedCategories.has(cid)) {
          expandedCategories.delete(cid);
        } else {
          expandedCategories.add(cid);
        }
        renderProductsTable();
      });
    }


    // Bắt sự kiện click nút Toggle AdGroup Drill-down
    if (elTableBody) {
      elTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-toggle-sub');
        if (!btn) return;
        const campId = btn.getAttribute('data-camp');
        if (!campId) return;
        if (expandedRows.has(campId)) {
          expandedRows.delete(campId);
        } else {
          expandedRows.add(campId);
        }
        renderTable();
      });
    }

    // Chuyển đổi giữa 3 tab View (Dashboard vs Details vs Products)
    if (elBtnTabDashboard && elBtnTabDetails) {
      elBtnTabDashboard.addEventListener('click', () => switchViewTab('dashboard'));
      elBtnTabDetails.addEventListener('click', () => switchViewTab('details'));
    }
    if (elBtnTabProducts) {
      elBtnTabProducts.addEventListener('click', () => switchViewTab('products'));
    }

    // Đổi tab kỳ thời gian
    if (elPeriodSelect) {
      elPeriodSelect.addEventListener('change', (e) => {
        currentTabKey = e.target.value;
        syncData(currentTabKey);
      });
    }

    // Khởi tạo Custom Datepicker Popup chuẩn dd/mm/yyyy
    initCustomDatepickers();

    // Nút Đồng bộ thủ công
    if (elBtnSync) {
      elBtnSync.addEventListener('click', () => {
        syncData(currentTabKey, true); // forceRefresh = true khi bấm nút đồng bộ
      });
    }

    // Nút Lọc Ngày Tùy Chọn
    if (elBtnApplyDateFilter) {
      elBtnApplyDateFilter.addEventListener('click', () => {
        applyCustomDateFilter();
      });
    }

    // Nút Đặt lại Bộ lọc Ngày về chu kỳ mặc định
    if (elBtnResetDateFilter) {
      elBtnResetDateFilter.addEventListener('click', () => {
        resetDateFilter();
      });
    }
    if (elAccountFilter) {
      elAccountFilter.addEventListener('change', applyFilters);
    }
    if (elStatusFilter) {
      elStatusFilter.addEventListener('change', applyFilters);
    }
    if (elSearchInput) {
      elSearchInput.addEventListener('input', applyFilters);
    }

    


    // Sắp xếp cột table
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (currentSort.col === col) {
          currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.col = col;
          currentSort.dir = 'desc';
        }
        updateSortIcons();
        sortAndRender();
      });
    });

    // Sidebar Toggle
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
      });
    }
  }

  // Đồng bộ dữ liệu từ Google Sheets qua JSONP (chống chặn CORS khi mở bằng file://)
  function fetchSheetJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = '__gvizCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const script = document.createElement('script');
      let isHandled = false;

      const timer = setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          cleanup();
          reject(new Error('Quá thời gian phản hồi từ Google Sheets (Timeout 15s).'));
        }
      }, 15000);

      function cleanup() {
        clearTimeout(timer);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete window[callbackName];
      }

      window[callbackName] = function (json) {
        if (!isHandled) {
          isHandled = true;
          cleanup();
          resolve(json);
        }
      };

      script.onerror = function () {
        if (!isHandled) {
          isHandled = true;
          cleanup();
          reject(new Error('Lỗi mạng khi tải script từ Google Sheets.'));
        }
      };

      script.src = `${url}&tqx=responseHandler:${callbackName}`;
      document.head.appendChild(script);
    });
  }

  // Đồng bộ dữ liệu từ Google Sheets (hỗ trợ cache cho 4 bảng dữ liệu thô lớn)
  async function syncData(tabKey, forceRefresh = false) {
    const tab = TABS_CONFIG[tabKey];
    if (!tab) return;

    setLoading(true);
    const urlDashboard = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${tab.gid}&t=${Date.now()}`;
    const urlTongHop = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${GID_DATA_TONGHOP}&t=${Date.now()}`;
    const urlRawMO = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${GID_RAW_MO}&t=${Date.now()}`;
    const urlRawEC = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${GID_RAW_EC}&t=${Date.now()}`;
    const urlRawAP = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${GID_RAW_AP}&t=${Date.now()}`;

    try {
      const nowTs = Date.now();
      const isCacheValid = !forceRefresh && rawSheetsCache.jsonTongHop && (nowTs - rawSheetsCache.cachedAt < CACHE_TTL_MS);

      let jsonDashboard, jsonTongHop, jsonMO, jsonEC, jsonAP;

      if (isCacheValid) {
        // Tái sử dụng cache dữ liệu thô, chỉ tải Dashboard của chu kỳ
        jsonDashboard = await fetchSheetJsonp(urlDashboard);
        jsonTongHop = rawSheetsCache.jsonTongHop;
        jsonMO = rawSheetsCache.jsonMO;
        jsonEC = rawSheetsCache.jsonEC;
        jsonAP = rawSheetsCache.jsonAP;
      } else {
        // Tải song song Dashboard, Data_TongHop và các bảng đơn hàng sàn (MO, EC, AP)
        [jsonDashboard, jsonTongHop, jsonMO, jsonEC, jsonAP] = await Promise.all([
          fetchSheetJsonp(urlDashboard),
          fetchSheetJsonp(urlTongHop).catch(() => null),
          fetchSheetJsonp(urlRawMO).catch(() => null),
          fetchSheetJsonp(urlRawEC).catch(() => null),
          fetchSheetJsonp(urlRawAP).catch(() => null)
        ]);

        // Cập nhật bộ nhớ đệm
        if (jsonTongHop) {
          rawSheetsCache = {
            jsonTongHop,
            jsonMO,
            jsonEC,
            jsonAP,
            cachedAt: nowTs
          };
        }
      }

      if (!jsonDashboard || !jsonDashboard.table) {
        throw new Error('Dữ liệu Google Sheets trả về không đúng định dạng bảng.');
      }

      // Parse CTR map và dữ liệu chi phí theo ngày từ Data_TongHop
      parseDailyAndCtrData(jsonTongHop);

      // Parse doanh thu và đơn hàng theo từng ngày từ các sàn Affiliate
      parseDailyOrdersData(jsonMO, jsonEC, jsonAP);

      parseSheetData(jsonDashboard);
      populateAccountFilter();
      applyFilters();

      // Ẩn nút Reset Date Filter khi nạp lại chu kỳ
      if (elBtnResetDateFilter) {
        elBtnResetDateFilter.style.display = 'none';
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const dateStr = formatVnDate(now);
      if (elLastSyncTime) {
        elLastSyncTime.textContent = `Đồng bộ lúc: ${timeStr} - ${dateStr}`;
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu Google Sheets:', err);
      alert('Không thể kéo dữ liệu từ Google Sheets: ' + err.message + '\nVui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setLoading(false);
    }
  }

  function parseDailyAndCtrData(jsonTongHop) {
    ctrMap = {};
    dailyStatsMap = {};
    if (!jsonTongHop || !jsonTongHop.table || !jsonTongHop.table.rows) return;
    
    const campStats = {};
    jsonTongHop.table.rows.forEach(r => {
      const c = r.c;
      if (!c) return;
      const campId = c[4] ? String(c[4].v).trim() : '';
      const dateStr = c[2] ? String(c[2].f || c[2].v || '') : '';
      const cost = typeof c[6]?.v === 'number' ? c[6].v : parseFloat(String(c[6]?.v || '').replace(/\./g, '').replace(',', '.')) || 0;
      const clicks = typeof c[7]?.v === 'number' ? c[7].v : parseInt(c[7]?.v) || 0;
      const ctrStr = c[8] ? String(c[8].f || c[8].v || '') : '';
      const ctrVal = parseFloat(ctrStr.replace(',', '.').replace('%', ''));

      // Lưu CTR tổng
      if (campId && !isNaN(ctrVal)) {
        if (!campStats[campId]) campStats[campId] = { totalClicks: 0, weightedSum: 0 };
        const weight = clicks > 0 ? clicks : 1;
        campStats[campId].weightedSum += ctrVal * weight;
        campStats[campId].totalClicks += weight;
      }

      // Lưu dữ liệu từng ngày
      const parsedDate = parseVnDate(dateStr);
      if (campId && parsedDate) {
        if (!dailyStatsMap[campId]) dailyStatsMap[campId] = [];
        dailyStatsMap[campId].push({
          date: parsedDate,
          dateStr,
          cost,
          clicks,
          ctr: !isNaN(ctrVal) ? ctrVal : 0
        });
      }
    });

    Object.keys(campStats).forEach(id => {
      const s = campStats[id];
      ctrMap[id] = s.totalClicks > 0 ? (s.weightedSum / s.totalClicks) : 0;
    });
  }

  // Parse dữ liệu đơn hàng, AdGroup và Loại Sản Phẩm từng ngày từ các sàn (MO, EC, AP)
  function parseDailyOrdersData(jsonMO, jsonEC, jsonAP) {
    dailyOrdersMap = {};
    adGroupMap = {};
    campProductsMap = {};
    const productStats = {};

    function getNormalizedProductType(platform, rawName, subInfo) {
      const s = (rawName || '').toLowerCase().trim();
      const sub = (subInfo || '').toLowerCase().trim();

      // 1. Phân loại chuẩn từ Product Name (Adpia)
      if (s.includes('hotel') || sub.includes('hotel') || sub.includes('giường') || sub.includes('bed') || sub.includes('urmah')) {
        return 'Hotel (Khách Sạn & Lưu Trú)';
      }
      if (s.includes('flight') || sub.includes('flight') || sub.includes('vé máy bay') || sub.includes('vé')) {
        return 'Flight (Vé Máy Bay)';
      }
      if (s.includes('train') || sub.includes('train') || sub.includes('tàu')) {
        return 'Train (Vé Tàu Hỏa)';
      }
      if (s.includes('bus') || sub.includes('bus') || sub.includes('xe khách')) {
        return 'Bus (Vé Xe Khách)';
      }
      if (s.includes('car') || sub.includes('car rental')) {
        return 'Car Rental (Thuê Xe)';
      }
      if (sub.includes('culinary') || sub.includes('ẩm thực') || sub.includes('kopi') || sub.includes('cul')) {
        return 'Dining & Culinary (Ẩm Thực)';
      }
      if (s.includes('shopee') || sub.includes('shopee') || sub.includes('sea') || sub.includes('ins')) {
        return 'Shopee Order (Đơn Hàng Shopee)';
      }
      if (s.includes('klook') || sub.includes('klook') || sub.includes('tour') || sub.includes('act')) {
        return 'Klook (Tour & Hoạt Động Vui Chơi)';
      }
      if (s.includes('trip') || sub.includes('trip')) {
        return 'Trip.com (Hotel & Tour)';
      }
      if (platform === 'TRAVELOKA') {
        return 'Traveloka Booking';
      }
      return rawName || 'Dịch Vụ Khác';
    }

    function recordOrder(campId, adGroupId, adGroupName, rawProductName, platform, dateStr, revenue) {
      if (!campId || !dateStr) return;
      const parsedDate = parseVnDate(dateStr);
      if (!parsedDate) return;
      const rev = typeof revenue === 'number' && !isNaN(revenue) ? revenue : 0;

      // 1. Lưu dailyOrdersMap
      if (!dailyOrdersMap[campId]) dailyOrdersMap[campId] = [];
      dailyOrdersMap[campId].push({
        date: parsedDate,
        dateStr,
        revenue: rev
      });

      // 2. Lưu AdGroup mapping
      if (adGroupId) {
        if (!adGroupMap[campId]) adGroupMap[campId] = {};
        if (!adGroupMap[campId][adGroupId]) {
          adGroupMap[campId][adGroupId] = {
            id: adGroupId,
            name: adGroupName || ('AdGroup ' + adGroupId),
            orders: 0,
            revenue: 0
          };
        }
        adGroupMap[campId][adGroupId].orders += 1;
        adGroupMap[campId][adGroupId].revenue += rev;
      }

      // 3. Phân loại sản phẩm (Hotel, Flight, Train,...)
      const ptype = getNormalizedProductType(platform, rawProductName, adGroupName);
      
      // Lưu theo từng Campaign: campProductsMap[campId][ptype]
      if (!campProductsMap[campId]) campProductsMap[campId] = {};
      if (!campProductsMap[campId][ptype]) {
        campProductsMap[campId][ptype] = {
          name: ptype,
          orders: 0,
          revenue: 0
        };
      }
      campProductsMap[campId][ptype].orders += 1;
      campProductsMap[campId][ptype].revenue += rev;

      // Lưu tổng quan toàn sàn
      if (!productStats[ptype]) {
        productStats[ptype] = {
          name: ptype,
          platform: platform,
          orders: 0,
          revenue: 0
        };
      }
      productStats[ptype].orders += 1;
      productStats[ptype].revenue += rev;
    }

    // 1. Masoffer (Raw_MO): Sub1 cột 18, Sub3 cột 20, Ngày cột 27, Offer cột 2, Hoa hồng cột 30
    if (jsonMO && jsonMO.table && jsonMO.table.rows) {
      jsonMO.table.rows.forEach(r => {
        const c = r.c;
        if (!c) return;
        const sub1 = String(c[18]?.v || '');
        const matchCamp = sub1.match(/\b(2\d{10})\b/);
        const matchAdGroup = sub1.match(/\b(1\d{11})\b/);
        const campId = matchCamp ? matchCamp[1] : '';
        const adGroupId = matchAdGroup ? matchAdGroup[1] : '';
        const adGroupName = String(c[20]?.v || '');
        const offer = String(c[2]?.v || 'Traveloka (MO)');
        const dateStr = c[27] ? String(c[27].f || c[27].v || '') : '';
        const rev = typeof c[30]?.v === 'number' ? c[30].v : (typeof c[29]?.v === 'number' ? c[29].v : parseNum(c[30] || c[29]));
        if (campId) {
          recordOrder(campId, adGroupId, adGroupName, offer, 'TRAVELOKA', dateStr, rev);
        }
      });
    }

    // 2. Ecomobi (Raw_EC): Sub1 cột 21, Sub3 cột 23, Ngày cột 31, Advertiser cột 3, Hoa hồng cột 34
    if (jsonEC && jsonEC.table && jsonEC.table.rows) {
      jsonEC.table.rows.forEach(r => {
        const c = r.c;
        if (!c) return;
        const sub1 = String(c[21]?.v || '');
        const matchCamp = sub1.match(/\b(2\d{10})\b/);
        const matchAdGroup = sub1.match(/\b(1\d{11})\b/);
        const campId = matchCamp ? matchCamp[1] : '';
        const adGroupId = matchAdGroup ? matchAdGroup[1] : '';
        const adGroupName = String(c[23]?.v || '');
        const advertiser = String(c[3]?.v || 'Ecomobi Offer');
        const dateStr = c[31] ? String(c[31].f || c[31].v || '') : '';
        const rev = typeof c[34]?.v === 'number' ? c[34].v : (typeof c[33]?.v === 'number' ? c[33].v : parseNum(c[34] || c[33]));
        if (campId) {
          recordOrder(campId, adGroupId, adGroupName, advertiser, 'TRIP', dateStr, rev);
        }
      });
    }

    // 3. Adpia (Raw_AP): UTM cột 11, Sản phẩm cột 4, Ngày cột 19 (hoặc cột 0), Hoa hồng cột 22
    if (jsonAP && jsonAP.table && jsonAP.table.rows) {
      jsonAP.table.rows.forEach(r => {
        const c = r.c;
        if (!c) return;
        const utm = String(c[11]?.v || '');
        const matchCamp = utm.match(/\b(2\d{10})\b/);
        const matchAdGroup = utm.match(/\b(1\d{11})\b/);
        const campId = matchCamp ? matchCamp[1] : '';
        const adGroupId = matchAdGroup ? matchAdGroup[1] : '';
        const prod = String(c[4]?.v || c[1]?.v || 'Adpia Product');
        const dateStr = c[19] ? String(c[19].f || c[19].v || '') : (c[0] ? String(c[0].f || c[0].v || '') : '');
        const rev = typeof c[22]?.v === 'number' ? c[22].v : (typeof c[21]?.v === 'number' ? c[21].v : parseNum(c[22] || c[21]));
        if (campId) {
          recordOrder(campId, adGroupId, '', prod, 'TRAVELOKA', dateStr, rev);
        }
      });
    }

    // Chuyển productStats sang mảng để hiển thị
    productsList = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
  }

  function setLoading(isLoading) {
    if (elBtnSync) {
      elBtnSync.disabled = isLoading;
    }
    if (elSyncSpinner) {
      elSyncSpinner.style.display = isLoading ? 'inline-block' : 'none';
    }
  }

  // Tính toán Momentum 3 ngày gần nhất (So sánh tốc độ tiêu tiền vs ra đơn)
  function calculateCampMomentum(dailyStats, dailyOrders) {
    if (!dailyStats || dailyStats.length === 0) return { type: 'stable', label: 'Bình thường' };

    // Sắp xếp theo ngày giảm dần
    const sorted = [...dailyStats].sort((a, b) => b.date - a.date);
    const last3Days = sorted.slice(0, 3);
    const cost3D = last3Days.reduce((sum, d) => sum + d.cost, 0);

    // Tính doanh thu 3 ngày gần nhất
    const now = sorted[0]?.date || new Date();
    const threshold3D = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
    const rev3D = (dailyOrders || [])
      .filter(o => o.date >= threshold3D)
      .reduce((sum, o) => sum + o.revenue, 0);

    if (cost3D > 100000 && rev3D === 0) {
      return { type: 'bleeding', label: '🔥 Đốt tiền 3D: -' + formatCurrency(cost3D) };
    }
    if (rev3D > 0 && cost3D > 0 && (rev3D / cost3D) >= 2.0) {
      return { type: 'surging', label: '🚀 3D Surging (ROAS ' + (rev3D / cost3D).toFixed(1) + 'x)' };
    }
    return { type: 'stable', label: 'Bình thường' };
  }

  // Parse dữ liệu từ bảng Dashboard
  function parseSheetData(json) {
    const rows = json.table.rows || [];
    rawCampaigns = [];

    // Lấy thông tin khoảng ngày ở dòng đầu
    periodMeta = { from: '', to: '' };
    if (rows.length > 1) {
      const r0 = rows[0]?.c || [];
      const r1 = rows[1]?.c || [];

      // Định dạng ngày có thể ở r0 hoặc r1 tuỳ sheet
      [r0, r1].forEach(r => {
        for (let i = 0; i < r.length; i++) {
          const val = r[i]?.v;
          const formatted = r[i]?.f || val;
          if (val === 'Từ ngày:' && r[i + 1]) {
            periodMeta.from = r[i + 1].f || r[i + 1].v || '';
          }
          if (val === 'Đến ngày:' && r[i + 1]) {
            periodMeta.to = r[i + 1].f || r[i + 1].v || '';
          }
        }
      });
    }

    if (elPeriodBadge) {
      if (periodMeta.from && periodMeta.to) {
        const displayRange = `${formatToDisplayVnDate(periodMeta.from)} → ${formatToDisplayVnDate(periodMeta.to)}`;
        if (elPeriodBadgeText) {
          elPeriodBadgeText.textContent = displayRange;
        } else {
          elPeriodBadge.textContent = displayRange;
        }
        elPeriodBadge.style.display = 'inline-flex';

        if (elHeaderPeriodText) {
          elHeaderPeriodText.textContent = displayRange;
        }

        // Luôn cập nhật chính xác giá trị vào 2 ô input ngày theo chu kỳ vừa chọn (định dạng dd/mm/yyyy)
        if (elStartDateInput && periodMeta.from) {
          elStartDateInput.value = formatToDisplayVnDate(periodMeta.from);
        }
        if (elEndDateInput && periodMeta.to) {
          elEndDateInput.value = formatToDisplayVnDate(periodMeta.to);
        }
      } else {
        elPeriodBadge.style.display = 'none';
        if (elHeaderPeriodText) {
          const tabName = TABS_CONFIG[currentTabKey]?.name || 'Mặc định';
          elHeaderPeriodText.textContent = tabName;
        }
      }
    }

    // Các dòng dữ liệu chiến dịch bắt đầu từ dòng index 2 hoặc 3 (có chứa Tên Tài Khoản, ID, Cost...)
    for (let i = 0; i < rows.length; i++) {
      const c = rows[i].c;
      if (!c || c.length < 13) continue;

      const account = c[0]?.v ? String(c[0].v).trim() : '';
      const campId = c[1]?.v ? String(c[1].v).trim() : '';
      const campName = c[2]?.v ? String(c[2].v).trim() : '';

      // Bỏ qua các dòng tiêu đề, bộ lọc thời gian, dòng TỔNG CỘNG hoặc config hệ thống
      if (
        !account ||
        account === 'Tên Tài Khoản' ||
        account.includes('Chọn Tài Khoản') ||
        account.includes('Từ ngày:') ||
        account.includes('Đến ngày:') ||
        account.toUpperCase().includes('TỔNG CỘNG') ||
        campId.toUpperCase().includes('TỔNG CỘNG') ||
        campName.toUpperCase().includes('TỔNG CỘNG') ||
        campId.includes('Từ ngày:') ||
        campId.includes('Đến ngày:') ||
        campName.includes('Đến ngày:') ||
        campName.includes('Từ ngày:') ||
        campId.includes('/') // Loại bỏ nếu campId là định dạng ngày như '01/11/2026'
      ) {
        continue;
      }

      const cost = parseNum(c[3]);
      const clicks = parseNum(c[4]);
      const cpc = parseNum(c[5]);
      const conv = parseNum(c[6]);
      const cr = parseNum(c[7]); // Tỷ lệ chuyển đổi % (CR)
      const cpa = parseNum(c[8]);
      const delayDays = parseNum(c[9]);
      const revenue = parseNum(c[10]);
      const profit = parseNum(c[11]);
      const roas = parseNum(c[12]);
      const note = c[14]?.v ? String(c[14].v).trim() : '';

      // CTR lấy từ Data_TongHop theo campId
      const ctr = ctrMap[campId] !== undefined ? ctrMap[campId] : 0;

      // Tính RPC (Revenue Per Click = Giá trần hòa vốn)
      const rpc = clicks > 0 ? (revenue / clicks) : 0;

      // Tính Momentum 3 ngày gần đây (đốt tiền hay đang bứt phá)
      const dailyStats = dailyStatsMap[campId] || [];
      const dailyOrders = dailyOrdersMap[campId] || [];
      const momentum = calculateCampMomentum(dailyStats, dailyOrders);

      // Tự động nhận diện sàn và thời hạn Cookie
      let platform = 'OTHER';
      let cookieDays = 14; // Mặc định
      const fullText = (account + ' ' + campName).toUpperCase();

      if (fullText.includes('SHOPEE')) {
        platform = 'SHOPEE';
        cookieDays = 7;
      } else if (fullText.includes('TRIP')) {
        platform = 'TRIP';
        cookieDays = 30;
      } else if (fullText.includes('TRAVELOKA')) {
        platform = 'TRAVELOKA';
        cookieDays = 14;
      }

      // Xác định trạng thái phân loại
      let statusType = 'normal';
      if (profit > 0 && roas >= 2) statusType = 'scaling'; // Lời tốt
      else if (profit > 0) statusType = 'profitable'; // Lời nhẹ
      else if (profit < 0) statusType = 'losing'; // Đang lỗ

      // Nếu đang ở chu kỳ mới nhất và camp có chi phí nhưng chưa có đơn do độ trễ T-2
      let displayNote = note;
      if (conv === 0 && cost > 0 && delayDays >= 2) {
        displayNote = `⏳ Đang chờ sàn trả đơn (Trễ ~${delayDays.toFixed(1)}d)`;
        statusType = 'warning';
      }

      if (note.includes('Cookie') || note.includes('đã tắt') || note.includes('CẮT LỖ')) {
        statusType = 'disabled';
      } else if (note.includes('CẢNH BÁO') || note.includes('ĐANG LỖ')) {
        statusType = 'warning';
      }

      rawCampaigns.push({
        account,
        campId,
        campName,
        platform,
        cookieDays,
        cost,
        originalCost: cost,
        clicks,
        originalClicks: clicks,
        cpc,
        conv,
        originalConv: conv,
        cr,
        ctr,
        originalCtr: ctr,
        cpa,
        delayDays,
        revenue,
        originalRevenue: revenue,
        profit,
        originalProfit: profit,
        roas,
        originalRoas: roas,
        rpc,
        momentum,
        note: displayNote,
        statusType
      });
    }
  }

  function parseNum(cell) {
    if (!cell || cell.v === null || cell.v === undefined) return 0;
    if (typeof cell.v === 'number') return cell.v;
    const str = String(cell.v).replace(/\./g, '').replace(/,/g, '.').replace('%', '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  function populateAccountFilter() {
    if (!elAccountFilter) return;
    const currentVal = elAccountFilter.value;
    const accounts = [...new Set(rawCampaigns.map(c => c.account).filter(Boolean))].sort();

    elAccountFilter.innerHTML = '<option value="ALL">Tất cả tài khoản (' + rawCampaigns.length + ' camp)</option>';
    accounts.forEach(acc => {
      const count = rawCampaigns.filter(c => c.account === acc).length;
      const opt = document.createElement('option');
      opt.value = acc;
      opt.textContent = `${acc} (${count})`;
      elAccountFilter.appendChild(opt);
    });

    if (accounts.includes(currentVal)) {
      elAccountFilter.value = currentVal;
    }
  }

  function applyCustomDateFilter() {
    const startVal = elStartDateInput ? elStartDateInput.value.trim() : '';
    const endVal = elEndDateInput ? elEndDateInput.value.trim() : '';

    if (!startVal || !endVal) {
      alert('Vui lòng nhập cả Ngày bắt đầu và Ngày kết thúc (định dạng dd/mm/yyyy).');
      return;
    }

    const startDate = parseFlexibleDate(startVal);
    const endDate = parseFlexibleDate(endVal);

    if (!startDate || !endDate) {
      alert('Định dạng ngày không hợp lệ. Vui lòng nhập đúng định dạng ngày/tháng/năm (VD: 01/11/2026).');
      return;
    }

    // Set mốc thời gian 00:00:00 và 23:59:59
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      alert('Ngày bắt đầu không được lớn hơn Ngày kết thúc.');
      return;
    }

    // Đồng bộ lại giá trị chuẩn vào ô input (dd/mm/yyyy)
    if (elStartDateInput) elStartDateInput.value = formatVnDate(startDate);
    if (elEndDateInput) elEndDateInput.value = formatVnDate(endDate);

    // Cập nhật badge hiển thị
    const customRangeDisplay = `${formatVnDate(startDate)} → ${formatVnDate(endDate)}`;
    if (elHeaderPeriodText) {
      elHeaderPeriodText.textContent = `${customRangeDisplay} (Tùy chọn)`;
    }
    if (elPeriodBadge) {
      if (elPeriodBadgeText) {
        elPeriodBadgeText.textContent = customRangeDisplay;
      }
      elPeriodBadge.style.display = 'inline-flex';
    }

    if (elLagStatusNotice) {
      elLagStatusNotice.innerHTML = `📅 <em>Đang lọc tùy chọn: ${formatVnDate(startDate)} → ${formatVnDate(endDate)}</em>`;
      elLagStatusNotice.style.color = '#34d399';
    }

    if (elBtnResetDateFilter) {
      elBtnResetDateFilter.style.display = 'inline-flex';
    }

    // Tính toán lại Chi phí, Doanh thu, Clicks, CTR theo khoảng ngày đã chọn
    let hasDailyMatch = false;
    rawCampaigns.forEach(c => {
      const dailyList = dailyStatsMap[c.campId];
      const ordersList = dailyOrdersMap[c.campId];

      // 1. Tính toán chi phí, click, ctr theo khoảng ngày
      let periodCost = 0;
      let periodClicks = 0;
      let sumWeightedCtr = 0;
      let hasCostData = false;

      if (dailyList && dailyList.length > 0) {
        dailyList.forEach(item => {
          if (item.date >= startDate && item.date <= endDate) {
            periodCost += item.cost;
            periodClicks += item.clicks;
            sumWeightedCtr += item.ctr * (item.clicks > 0 ? item.clicks : 1);
            hasCostData = true;
          }
        });
      }

      // 2. Tính toán doanh thu và số đơn theo khoảng ngày từ các sàn Affiliate
      let periodRevenue = 0;
      let periodConv = 0;
      let hasRevenueData = false;

      if (ordersList && ordersList.length > 0) {
        ordersList.forEach(item => {
          if (item.date >= startDate && item.date <= endDate) {
            periodRevenue += item.revenue;
            periodConv++;
            hasRevenueData = true;
          }
        });
      }

      if (hasCostData || hasRevenueData) {
        hasDailyMatch = true;
        c.cost = hasCostData ? periodCost : 0;
        c.clicks = hasCostData ? periodClicks : 0;
        c.cpc = c.clicks > 0 ? (c.cost / c.clicks) : 0;
        c.ctr = c.clicks > 0 ? (sumWeightedCtr / c.clicks) : 0;

        c.revenue = hasRevenueData ? periodRevenue : 0;
        c.conv = hasRevenueData ? periodConv : 0;

        c.profit = c.revenue - c.cost;
        c.roas = c.cost > 0 ? (c.revenue / c.cost) : (c.revenue > 0 ? 99 : 0);
        c.cr = c.clicks > 0 ? (c.conv / c.clicks) : 0;

        // Cập nhật lại statusType sau khi tính lại lời lãi theo ngày
        if (c.profit > 0 && c.roas >= 2) c.statusType = 'scaling';
        else if (c.profit > 0) c.statusType = 'profitable';
        else if (c.profit < 0) c.statusType = 'losing';
        else c.statusType = 'normal';
      } else {
        // Nếu không có bất kỳ log chi phí hoặc doanh thu nào trong khoảng ngày này
        c.cost = 0;
        c.clicks = 0;
        c.cpc = 0;
        c.ctr = 0;
        c.revenue = 0;
        c.conv = 0;
        c.profit = 0;
        c.roas = 0;
        c.cr = 0;
        c.statusType = 'normal';
      }
    });

    applyFilters();

    if (typeof showToast === 'function') {
      showToast(`Đã lọc từ ${formatVnDate(startDate)} đến ${formatVnDate(endDate)}!`);
    }
  }

  // Khôi phục lại bộ lọc ngày về chu kỳ gốc
  function resetDateFilter() {
    rawCampaigns.forEach(c => {
      c.cost = c.originalCost !== undefined ? c.originalCost : c.cost;
      c.revenue = c.originalRevenue !== undefined ? c.originalRevenue : c.revenue;
      c.clicks = c.originalClicks !== undefined ? c.originalClicks : c.clicks;
      c.conv = c.originalConv !== undefined ? c.originalConv : c.conv;
      c.ctr = c.originalCtr !== undefined ? c.originalCtr : c.ctr;
      c.cpc = c.clicks > 0 ? (c.cost / c.clicks) : 0;
      c.profit = c.revenue - c.cost;
      c.roas = c.cost > 0 ? (c.revenue / c.cost) : (c.revenue > 0 ? 99 : 0);
      c.cr = c.clicks > 0 ? (c.conv / c.clicks) : 0;

      if (c.profit > 0 && c.roas >= 2) c.statusType = 'scaling';
      else if (c.profit > 0) c.statusType = 'profitable';
      else if (c.profit < 0) c.statusType = 'losing';
      else c.statusType = 'normal';
    });

    // Reset lại ngày trên 2 ô input về ngày mặc định của chu kỳ
    if (periodMeta.from && periodMeta.to) {
      if (elStartDateInput) elStartDateInput.value = formatToDisplayVnDate(periodMeta.from);
      if (elEndDateInput) elEndDateInput.value = formatToDisplayVnDate(periodMeta.to);

      const displayRange = `${formatToDisplayVnDate(periodMeta.from)} → ${formatToDisplayVnDate(periodMeta.to)}`;
      if (elPeriodBadgeText) {
        elPeriodBadgeText.textContent = displayRange;
      }
      if (elHeaderPeriodText) {
        elHeaderPeriodText.textContent = displayRange;
      }
      if (elPeriodBadge) {
        elPeriodBadge.style.display = 'inline-flex';
      }
    } else {
      if (elPeriodBadge) elPeriodBadge.style.display = 'none';
      if (elHeaderPeriodText) {
        const tabName = TABS_CONFIG[currentTabKey]?.name || 'Mặc định';
        elHeaderPeriodText.textContent = tabName;
      }
    }

    if (elLagStatusNotice) {
      elLagStatusNotice.innerHTML = '';
    }

    if (elBtnResetDateFilter) {
      elBtnResetDateFilter.style.display = 'none';
    }

    applyFilters();

    if (typeof showToast === 'function') {
      showToast('Đã đặt lại bộ lọc ngày về chu kỳ mặc định!');
    }
  }

  function applyFilters() {
    const selectedAccount = elAccountFilter ? elAccountFilter.value : 'ALL';
    const selectedStatus = elStatusFilter ? elStatusFilter.value : 'ALL';
    const query = elSearchInput ? elSearchInput.value.toLowerCase().trim() : '';

    filteredCampaigns = rawCampaigns.filter(c => {
      if (selectedAccount !== 'ALL' && c.account !== selectedAccount) return false;
      if (selectedStatus === 'PROFIT' && c.profit <= 0) return false;
      if (selectedStatus === 'LOSS' && c.profit >= 0) return false;
      if (selectedStatus === 'WARNING' && c.statusType !== 'warning' && c.statusType !== 'losing') return false;
      if (selectedStatus === 'SCALING' && c.statusType !== 'scaling') return false;
      if (selectedStatus === 'BLEEDING' && (!c.momentum || c.momentum.type !== 'bleeding')) return false;
      if (selectedStatus === 'SURGING' && (!c.momentum || c.momentum.type !== 'surging')) return false;

      if (query) {
        const matchName = c.campName.toLowerCase().includes(query);
        const matchId = c.campId.toLowerCase().includes(query);
        const matchAcc = c.account.toLowerCase().includes(query);
        const matchNote = c.note.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchAcc && !matchNote) return false;
      }
      return true;
    });

    renderKpis();
    renderCharts();
    sortAndRender();
  }

  function renderKpis() {
    const totalCost = filteredCampaigns.reduce((sum, c) => sum + c.cost, 0);
    const totalRevenue = filteredCampaigns.reduce((sum, c) => sum + c.revenue, 0);
    const totalProfit = filteredCampaigns.reduce((sum, c) => sum + c.profit, 0);
    const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalConv = filteredCampaigns.reduce((sum, c) => sum + c.conv, 0);

    const overallRoas = totalCost > 0 ? (totalRevenue / totalCost) : 0;
    const avgCpc = totalClicks > 0 ? (totalCost / totalClicks) : 0;
    const avgCr = totalClicks > 0 ? ((totalConv / totalClicks) * 100) : 0;
    
    // Tính CTR bình quân gia quyền theo clicks
    let totalCtrClicks = 0;
    let sumCtrClicks = 0;
    filteredCampaigns.forEach(c => {
      if (c.ctr > 0 && c.clicks > 0) {
        sumCtrClicks += c.ctr * c.clicks;
        totalCtrClicks += c.clicks;
      }
    });
    const avgCtr = totalCtrClicks > 0 ? (sumCtrClicks / totalCtrClicks) : 0;

    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
    const profitableCount = filteredCampaigns.filter(c => c.profit > 0).length;

    if (elKpiCost) elKpiCost.textContent = formatCurrency(totalCost);
    if (elKpiRevenue) elKpiRevenue.textContent = formatCurrency(totalRevenue);
    if (elKpiClicks) elKpiClicks.textContent = `${formatNumber(totalClicks)} clicks`;
    if (elKpiOrders) elKpiOrders.textContent = `${formatNumber(totalConv)} đơn (CR: ${avgCr.toFixed(2)}%)`;
    if (elKpiMargin) elKpiMargin.textContent = `${profitMargin.toFixed(1)}% margin`;
    
    if (elKpiProfit) {
      elKpiProfit.textContent = (totalProfit >= 0 ? '+' : '') + formatCurrency(totalProfit);
      elKpiProfit.className = 'kpi-main-num ' + (totalProfit >= 0 ? 'text-success' : 'text-danger');
    }

    if (elKpiRoas) {
      elKpiRoas.textContent = overallRoas.toFixed(2) + 'x';
      elKpiRoas.className = 'kpi-main-num ' + (overallRoas >= 1.5 ? 'text-success' : (overallRoas >= 1 ? 'text-warning' : 'text-danger'));
    }

    if (elKpiCpc) elKpiCpc.textContent = formatCurrency(Math.round(avgCpc));
    if (elKpiCtr) elKpiCtr.textContent = avgCtr > 0 ? avgCtr.toFixed(2) + '%' : '-';
    if (elKpiTotalCamp) elKpiTotalCamp.textContent = `Tổng: ${filteredCampaigns.length} camp`;
    if (elKpiProfitableCamp) elKpiProfitableCamp.textContent = `${profitableCount} / ${filteredCampaigns.length}`;
  }

  function sortAndRender() {
    const { col, dir } = currentSort;
    const multiplier = dir === 'asc' ? 1 : -1;

    filteredCampaigns.sort((a, b) => {
      let valA = a[col];
      let valB = b[col];

      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * multiplier;
      }
      return (valA - valB) * multiplier;
    });

    renderTable();
  }

  function renderTable() {
    if (!elTableBody) return;
    if (elRowCount) {
      elRowCount.textContent = `${filteredCampaigns.length} chiến dịch`;
    }

    if (filteredCampaigns.length === 0) {
      elTableBody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center py-8 text-muted">
            Không tìm thấy chiến dịch nào phù hợp với bộ lọc hiện tại.
          </td>
        </tr>
      `;
      return;
    }

    const html = filteredCampaigns.map((c, index) => {
      const isProfitable = c.profit > 0;
      const profitClass = isProfitable ? 'text-success font-bold' : (c.profit < 0 ? 'text-danger font-bold' : 'text-muted');
      const profitSign = c.profit > 0 ? '+' : '';
      
      let badgeClass = 'badge-neutral';
      if (c.statusType === 'scaling') badgeClass = 'badge-success';
      else if (c.statusType === 'profitable') badgeClass = 'badge-info';
      else if (c.statusType === 'warning') badgeClass = 'badge-warning';
      else if (c.statusType === 'losing' || c.statusType === 'disabled') badgeClass = 'badge-danger';

      const adGroups = adGroupMap[c.campId] ? Object.values(adGroupMap[c.campId]) : [];
      const hasAdGroups = adGroups.length > 0;
      const isExpanded = expandedRows.has(c.campId);

      // RPC indicator
      const rpcVal = Math.round(c.rpc || 0);
      const cpcVal = Math.round(c.cpc || 0);
      const isSafeBid = rpcVal > 0 && cpcVal <= rpcVal;
      const rpcClass = isSafeBid ? 'rpc-safe' : (rpcVal > 0 ? 'rpc-danger' : 'text-muted');

      // Momentum Chip
      let momentumHtml = '';
      if (c.momentum && c.momentum.type === 'bleeding') {
        momentumHtml = `<span class="momentum-badge momentum-bleeding" title="3 ngày qua tiêu tiền nhưng chưa ra đơn">${c.momentum.label}</span>`;
      } else if (c.momentum && c.momentum.type === 'surging') {
        momentumHtml = `<span class="momentum-badge momentum-surging" title="3 ngày qua ROAS tăng vọt">${c.momentum.label}</span>`;
      }

      let subRowHtml = '';
      if (isExpanded && hasAdGroups) {
        subRowHtml = `
          <tr class="sub-table-row">
            <td colspan="15" style="padding: 0;">
              <div class="sub-table-box">
                <div class="text-xs font-semibold text-main mb-2 flex items-center gap-2">
                  <span>📂 Chi tiết nhóm quảng cáo (Ad Groups) ra đơn của Campaign:</span>
                  <span class="acc-tag">${adGroups.length} nhóm</span>
                </div>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                  <thead>
                    <tr style="color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.08);">
                      <th style="padding: 6px 8px; text-align: left;">AdGroup ID & Tên</th>
                      <th style="padding: 6px 8px; text-align: right;">Số Đơn Sàn Ghi Nhận</th>
                      <th style="padding: 6px 8px; text-align: right;">Tổng Hoa Hồng Thực Nhận</th>
                      <th style="padding: 6px 8px; text-align: right;">Hoa Hồng TB / Đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${adGroups.sort((a,b) => b.revenue - a.revenue).map(ag => `
                      <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                        <td style="padding: 6px 8px;">
                          <div class="font-mono text-main">${escapeHtml(ag.name)}</div>
                          <div class="text-xs text-muted font-mono">ID: ${ag.id}</div>
                        </td>
                        <td class="text-right font-mono" style="padding: 6px 8px;">${formatNumber(ag.orders)} đơn</td>
                        <td class="text-right font-mono font-semibold" style="padding: 6px 8px; color: #34d399;">${formatCurrency(ag.revenue)}</td>
                        <td class="text-right font-mono text-muted" style="padding: 6px 8px;">${formatCurrency(ag.orders > 0 ? ag.revenue / ag.orders : 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        `;
      }

      return `
        <tr>
          <td class="text-center text-muted text-xs">
            ${hasAdGroups ? `<button type="button" class="btn-toggle-sub ${isExpanded ? 'expanded' : ''}" data-camp="${c.campId}" title="Xem nhóm quảng cáo">›</button>` : ''}
            ${index + 1}
          </td>
          <td>
            <div class="font-semibold text-main text-sm text-truncate" style="max-width: 280px;" title="${escapeHtml(c.campName)}">
              ${escapeHtml(c.campName)}
            </div>
            <div class="text-xs text-muted font-mono flex items-center gap-2 mt-1">
              <span>ID: ${c.campId}</span>
              <span class="acc-tag">${escapeHtml(c.account)}</span>
              ${momentumHtml}
            </div>
          </td>
          <td class="text-right font-mono font-medium">${formatCurrency(c.cost)}</td>
          <td class="text-right font-mono font-medium" style="color: #34d399;">${formatCurrency(c.revenue)}</td>
          <td class="text-right font-mono ${profitClass}">${profitSign}${formatCurrency(c.profit)}</td>
          <td class="text-center font-mono">
            <span class="roas-chip ${c.roas >= 2 ? 'roas-high' : (c.roas >= 1 ? 'roas-med' : 'roas-low')}">
              ${c.roas.toFixed(2)}x
            </span>
          </td>
          <td class="text-right font-mono text-muted">${formatNumber(c.clicks)}</td>
          <td class="text-right font-mono text-muted">${formatCurrency(cpcVal)}</td>
          <td class="text-right font-mono ${rpcClass}" title="Doanh thu bình quân trên mỗi click (Giá trần hòa vốn tuyệt đối)">
            ${rpcVal > 0 ? formatCurrency(rpcVal) : '-'}
          </td>
          <td class="text-right font-mono text-muted">${c.cr > 0 ? (c.cr < 1 ? (c.cr * 100).toFixed(2) + '%' : c.cr.toFixed(2) + '%') : '-'}</td>
          <td class="text-right font-mono font-semibold">${formatNumber(c.conv)}</td>
          <td class="text-right font-mono font-medium" style="color: #60a5fa;">${c.ctr > 0 ? c.ctr.toFixed(2) + '%' : '-'}</td>
          <td class="text-center">
            <span class="cookie-chip cookie-${c.platform.toLowerCase()}" title="Thời hạn lưu Cookie: ${c.cookieDays} ngày">
              ${c.cookieDays}D
            </span>
          </td>
          <td class="text-center">
            <span class="delay-pill ${c.delayDays > 3 ? 'delay-warn' : 'delay-normal'}" title="Độ trễ ghi nhận đơn hàng: ${c.delayDays.toFixed(1)} ngày">
              ${c.delayDays > 0 ? c.delayDays.toFixed(1) + 'd' : '-'}
            </span>
          </td>
          <td>
            <div class="decision-badge ${badgeClass}">
              ${escapeHtml(c.note || 'Bình thường')}
            </div>
          </td>
        </tr>
        ${subRowHtml}
      `;
    }).join('');

    elTableBody.innerHTML = html;
  }

  function updateSortIcons() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
      const col = th.getAttribute('data-sort');
      const icon = th.querySelector('.sort-icon');
      if (!icon) return;

      if (currentSort.col === col) {
        icon.textContent = currentSort.dir === 'asc' ? '▲' : '▼';
        th.classList.add('sorted');
      } else {
        icon.textContent = '⇅';
        th.classList.remove('sorted');
      }
    });
  }

  function switchViewTab(tabName) {
    currentViewTab = tabName;
    [elBtnTabDashboard, elBtnTabDetails, elBtnTabProducts].forEach(btn => btn && btn.classList.remove('active'));
    [elTabContentDashboard, elTabContentDetails, elTabContentProducts].forEach(tab => tab && tab.classList.remove('active'));

    if (tabName === 'dashboard') {
      if (elBtnTabDashboard) elBtnTabDashboard.classList.add('active');
      if (elTabContentDashboard) elTabContentDashboard.classList.add('active');
      renderCharts();
    } else if (tabName === 'details') {
      if (elBtnTabDetails) elBtnTabDetails.classList.add('active');
      if (elTabContentDetails) elTabContentDetails.classList.add('active');
    } else if (tabName === 'products') {
      if (elBtnTabProducts) elBtnTabProducts.classList.add('active');
      if (elTabContentProducts) elTabContentProducts.classList.add('active');
      renderProductsTable();
    }
  }

  function renderProductsTable() {
    if (!elProductTableBody) return;
    
    // Hiển thị danh sách từng Chiến Dịch -> Phân tích cơ cấu Loại Sản Phẩm đã bán
    if (elProductCount) elProductCount.textContent = `${filteredCampaigns.length} chiến dịch`;

    if (filteredCampaigns.length === 0) {
      elProductTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-8 text-muted">
            Không tìm thấy chiến dịch nào phù hợp với bộ lọc.
          </td>
        </tr>
      `;
      return;
    }

    const html = filteredCampaigns.map((c, idx) => {
      const isProfitable = c.profit > 0;
      const profitClass = isProfitable ? 'text-success font-bold' : (c.profit < 0 ? 'text-danger font-bold' : 'text-muted');
      const profitSign = c.profit > 0 ? '+' : '';
      const isExpanded = expandedCategories.has(c.campId);

      // Lấy danh sách loại sản phẩm của chiến dịch này
      const prodMap = campProductsMap[c.campId] || {};
      const prodItems = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue);
      const totalCampOrders = prodItems.reduce((sum, p) => sum + p.orders, 0) || c.conv;
      const totalCampRev = prodItems.reduce((sum, p) => sum + p.revenue, 0) || c.revenue;

      // Tìm loại sản phẩm chiếm nhiều nhất
      let topItemDesc = 'Chưa có đơn';
      if (prodItems.length > 0) {
        const top = prodItems[0];
        const orderPct = totalCampOrders > 0 ? Math.round((top.orders / totalCampOrders) * 100) : 0;
        const revPct = totalCampRev > 0 ? Math.round((top.revenue / totalCampRev) * 100) : 0;
        topItemDesc = `<strong style="color: #38bdf8;">${escapeHtml(top.name)}</strong> (${revPct}% doanh thu, ${orderPct}% đơn)`;
      }

      // Khối chi tiết cơ cấu sản phẩm (khi click nút ›)
      let subProdRows = '';
      if (isExpanded) {
        if (prodItems.length === 0) {
          subProdRows = `
            <tr class="sub-table-row">
              <td colspan="10" style="padding: 0;">
                <div class="sub-table-box" style="margin: 8px 16px 14px 28px; padding: 12px; color: #94a3b8;">
                  ℹ️ Chiến dịch này chưa ghi nhận chi tiết loại sản phẩm nào từ file raw của sàn.
                </div>
              </td>
            </tr>
          `;
        } else {
          subProdRows = `
            <tr class="sub-table-row">
              <td colspan="10" style="padding: 0;">
                <div class="sub-table-box" style="margin: 8px 16px 14px 28px;">
                  <div class="text-xs font-semibold text-main mb-2 flex items-center justify-between">
                    <span style="color: #38bdf8;">📦 Cơ cấu chi tiết các Loại Sản Phẩm đã bán trong chiến dịch "${escapeHtml(c.campName)}":</span>
                    <span class="acc-tag font-mono">${prodItems.length} loại sản phẩm</span>
                  </div>
                  <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <thead>
                      <tr style="color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.08);">
                        <th style="padding: 6px 8px; text-align: left;">Loại Sản Phẩm / Dịch Vụ</th>
                        <th style="padding: 6px 8px; text-align: right;">Số Đơn Hàng</th>
                        <th style="padding: 6px 8px; text-align: right;">Tỷ Trọng Đơn</th>
                        <th style="padding: 6px 8px; text-align: right;">Tổng Hoa Hồng (VND)</th>
                        <th style="padding: 6px 8px; text-align: right;">Tỷ Trọng Doanh Thu</th>
                        <th style="padding: 6px 8px; text-align: right;">Hoa Hồng TB / Đơn</th>
                        <th style="padding: 6px 8px; text-align: left;">Đánh Giá Tỷ Trọng</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${prodItems.map((p, pIdx) => {
                        const oPct = totalCampOrders > 0 ? ((p.orders / totalCampOrders) * 100).toFixed(1) : '0';
                        const rPct = totalCampRev > 0 ? ((p.revenue / totalCampRev) * 100).toFixed(1) : '0';
                        const avgRev = p.orders > 0 ? (p.revenue / p.orders) : 0;
                        const isDominant = pIdx === 0 && prodItems.length > 1;

                        return `
                          <tr style="border-bottom: 1px solid rgba(255,255,255,0.04); ${isDominant ? 'background: rgba(56, 189, 248, 0.05);' : ''}">
                            <td style="padding: 6px 8px;">
                              <div class="font-semibold text-main">${escapeHtml(p.name)}</div>
                            </td>
                            <td class="text-right font-mono" style="padding: 6px 8px;">${formatNumber(p.orders)} đơn</td>
                            <td class="text-right font-mono text-muted" style="padding: 6px 8px;">${oPct}%</td>
                            <td class="text-right font-mono font-bold" style="padding: 6px 8px; color: #34d399;">${formatCurrency(p.revenue)}</td>
                            <td class="text-right font-mono font-bold" style="padding: 6px 8px; color: #38bdf8;">${rPct}%</td>
                            <td class="text-right font-mono text-muted" style="padding: 6px 8px;">${formatCurrency(avgRev)}</td>
                            <td style="padding: 6px 8px;">
                              ${isDominant ? '<span class="decision-badge badge-success" style="font-size: 10px; padding: 2px 6px;">👑 Chiếm nhiều nhất</span>' : '<span class="text-muted" style="font-size: 11px;">Đóng góp phụ</span>'}
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          `;
        }
      }

      return `
        <tr>
          <td class="text-center text-muted text-xs">
            <button type="button" class="btn-toggle-sub ${isExpanded ? 'expanded' : ''}" data-camp-product="${c.campId}" title="Xem cơ cấu loại sản phẩm">›</button>
            ${idx + 1}
          </td>
          <td>
            <div class="font-bold text-main text-sm text-truncate" style="max-width: 280px;" title="${escapeHtml(c.campName)}">
              ${escapeHtml(c.campName)}
            </div>
            <div class="text-xs text-muted font-mono flex items-center gap-2 mt-1">
              <span>ID: ${c.campId}</span>
              <span class="acc-tag">${escapeHtml(c.account)}</span>
            </div>
          </td>
          <td class="text-right font-mono font-medium">${formatCurrency(c.cost)}</td>
          <td class="text-right font-mono font-medium" style="color: #34d399;">${formatCurrency(c.revenue)}</td>
          <td class="text-right font-mono ${profitClass}">${profitSign}${formatCurrency(c.profit)}</td>
          <td class="text-center font-mono">
            <span class="roas-chip ${c.roas >= 2 ? 'roas-high' : (c.roas >= 1 ? 'roas-med' : 'roas-low')}">
              ${c.roas.toFixed(2)}x
            </span>
          </td>
          <td class="text-right font-mono font-semibold">${formatNumber(c.conv)} đơn</td>
          <td>
            <div class="text-xs" style="line-height: 1.4;">
              ${topItemDesc}
            </div>
          </td>
        </tr>
        ${subProdRows}
      `;
    }).join('');

    elProductTableBody.innerHTML = html;
  }

  // Khởi tạo và vẽ các biểu đồ Chart.js
  function renderCharts() {
    if (typeof Chart === 'undefined') return;

    // 1. Phân bổ theo sàn / sản phẩm
    renderPlatformComparisonChart();
    // 2. Lợi nhuận theo sàn
    renderPlatformProfitChart();
    // 3. Top 6 chiến dịch sinh lời cao nhất
    renderTopProfitableChart();
    // 4. Top 6 chiến dịch đang lỗ cần cắt
    renderTopLosingChart();
  }


  // Tự động nhận diện ngành hàng / nhóm sản phẩm từ Tên Chiến Dịch Google Ads
  function detectCampaignCategory(campName) {
    const name = (campName || '').toLowerCase();
    
    // 1. Ẩm thực / Ăn uống (Culinary)
    if (name.includes('culinary') || name.includes('ẩm thực') || name.includes('cul') || name.includes('kopi')) {
      return 'Ẩm Thực & Nhà Hàng (Culinary)';
    }
    // 2. Khách sạn / Lưu trú / Phòng ngủ (Hotel / Accommodation)
    if (name.includes('giường') || name.includes('typebed') || name.includes('hotel') || name.includes('urmah') || name.includes('stay') || name.includes('phòng')) {
      return 'Khách Sạn & Lưu Trú (Hotel / Bed)';
    }
    // 3. Điểm đến & Tour du lịch (Destinations & Tours)
    if (name.includes('destination') || name.includes('du lịch') || name.includes('des') || name.includes('wis') || name.includes('hol ban') ||
        name.includes('bali') || name.includes('jogja') || name.includes('jakata') || name.includes('hàn') || name.includes('korea') ||
        name.includes('tw') || name.includes('sing') || name.includes('all-20/05')) {
      return 'Điểm Đến & Du Lịch (Destinations)';
    }
    // 4. Trải nghiệm & Hoạt động / Vui chơi (Activities & Experience)
    if (name.includes('activities') || name.includes('exp act') || name.includes('exp ') || name.includes('act')) {
      return 'Hoạt Động & Vui Chơi (Activities)';
    }
    // 5. Cẩm nang du lịch / Hướng dẫn / Tips (Guides & Tips)
    if (name.includes('guide') || name.includes('cẩm nang') || name.includes('tips') || name.includes('info')) {
      return 'Cẩm Nang & Hướng Dẫn (Guides & Tips)';
    }
    // 6. Shopee E-commerce / Hàng tiêu dùng (Shopee Products)
    if (name.includes('ins') || name.includes('mak') || name.includes('sea') || name.includes('list') || name.includes('product') || name.includes('shopee')) {
      return 'Thương Mại Điện Tử (Shopee / Retail)';
    }
    return 'Chiến Dịch Tổng Hợp (General / DSA)';
  }

  function getPlatformAggregatedData() {
    const stats = {
      'Traveloka': { cost: 0, revenue: 0, profit: 0, clicks: 0, conv: 0 },
      'Trip.com': { cost: 0, revenue: 0, profit: 0, clicks: 0, conv: 0 },
      'Shopee': { cost: 0, revenue: 0, profit: 0, clicks: 0, conv: 0 },
      'Khác': { cost: 0, revenue: 0, profit: 0, clicks: 0, conv: 0 }
    };

    filteredCampaigns.forEach(c => {
      let key = 'Khác';
      if (c.platform === 'TRAVELOKA') key = 'Traveloka';
      else if (c.platform === 'TRIP') key = 'Trip.com';
      else if (c.platform === 'SHOPEE') key = 'Shopee';

      stats[key].cost += c.cost;
      stats[key].revenue += c.revenue;
      stats[key].profit += c.profit;
      stats[key].clicks += c.clicks;
      stats[key].conv += c.conv;
    });

    return stats;
  }

  function getCategoryAggregatedData() {
    const stats = {};

    filteredCampaigns.forEach(c => {
      const cat = detectCampaignCategory(c.campName);
      if (!stats[cat]) {
        stats[cat] = { cost: 0, revenue: 0, profit: 0, clicks: 0, conv: 0, campsCount: 0, campaigns: [] };
      }
      stats[cat].cost += c.cost;
      stats[cat].revenue += c.revenue;
      stats[cat].profit += c.profit;
      stats[cat].clicks += c.clicks;
      stats[cat].conv += c.conv;
      stats[cat].campsCount += 1;
      stats[cat].campaigns.push(c);
    });

    return stats;
  }

  function renderPlatformComparisonChart() {
    const canvas = document.getElementById('chartPlatformComparison');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstances.platformComparison) chartInstances.platformComparison.destroy();

    const data = getPlatformAggregatedData();
    const labels = Object.keys(data).filter(k => data[k].cost > 0 || data[k].revenue > 0);
    const costs = labels.map(k => Math.round(data[k].cost));
    const revenues = labels.map(k => Math.round(data[k].revenue));

    const isLight = document.documentElement.classList.contains('light-theme') || (document.body && document.body.classList.contains('light-theme'));
    const textMuted = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';

    chartInstances.platformComparison = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Chi Phí (Cost)',
            data: costs,
            backgroundColor: 'rgba(244, 63, 94, 0.75)',
            borderColor: '#f43f5e',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Doanh Thu',
            data: revenues,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textMuted, font: { family: 'Plus Jakarta Sans', size: 12 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { ticks: { color: textMuted }, grid: { color: gridColor } },
          y: {
            ticks: {
              color: textMuted,
              callback: (v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + ' tr' : (v / 1000).toFixed(0) + ' k')
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  function renderPlatformProfitChart() {
    const canvas = document.getElementById('chartPlatformProfit');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstances.platformProfit) chartInstances.platformProfit.destroy();

    const data = getPlatformAggregatedData();
    const labels = Object.keys(data).filter(k => data[k].cost > 0 || data[k].revenue > 0);
    const profits = labels.map(k => Math.round(data[k].profit));
    const bgColors = profits.map(p => p >= 0 ? 'rgba(59, 130, 246, 0.75)' : 'rgba(244, 63, 94, 0.75)');

    chartInstances.platformProfit = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Lợi Nhuận Ròng (VND)',
          data: profits,
          backgroundColor: bgColors,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Lợi nhuận: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: {
            ticks: {
              color: '#94a3b8',
              callback: (v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + ' tr' : (v / 1000).toFixed(0) + ' k')
            },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        }
      }
    });
  }

  function renderTopProfitableChart() {
    const canvas = document.getElementById('chartTopProfitable');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstances.topProfitable) chartInstances.topProfitable.destroy();

    const top6 = [...filteredCampaigns].filter(c => c.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 6);
    const labels = top6.length > 0 ? top6.map(c => c.campName.length > 24 ? c.campName.slice(0, 24) + '...' : c.campName) : ['Không có camp lời'];
    const profits = top6.length > 0 ? top6.map(c => Math.round(c.profit)) : [0];

    const isLight = document.documentElement.classList.contains('light-theme') || (document.body && document.body.classList.contains('light-theme'));
    const textColorY = isLight ? '#0f172a' : '#f8fafc';
    const textMuted = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';

    chartInstances.topProfitable = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Lợi nhuận',
          data: profits,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Lợi nhuận: +${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: textMuted,
              callback: (v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + ' tr' : (v / 1000).toFixed(0) + ' k')
            },
            grid: { color: gridColor }
          },
          y: { ticks: { color: textColorY, font: { size: 11, weight: '600' } }, grid: { display: false } }
        }
      }
    });
  }

  function renderTopLosingChart() {
    const canvas = document.getElementById('chartTopLosing');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstances.topLosing) chartInstances.topLosing.destroy();

    const losing6 = [...filteredCampaigns].filter(c => c.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 6);
    const labels = losing6.length > 0 ? losing6.map(c => c.campName.length > 24 ? c.campName.slice(0, 24) + '...' : c.campName) : ['Không có camp lỗ'];
    const losses = losing6.length > 0 ? losing6.map(c => Math.round(c.profit)) : [0];

    const isLight = document.documentElement.classList.contains('light-theme') || (document.body && document.body.classList.contains('light-theme'));
    const textColorY = isLight ? '#0f172a' : '#f8fafc';
    const textMuted = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';

    chartInstances.topLosing = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Lỗ (VND)',
          data: losses,
          backgroundColor: 'rgba(244, 63, 94, 0.75)',
          borderColor: '#f43f5e',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Mức lỗ: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: textMuted,
              callback: (v) => (v <= -1000000 ? (v / 1000000).toFixed(1) + ' tr' : (v / 1000).toFixed(0) + ' k')
            },
            grid: { color: gridColor }
          },
          y: { ticks: { color: textColorY, font: { size: 11, weight: '600' } }, grid: { display: false } }
        }
      }
    });
  }

  // Lắng nghe sự kiện chuyển đổi giao diện Sáng / Tối để vẽ lại biểu đồ mượt mà
  window.addEventListener('appThemeChanged', () => {
    if (filteredCampaigns && filteredCampaigns.length > 0) {
      renderCharts();
    }
  });

  // Utilities
  function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return '0\u00A0₫';
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + '\u00A0₫';
  }

  function formatNumber(val) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return new Intl.NumberFormat('vi-VN').format(Math.round(val));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseVnDate(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      return new Date(y, m, d);
    }
    return null;
  }

  // Hỗ trợ parse ngày đa dạng: dd/mm/yyyy, dd-mm-yyyy hoặc yyyy-mm-dd
  function parseFlexibleDate(str) {
    if (!str) return null;
    str = String(str).trim();

    // Định dạng yyyy-mm-dd
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
      const p = str.split(/[-/]/);
      return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    }

    // Định dạng dd/mm/yyyy hoặc dd-mm-yyyy
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(str)) {
      const p = str.split(/[-/]/);
      const d = parseInt(p[0], 10);
      const m = parseInt(p[1], 10) - 1;
      let y = parseInt(p[2], 10);
      if (y < 100) y += 2000;
      return new Date(y, m, d);
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatVnDate(date) {
    if (!date || isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function formatToDisplayVnDate(dateStr) {
    if (!dateStr) return '';
    const parsed = parseFlexibleDate(dateStr);
    return parsed ? formatVnDate(parsed) : String(dateStr);
  }

  function formatToInputDate(dateStr) {
    if (!dateStr) return '';
    const parsed = parseFlexibleDate(dateStr);
    if (!parsed) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Khởi tạo bộ lịch Popup nội bộ (Datepicker Popup)
  function initCustomDatepickers() {
    [elStartDateInput, elEndDateInput].forEach(input => {
      if (!input) return;
      const wrapper = input.closest('.datepicker-wrapper');
      if (!wrapper) return;

      let popup = null;
      let viewYear = new Date().getFullYear();
      let viewMonth = new Date().getMonth();

      function openPicker() {
        closeAllPickers();
        const currentVal = parseFlexibleDate(input.value) || new Date();
        viewYear = currentVal.getFullYear();
        viewMonth = currentVal.getMonth();

        popup = document.createElement('div');
        popup.className = 'datepicker-popup';
        wrapper.appendChild(popup);
        renderCalendar();
      }

      function closePicker() {
        if (popup) {
          popup.remove();
          popup = null;
        }
      }

      function renderCalendar() {
        if (!popup) return;
        const monthNames = [
          'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
          'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
          'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];

        const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const selectedDate = parseFlexibleDate(input.value);
        const today = new Date();

        let html = `
          <div class="dp-header">
            <button type="button" class="dp-nav-btn" id="dpPrev">‹</button>
            <div class="dp-title">${monthNames[viewMonth]} / ${viewYear}</div>
            <button type="button" class="dp-nav-btn" id="dpNext">›</button>
          </div>
          <div class="dp-weekdays">
            <span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span>
          </div>
          <div class="dp-days-grid">
        `;

        for (let i = 0; i < firstDay; i++) {
          html += `<div class="dp-day-cell empty"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
          const isSelected = selectedDate &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === viewMonth &&
            selectedDate.getFullYear() === viewYear;

          const isToday = today.getDate() === day &&
            today.getMonth() === viewMonth &&
            today.getFullYear() === viewYear;

          let classes = 'dp-day-cell';
          if (isSelected) classes += ' selected';
          if (isToday) classes += ' today';

          html += `<div class="${classes}" data-day="${day}">${day}</div>`;
        }

        html += `</div>`;
        popup.innerHTML = html;

        popup.querySelector('#dpPrev').addEventListener('click', (e) => {
          e.stopPropagation();
          viewMonth--;
          if (viewMonth < 0) {
            viewMonth = 11;
            viewYear--;
          }
          renderCalendar();
        });

        popup.querySelector('#dpNext').addEventListener('click', (e) => {
          e.stopPropagation();
          viewMonth++;
          if (viewMonth > 11) {
            viewMonth = 0;
            viewYear++;
          }
          renderCalendar();
        });

        popup.querySelectorAll('.dp-day-cell[data-day]').forEach(cell => {
          cell.addEventListener('click', (e) => {
            e.stopPropagation();
            const d = parseInt(cell.getAttribute('data-day'), 10);
            const chosenDate = new Date(viewYear, viewMonth, d);
            input.value = formatVnDate(chosenDate);
            closePicker();
          });
        });
      }

      input.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popup) closePicker();
        else openPicker();
      });

      document.addEventListener('click', (e) => {
        if (popup && !wrapper.contains(e.target)) {
          closePicker();
        }
      });
    });
  }

  function closeAllPickers() {
    document.querySelectorAll('.datepicker-popup').forEach(p => p.remove());
  }

  // Khởi động khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

