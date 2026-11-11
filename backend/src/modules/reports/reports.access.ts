import { prisma } from '../../db.js';
import type { AuthUser } from '../../middlewares/auth.js';
import { hasPermission } from '../../middlewares/permission.js';

// Ban .NET chi kiem tra "da dang nhap" cho 2 dashboard duoi day, nen bat ky ai (hoc sinh, phu huynh...)
// cung xem duoc du lieu cua MOI hoc sinh / MOI lop chi bang cach doi id tren URL. Ban Node gioi han:
//
//   class/{id}/dashboard : admin (PAGE_ADMIN_REPORTS_VIEW) hoac giao vien dang day lop do
//   student/dashboard    : admin; hoc sinh -> chinh minh; phu huynh -> con minh;
//                          giao vien -> hoc sinh thuoc lop minh day (dung lop classId neu co)

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const active = { OR: [{ DaXoa: null }, { DaXoa: false }] };
const lc = (s: string | null | undefined) => (s ?? '').toLowerCase();

const isAdmin = (user: AuthUser) => hasPermission(user.userId, 'PAGE_ADMIN_REPORTS_VIEW');

async function teacherTeachesClass(teacherId: string, classId: string): Promise<boolean> {
  return (await prisma.giangvienlophoc.count({ where: { MaGiangVien: teacherId, MaLopHoc: classId, ...active } })) > 0;
}

export async function canViewClassDashboard(user: AuthUser, classId: string): Promise<boolean> {
  if (await isAdmin(user)) return true;
  if (user.role === 'Giao_Vien' && user.profileId) return teacherTeachesClass(user.profileId, classId);
  return false;
}

export async function canViewStudentDashboard(user: AuthUser, studentId: string, classId: string): Promise<boolean> {
  if (await isAdmin(user)) return true;
  const pid = user.profileId;
  if (!pid) return false;

  switch (user.role) {
    case 'Hoc_Sinh':
      return lc(pid) === lc(studentId);
    case 'Phu_Huynh':
      return (await prisma.phuhuynhhocsinh.count({ where: { MaPhuHuynh: pid, MaHocSinh: studentId, ...active } })) > 0;
    case 'Giao_Vien': {
      const specificClass = classId && classId !== EMPTY_GUID;
      const classIds = specificClass
        ? (await teacherTeachesClass(pid, classId)) ? [classId] : []
        : (await prisma.giangvienlophoc.findMany({ where: { MaGiangVien: pid, ...active }, select: { MaLopHoc: true } })).map((x) => x.MaLopHoc);
      if (classIds.length === 0) return false;
      return (await prisma.hocsinhlophoc.count({ where: { MaHocSinh: studentId, MaLopHoc: { in: classIds }, ...active } })) > 0;
    }
    default:
      return false;
  }
}

/** Body 403 giong middleware phan quyen (frontend dua sang trang /unauthorized). */
export const FORBIDDEN_BODY = { message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 };
