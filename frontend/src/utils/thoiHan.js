/**
 * Định dạng hạn nộp cho màn học sinh.
 *
 * Trước đây dùng thẳng `new Date(x).toLocaleString('vi-VN')`, cho ra chuỗi
 * "09:06:00 17/8/2026": lẫn giây không ai cần, ngày tháng không có số 0 đứng
 * đầu, và không nói rõ đâu là giờ đâu là ngày.
 */
const THU_TRONG_TUAN = [
  'Chủ nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

const hai = (n) => String(n).padStart(2, '0');

const doiSangDate = (giaTri) => {
  if (!giaTri) return null;
  const d = giaTri instanceof Date ? giaTri : new Date(giaTri);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "09:06 Thứ Hai, ngày 17/08/2026" */
export const dinhDangHanNop = (giaTri) => {
  const d = doiSangDate(giaTri);
  if (!d) return null;

  const gio = `${hai(d.getHours())}:${hai(d.getMinutes())}`;
  const ngay = `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${gio} ${THU_TRONG_TUAN[d.getDay()]}, ngày ${ngay}`;
};

/** Bản ngắn cho dòng phụ dưới tiêu đề: "09:06 ngày 17/08/2026" */
export const dinhDangHanNopNgan = (giaTri) => {
  const d = doiSangDate(giaTri);
  if (!d) return null;

  const gio = `${hai(d.getHours())}:${hai(d.getMinutes())}`;
  const ngay = `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${gio} ngày ${ngay}`;
};

/**
 * Còn bao lâu tới hạn: "Còn 2 ngày 3 giờ", "Còn 45 phút", "Đã quá hạn".
 * Học sinh cần biết còn kịp hay không, chứ mốc thời gian tuyệt đối thì phải
 * tự nhẩm mới ra.
 */
export const moTaThoiGianConLai = (giaTri, moc = new Date()) => {
  const d = doiSangDate(giaTri);
  if (!d) return null;

  const conLaiPhut = Math.floor((d.getTime() - moc.getTime()) / 60000);
  if (conLaiPhut < 0) return 'Đã quá hạn';
  if (conLaiPhut < 1) return 'Sắp hết hạn';
  if (conLaiPhut < 60) return `Còn ${conLaiPhut} phút`;

  const gio = Math.floor(conLaiPhut / 60);
  if (gio < 24) {
    const phutLe = conLaiPhut % 60;
    return phutLe ? `Còn ${gio} giờ ${phutLe} phút` : `Còn ${gio} giờ`;
  }

  const ngay = Math.floor(gio / 24);
  const gioLe = gio % 24;
  return gioLe ? `Còn ${ngay} ngày ${gioLe} giờ` : `Còn ${ngay} ngày`;
};
