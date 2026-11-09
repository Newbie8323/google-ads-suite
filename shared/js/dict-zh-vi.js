// =========================================================================
// SHARED DICTIONARY: CHINESE -> VIETNAMESE (TỪ ĐIỂN TIẾNG TRUNG PHỒN THỂ / GIẢN THỂ)
// =========================================================================
(function(global) {
  const dictStr = "天氣:thời tiết|气温:nhiệt độ|氣溫:nhiệt độ|温度:nhiệt độ|溫度:nhiệt độ|下雨:trời mưa|氣候:khí hậu|預報:dự báo|一週:1 tuần|一周:1 tuần|捷運:tàu điện MRT|捷 運:tàu điện MRT|地鐵:tàu điện ngầm|地 鐵:tàu điện ngầm|巴士:xe bus|觀光列車:tàu du lịch|客運:xe khách|高鐵:tàu cao tốc HSR|火車:tàu hỏa|機鐵:tàu sân bay|地圖:bản đồ|交通:giao thông|路線:tuyến đường|時刻表:giờ tàu/xe|首班車:chuyến đầu|末班車:chuyến cuối|機場:sân bay|口岸:cửa khẩu|航廈:nhà ga sân bay|航班:chuyến bay|機票:vé máy bay|班機:chuyến bay|動態:lịch bay/trạng thái|抵達:hạ cánh/đến|出發:khởi hành|航空:hãng bay|必買:phải mua|必 買:phải mua|伴手禮:quà lưu niệm|伴 手 禮:quà lưu niệm|手信:quà biếu|手 信:quà biếu|特產:đặc sản|名產:đặc sản|購物:mua sắm|退稅:hoàn thuế|免稅:miễn thuế|景點:điểm tham quan|一日遊:tour 1 ngày|一 日 遊:tour 1 ngày|攻略:cẩm nang|推薦:gợi ý/review|親子:gia đình/trẻ em|門票:vé tham quan|行程:lịch trình|必去:phải đi|打卡:check-in|美食:ẩm thực|餐廳:nhà hàng|小吃:ăn vặt|必吃:phải ăn|夜市:chợ đêm|酒店:khách sạn|飯店:khách sạn|民宿:homestay|溫泉:suối nước nóng|住宿:lưu trú|訂房:đặt phòng|簽證:visa|入境:nhập cảnh|入境卡:tờ khai nhập cảnh|護照:hộ chiếu|漫遊:roaming|匯率:tỷ giá|換錢:đổi tiền|換 錢:đổi tiền|放假:nghỉ lễ|連假:nghỉ lễ dài|公眾假期:ngày nghỉ lễ|公眾 假期:ngày nghỉ lễ|行事曆:lịch nghỉ|穿搭:phối đồ|香港:Hồng Kông|深圳:Thâm Quyến|日本:Nhật Bản|韓國:Hàn Quốc|台北:Đài Bắc|台灣:Đài Loan|上海:Thượng Hải|澳門:Ma Cao|台中:Đài Trung|高雄:Cao Hùng|台南:Đài Nam|桃園:Đào Viên|東京:Tokyo|大阪:Osaka|沖繩:Okinawa|首爾:Seoul|釜山:Busan|九寨溝:Cửu Trại Câu|成都:Thành Đô|貴陽:Quý Dương|廣州:Quảng Châu|北京:Bắc Kinh|名古屋:Nagoya|福岡:Fukuoka|曼谷:Bangkok|泰國:Thái Lan|越南:Việt Nam|長榮:Eva Air|華航:China Airlines|星宇:Starlux|越捷:Vietjet|國泰:Cathay Pacific|可以:có thể|怎麼:làm sao|多少:bao nhiêu|時間:thời gian|費用:chi phí|價格:giá cả|行李:hành lý|規定:quy định|限制:hạn chế|過期:hết hạn|換證:đổi hộ chiếu/thẻ|查詢:tra cứu";

  const dict = Object.fromEntries(
    dictStr.split('|').map(function(pair) {
      const idx = pair.indexOf(':');
      if (idx === -1) return [pair.trim(), ''];
      return [pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()];
    })
  );

  global.ZH_TO_VI_DICT = dict;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = dict;
  }
})(typeof window !== 'undefined' ? window : globalThis);
