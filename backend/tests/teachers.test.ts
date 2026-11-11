import fs from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { uploadUrlToDiskPath } from '../src/utils/upload.js';
import { app } from './helpers.js';
import { cleanupPeople, createCourse, createUser, type TestUser } from './people.fixture.js';

// GiangVienController: /api/GiangVien/* (+ phan upload/xoa avatar dung chung voi HocSinh/Parent).
const P = 'TEST_PEOPLE_TCH_';
let gv: TestUser, noProfile: TestUser, courseA: string, courseB: string;
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

beforeAll(async () => {
  await cleanupPeople(P);
  gv = await createUser(P, 'gv', 'Giao_Vien', `${P}GV Mot`);
  noProfile = await createUser(P, 'nogv', 'Giao_Vien', `${P}GV moi`, false);
  courseA = await createCourse(P, 'KH A');
  courseB = await createCourse(P, 'KH B');
});

afterAll(async () => {
  await cleanupPeople(P);
  await prisma.$disconnect();
});

describe('/api/GiangVien profile', () => {
  it('chua dang nhap -> 401', async () => {
    expect((await request(app).get('/api/GiangVien/my-profile')).status).toBe(401);
  });

  it('my-profile tra du truong, chuoi rong thay null', async () => {
    const res = await request(app).get('/api/GiangVien/my-profile').set(gv.headers);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'Lấy thông tin cá nhân thành công.' });
    expect(res.body.data).toEqual({
      hoTen: `${P}GV Mot`,
      email: gv.email,
      anhDaiDien: '',
      soDienThoai: '',
      queQuan: '',
      trinhDoChuyenMon: 'Cu nhan',
      hocVi: '',
      kinhNghiemGiangDay: '',
    });
  });

  it('update-profile: TrinhDoChuyenMon/HoTen bat buoc (binding), HoTen rong -> 400', async () => {
    let res = await request(app).put('/api/GiangVien/update-profile').set(gv.headers).send({ hoTen: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({ TrinhDoChuyenMon: ['The TrinhDoChuyenMon field is required.'] });
    res = await request(app).put('/api/GiangVien/update-profile').set(gv.headers).send({ trinhDoChuyenMon: 'a' });
    expect(res.body.errors).toEqual({ HoTen: ['The HoTen field is required.'] });
    res = await request(app).put('/api/GiangVien/update-profile').set(gv.headers).send({ HoTen: '  ', TrinhDoChuyenMon: 'a' });
    expect(res.body).toMatchObject({ code: 'TEACHER_PROFILE_NAME_REQUIRED', message: 'Họ và tên là bắt buộc.' });
  });

  it('update-profile cap nhat va chuan hoa (trim, rong -> null)', async () => {
    const res = await request(app)
      .put('/api/GiangVien/update-profile')
      .set(gv.headers)
      .send({ HoTen: `  ${P}GV Mot  `, SoDienThoai: ' 0912 ', QueQuan: '  ', TrinhDoChuyenMon: ' Thac si ', HocVi: null, KinhNghiemGiangDay: '5 nam', AnhDaiDien: '' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Cập nhật thông tin thành công.');
    expect(res.body.data).toEqual({
      hoTen: `${P}GV Mot`,
      email: gv.email,
      anhDaiDien: '',
      soDienThoai: '0912',
      queQuan: '',
      trinhDoChuyenMon: 'Thac si',
      hocVi: '',
      kinhNghiemGiangDay: '5 nam',
    });
    const row = await prisma.giangvien.findUnique({ where: { MaGiangVien: gv.profileId! } });
    expect(row).toMatchObject({ QueQuan: null, HocVi: null, NguoiSua: gv.userId });
  });

  it('update-profile tao moi ban ghi giangvien neu chua co', async () => {
    const res = await request(app).put('/api/GiangVien/update-profile').set(noProfile.headers).send({ HoTen: `${P}GV moi`, TrinhDoChuyenMon: 'X' });
    expect(res.status).toBe(200);
    const row = await prisma.giangvien.findFirst({ where: { MaNguoiDung: noProfile.userId } });
    expect(row).toMatchObject({ TrinhDoChuyenMon: 'X', TrangThai: true, DaXoa: false, NguoiTao: noProfile.userId });
  });

  it('upload-avatar: thieu file, file rong, sai duoi, thanh cong roi xoa', async () => {
    let res = await request(app).post('/api/GiangVien/upload-avatar').set(gv.headers);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({ file: ['The file field is required.'] });
    res = await request(app).post('/api/GiangVien/upload-avatar').set(gv.headers).attach('file', Buffer.alloc(0), 'a.png');
    expect(res.body.code).toBe('AVATAR_FILE_REQUIRED');
    res = await request(app).post('/api/GiangVien/upload-avatar').set(gv.headers).attach('file', Buffer.from('x'), 'a.txt');
    expect(res.body.code).toBe('AVATAR_INVALID_EXTENSION');
    res = await request(app).post('/api/GiangVien/upload-avatar').set(gv.headers).attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), 'big.jpg');
    expect(res.body.code).toBe('AVATAR_FILE_TOO_LARGE');

    res = await request(app).post('/api/GiangVien/upload-avatar').set(gv.headers).attach('File', PNG, 'Anh.PNG');
    expect(res.status).toBe(200);
    const first = res.body.data.avatarUrl as string;
    expect(first).toMatch(new RegExp(`^/uploads/avatars/avatar_${gv.userId.replaceAll('-', '')}_[0-9a-f]{32}\\.png$`));
    expect(fs.existsSync(uploadUrlToDiskPath(first)!)).toBe(true);

    // upload lan 2: file cu bi xoa, tai nguyen cu bi xoa mem
    res = await request(app).post('/api/GiangVien/upload-avatar').set(gv.headers).attach('file', PNG, 'b.webp');
    const second = res.body.data.avatarUrl as string;
    expect(fs.existsSync(uploadUrlToDiskPath(first)!)).toBe(false);
    const resources = await prisma.tainguyenluutru.findMany({ where: { MaNguoiDung: gv.userId }, orderBy: { ThoiGianTao: 'asc' } });
    expect(resources.find((r) => r.Link === first)).toMatchObject({ DaXoa: true, TrangThai: false });
    expect(resources.find((r) => r.Link === second)).toMatchObject({ DaXoa: false, TenTaiNguyen: second.split('/').pop() });
    expect((await request(app).get('/api/GiangVien/my-profile').set(gv.headers)).body.data.anhDaiDien).toBe(second);

    res = await request(app).delete('/api/GiangVien/delete-avatar').set(gv.headers);
    expect(res.body).toMatchObject({ success: true, message: 'Xóa ảnh đại diện thành công.', data: { avatarUrl: '' } });
    expect(fs.existsSync(uploadUrlToDiskPath(second)!)).toBe(false);
    expect((await prisma.nguoidung.findUnique({ where: { MaNguoiDung: gv.userId } }))?.AnhDaiDien).toBeNull();
  });
});

describe('/api/GiangVien specializations + assign-courses', () => {
  it('assign-courses: giang vien khong ton tai -> 404, thieu CourseIds -> 400', async () => {
    let res = await request(app).post('/api/GiangVien/assign-courses').set(gv.headers).send({ maGiangVien: '11111111-1111-1111-1111-111111111111', courseIds: [] });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEACHER_NOT_FOUND');
    res = await request(app).post('/api/GiangVien/assign-courses').set(gv.headers).send({ courseIds: null });
    expect(res.body.errors).toEqual({ CourseIds: ['The CourseIds field is required.'] });
  });

  it('assign-courses thay toan bo danh sach, specializations doc lai', async () => {
    let res = await request(app).post('/api/GiangVien/assign-courses').set(gv.headers).send({ maGiangVien: gv.profileId, courseIds: [courseA, courseB] });
    expect(res.body).toMatchObject({ success: true, message: 'Phân công môn dạy cho giảng viên thành công.', data: null });
    res = await request(app).post('/api/GiangVien/assign-courses').set(gv.headers).send({ maGiangVien: gv.profileId, courseIds: [courseB] });
    expect(res.status).toBe(200);
    res = await request(app).get('/api/GiangVien/specializations').set(gv.headers);
    expect(res.body.message).toBe('Lấy danh sách chuyên môn giảng viên thành công.');
    const mine = res.body.data.find((t: { maGiangVien: string }) => t.maGiangVien === gv.profileId);
    expect(mine).toEqual({ maGiangVien: gv.profileId, tenGiangVien: `${P}GV Mot`, courseIds: [courseB], courseNames: [`${P}KH B`] });
  });
});
