/**
 * AdsInsight Pro - N-Gram & Term Processing Web Worker
 * Chạy ngầm việc tính toán N-Gram trên thread riêng, chống treo UI khi file CSV lớn
 */

self.onmessage = function (e) {
  const { type, data, ngramType, searchFilter, sortColumn, sortOrder } = e.data;

  if (type === 'COMPUTE_NGRAM') {
    const termMap = {};

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const rawTerm = (d.term || '').trim();
      if (!rawTerm) continue;

      // Tách từ chuẩn Unicode
      const words = rawTerm
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      const wordCount = words.length;
      let match = false;

      if (ngramType === 1 && wordCount === 1) match = true;
      else if (ngramType === 2 && wordCount === 2) match = true;
      else if (ngramType === 3 && wordCount === 3) match = true;
      else if (ngramType === 4 && wordCount >= 4) match = true;

      if (match) {
        const key = rawTerm.toLowerCase();
        if (!termMap[key]) {
          termMap[key] = {
            word: rawTerm,
            count: 0,
            clicks: 0,
            impressions: 0,
            cost: 0,
            conversions: 0
          };
        }
        termMap[key].count++;
        termMap[key].clicks += (d.clicks || 0);
        termMap[key].impressions += (d.impressions || 0);
        termMap[key].cost += (d.cost || 0);
        termMap[key].conversions += (d.conversions || 0);
      }
    }

    let list = Object.values(termMap);

    if (searchFilter) {
      const filterLow = searchFilter.toLowerCase();
      list = list.filter(item => item.word.toLowerCase().includes(filterLow));
    }

    // Sắp xếp
    list.sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? comp : -comp;
      }
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortOrder === 'asc' ? (valA - valB) : (valB - valA);
    });

    self.postMessage({
      type: 'NGRAM_RESULT',
      list: list
    });
  }
};

