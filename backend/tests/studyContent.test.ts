import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, auth, login } from './helpers.js';

// Test module noi dung hoc tap (Admin/Teacher/StudentStudyContentController).
// Tu tao khoa hoc / lop TEST_STUDY_* gan voi giao vien + hoc sinh demo, xoa sach (ca file upload) khi xong.
const { prisma } = await import('../src/db.js');
const { uploadUrlToDiskPath } = await import('../src/utils/upload.js');

const K = randomUUID();
const L1 = randomUUID(); // giao vien phu trach + hoc sinh dang hoc
const L2 = randomUUID(); // thuoc khoa hoc nhung giao vien khong phu trach, hoc sinh da roi lop
const L3 = randomUUID(); // khong thuoc khoa hoc
const uploadedLinks: string[] = [];

let teacherId = '';
let studentId = '';

beforeAll(async () => {
  const teacher = await login('teacher');
  const student = await login('student');
  teacherId = (await prisma.giangvien.findFirstOrThrow({ where: { MaNguoiDung: teacher.userId } })).MaGiangVien;
  studentId = (await prisma.hocsinh.findFirstOrThrow({ where: { MaNguoiDung: student.userId } })).MaHocSinh;

  // Ngay tham gia = hom nay de lop nay la "lop hien tai" moi nhat cua hoc sinh demo.
  const n = new Date();
  const today = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  await prisma.khoahoc.create({ data: { MaKhoaHoc: K, TenKhoaHoc: 'TEST_STUDY_Khoa' } });
  await prisma.lophoc.createMany({
    data: [
      { MaLopHoc: L1, TenLop: 'TEST_STUDY_Lop 1', NgayBatDau: new Date('2026-01-05'), NgayKetThuc: new Date('2026-12-31') },
      { MaLopHoc: L2, TenLop: 'TEST_STUDY_Lop 2', NgayBatDau: new Date('2025-09-01'), NgayKetThuc: new Date('2026-02-28') },
      { MaLopHoc: L3, TenLop: 'TEST_STUDY_Lop 3' },
    ],
  });
  await prisma.chitietkhoahoc_lophoc.createMany({
    data: [
      { MaKhoaHoc: K, MaLopHoc: L1 },
      { MaKhoaHoc: K, MaLopHoc: L2 },
    ],
  });
  await prisma.giangvienlophoc.create({ data: { MaLopHoc: L1, MaGiangVien: teacherId } });
  await prisma.hocsinhlophoc.createMany({
    data: [
      { MaLopHoc: L1, MaHocSinh: studentId, NgayThamGia: today },
      { MaLopHoc: L2, MaHocSinh: studentId, NgayThamGia: new Date('2025-09-01'), NgayRoiLop: new Date('2026-03-01') },
    ],
  });
});

afterAll(async () => {
  const chapters = await prisma.chuonghoc.findMany({ where: { MaKhoaHoc: K }, select: { MaChuong: true } });
  const ids = chapters.map((c) => c.MaChuong);
  const docs = await prisma.tailieu.findMany({ where: { MaChuongHoc: { in: ids } }, select: { LinkTaiLieu: true } });
  const links = [...new Set([...uploadedLinks, ...docs.map((d) => d.LinkTaiLieu).filter((l): l is string => !!l)])];
  await prisma.tainguyenluutru.deleteMany({ where: { Link: { in: links } } });
  await prisma.tailieu.deleteMany({ where: { MaChuongHoc: { in: ids } } });
  await prisma.chuonghoc.deleteMany({ where: { MaKhoaHoc: K } });
  await prisma.hocsinhlophoc.deleteMany({ where: { MaLopHoc: { in: [L1, L2, L3] } } });
  await prisma.giangvienlophoc.deleteMany({ where: { MaLopHoc: { in: [L1, L2, L3] } } });
  await prisma.chitietkhoahoc_lophoc.deleteMany({ where: { MaKhoaHoc: K } });
  await prisma.lophoc.deleteMany({ where: { MaLopHoc: { in: [L1, L2, L3] } } });
  await prisma.khoahoc.deleteMany({ where: { MaKhoaHoc: K } });
  for (const l of links) {
    const p = uploadUrlToDiskPath(l);
    if (p) fs.rmSync(p, { force: true });
  }
  await prisma.$disconnect();
});

describe('AdminStudyContent', () => {
  it('GET courses: co khoa hoc TEST_STUDY voi so lop / so chuong', async () => {
    const res = await request(app).get('/api/AdminStudyContent/courses').set(await auth('admin'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'Lấy danh sách khóa học thành công.' });
    const course = res.body.data.find((c: { maKhoaHoc: string }) => c.maKhoaHoc === K);
    expect(course).toEqual({ maKhoaHoc: K, tenKhoaHoc: 'TEST_STUDY_Khoa', soLopHoc: 2, soChuongHoc: 0 });
  });

  it('GET courses/{id}/classes: dung dinh dang, guid sai -> 404 rong, khong ton tai -> 404 json', async () => {
    const res = await request(app).get(`/api/AdminStudyContent/courses/${K}/classes`).set(await auth('admin'));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { maLopHoc: L1, maKhoaHoc: K, tenLop: 'TEST_STUDY_Lop 1', ngayBatDau: '2026-01-05', ngayKetThuc: '2026-12-31', laLopHienTai: false },
      { maLopHoc: L2, maKhoaHoc: K, tenLop: 'TEST_STUDY_Lop 2', ngayBatDau: '2025-09-01', ngayKetThuc: '2026-02-28', laLopHienTai: false },
    ]);

    const bad = await request(app).get('/api/AdminStudyContent/courses/abc/classes').set(await auth('admin'));
    expect(bad.status).toBe(404);
    expect(bad.text).toBe('');

    const missing = await request(app).get(`/api/AdminStudyContent/courses/${randomUUID()}/classes`).set(await auth('admin'));
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('STUDY_CONTENT_COURSE_NOT_FOUND');
  });

  it('GET contents: query sai -> 400 ValidationProblem; lop khong thuoc khoa -> 404', async () => {
    const bad = await request(app).get('/api/AdminStudyContent/contents?courseId=abc').set(await auth('admin'));
    expect(bad.status).toBe(400);
    expect(bad.headers['content-type']).toContain('application/problem+json');
    expect(bad.body.errors).toEqual({ courseId: ["The value 'abc' is not valid."] });

    const res = await request(app).get(`/api/AdminStudyContent/contents?courseId=${K}&classId=${L3}`).set(await auth('admin'));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('STUDY_CONTENT_CLASS_NOT_FOUND');
  });

  it('giao vien khong co quyen STUDY_CONTENT_ADMIN -> 403', async () => {
    const res = await request(app).get('/api/AdminStudyContent/courses').set(await auth('teacher'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 });
  });
});

describe('TeacherStudyContent + StudentStudyContent: chuong -> tai lieu -> tai xuong -> xoa', () => {
  let chapterId = '';
  let fileDocId = '';
  let fileLink = '';
  let linkDocId = '';

  it('GET courses / classes chi gom lop duoc phan cong', async () => {
    const courses = await request(app).get('/api/TeacherStudyContent/courses').set(await auth('teacher'));
    expect(courses.status).toBe(200);
    expect(courses.body.data.find((c: { maKhoaHoc: string }) => c.maKhoaHoc === K)).toEqual({
      maKhoaHoc: K,
      tenKhoaHoc: 'TEST_STUDY_Khoa',
      soLopHoc: 1,
      soChuongHoc: 0,
    });
    const classes = await request(app).get(`/api/TeacherStudyContent/courses/${K}/classes`).set(await auth('teacher'));
    expect(classes.status).toBe(200);
    expect(classes.body.data.map((c: { maLopHoc: string }) => c.maLopHoc)).toEqual([L1]);
  });

  it('POST chapters: validate + tao chuong (ThuTu tu tang), lop khong phu trach -> 403', async () => {
    const t = await auth('teacher');
    const empty = await request(app).post('/api/TeacherStudyContent/chapters').set(t).send({});
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe('STUDY_CONTENT_CONTEXT_REQUIRED');

    const nullName = await request(app)
      .post('/api/TeacherStudyContent/chapters')
      .set(t)
      .send({ maKhoaHoc: K, maLopHoc: L1, tenChuong: null });
    expect(nullName.status).toBe(400);
    expect(nullName.body.errors).toEqual({ TenChuong: ['The TenChuong field is required.'] });

    const forbidden = await request(app)
      .post('/api/TeacherStudyContent/chapters')
      .set(t)
      .send({ MaKhoaHoc: K, MaLopHoc: L2, TenChuong: 'TEST_STUDY_x' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('STUDY_CONTENT_FORBIDDEN');

    const res = await request(app)
      .post('/api/TeacherStudyContent/chapters')
      .set(t)
      .send({ MaKhoaHoc: K, MaLopHoc: L1, TenChuong: '  TEST_STUDY_Chuong 1 ', MoTa: '  ', ThuTu: null });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Tạo chương học thành công.');
    expect(res.body.data).toMatchObject({
      maKhoaHoc: K,
      maLopHoc: L1,
      tenLop: 'TEST_STUDY_Lop 1',
      tenChuong: 'TEST_STUDY_Chuong 1',
      moTa: null,
      thuTu: 1,
      taiLieu: [],
    });
    chapterId = res.body.data.maChuong;
  });

  it('PUT chapters/{id}: cap nhat, sai lop -> 404 mismatch', async () => {
    const t = await auth('teacher');
    const mismatch = await request(app)
      .put(`/api/TeacherStudyContent/chapters/${chapterId}`)
      .set(t)
      .send({ MaLopHoc: L2, TenChuong: 'x' });
    expect(mismatch.status).toBe(404);
    expect(mismatch.body.code).toBe('STUDY_CONTENT_CHAPTER_CLASS_MISMATCH');

    const res = await request(app)
      .put(`/api/TeacherStudyContent/chapters/${chapterId}`)
      .set(t)
      .send({ MaLopHoc: L1, TenChuong: 'TEST_STUDY_Chuong 1 (sua)', MoTa: 'mo ta', ThuTu: '3' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ tenChuong: 'TEST_STUDY_Chuong 1 (sua)', moTa: 'mo ta', thuTu: 3 });
  });

  it('POST documents: upload file (ten tieng Viet), sai duoi file -> 400, file + link -> 400', async () => {
    const t = await auth('teacher');
    const badExt = await request(app)
      .post('/api/TeacherStudyContent/documents')
      .set(t)
      .field('MaChuongHoc', chapterId)
      .field('MaLopHoc', L1)
      .attach('File', Buffer.from('MZ'), 'virus.exe');
    expect(badExt.status).toBe(400);
    expect(badExt.body.code).toBe('STUDY_CONTENT_FILE_EXTENSION_INVALID');

    const conflict = await request(app)
      .post('/api/TeacherStudyContent/documents')
      .set(t)
      .field('MaChuongHoc', chapterId)
      .field('MaLopHoc', L1)
      .field('LinkTaiLieu', 'https://example.com/a.pdf')
      .attach('File', Buffer.from('x'), 'a.pdf');
    expect(conflict.status).toBe(400);
    expect(conflict.body.code).toBe('STUDY_CONTENT_DOCUMENT_SOURCE_CONFLICT');

    const res = await request(app)
      .post('/api/TeacherStudyContent/documents')
      .set(t)
      .field('MaChuongHoc', chapterId)
      .field('MaLopHoc', L1)
      .field('TenTaiLieu', '')
      .field('MoTa', 'tai lieu thu')
      .attach('File', Buffer.from('%PDF-1.4 TEST_STUDY'), 'Bài giảng 1.PDF');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Tạo tài liệu thành công.');
    const d = res.body.data;
    expect(d).toMatchObject({
      maChuongHoc: chapterId,
      tenTaiLieu: 'Bài giảng 1.PDF',
      moTa: 'tai lieu thu',
      loaiTaiLieu: 'PDF',
      laLinkNgoai: false,
    });
    expect(d.linkTaiLieu).toMatch(/^\/uploads\/study-materials\/study_[0-9a-f]{32}_[0-9a-f]{32}\.pdf$/);
    expect(d.ngayDang).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(d.ngayDangHienThi).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    fileDocId = d.maTaiLieu;
    fileLink = d.linkTaiLieu;
    uploadedLinks.push(fileLink);
    expect(fs.existsSync(uploadUrlToDiskPath(fileLink)!)).toBe(true);

    const resource = await prisma.tainguyenluutru.findFirst({ where: { Link: fileLink } });
    expect(resource).toMatchObject({ TrangThai: true, DaXoa: false });

    const link = await request(app)
      .post('/api/TeacherStudyContent/documents')
      .set(t)
      .field('MaChuongHoc', chapterId)
      .field('MaLopHoc', L1)
      .field('LinkTaiLieu', 'https://example.com/files/B%C3%A0i%202.docx');
    expect(link.status).toBe(200);
    expect(link.body.data).toMatchObject({ tenTaiLieu: 'Bài 2.docx', loaiTaiLieu: 'Word', laLinkNgoai: true });
    linkDocId = link.body.data.maTaiLieu;
  });

  it('GET contents (giao vien) va current-content (hoc sinh) thay tai lieu', async () => {
    const res = await request(app)
      .get(`/api/TeacherStudyContent/contents?courseId=${K}&classId=${L1}`)
      .set(await auth('teacher'));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ maKhoaHoc: K, tenKhoaHoc: 'TEST_STUDY_Khoa', maLopHoc: L1, tenLop: 'TEST_STUDY_Lop 1' });
    const chapter = res.body.data.noiDungHocTap.find((c: { maChuong: string }) => c.maChuong === chapterId);
    expect(chapter.taiLieu.map((x: { maTaiLieu: string }) => x.maTaiLieu).sort()).toEqual([fileDocId, linkDocId].sort());

    const student = await request(app).get('/api/StudentStudyContent/current-content').set(await auth('student'));
    expect(student.status).toBe(200);
    expect(student.body.message).toBe('Lấy nội dung học tập hiện tại thành công.');
    expect(student.body.data).toMatchObject({ maKhoaHoc: K, maLopHoc: L1 });

    const classes = await request(app).get(`/api/StudentStudyContent/courses/${K}/classes`).set(await auth('student'));
    expect(classes.status).toBe(200);
    expect(classes.body.data.map((c: { maLopHoc: string; laLopHienTai: boolean }) => [c.maLopHoc, c.laLopHienTai])).toEqual([
      [L1, true],
      [L2, false],
    ]);
  });

  it('GET download: file -> header nhu ASP.NET; link ngoai -> 302', async () => {
    for (const [role, url] of [
      ['admin', `/api/AdminStudyContent/documents/${fileDocId}/download`],
      ['teacher', `/api/TeacherStudyContent/documents/${fileDocId}/download?classId=${L1}`],
      ['student', `/api/StudentStudyContent/documents/${fileDocId}/download`],
    ] as const) {
      const res = await request(app).get(url).set(await auth(role)).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe(
        "attachment; filename=\"B_i gi_ng 1.PDF\"; filename*=UTF-8''B%C3%A0i%20gi%E1%BA%A3ng%201.PDF",
      );
      expect((res.body as Buffer).toString()).toBe('%PDF-1.4 TEST_STUDY');
    }

    const redirect = await request(app)
      .get(`/api/StudentStudyContent/documents/${linkDocId}/download?classId=${L1}`)
      .set(await auth('student'));
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com/files/B%C3%A0i%202.docx');

    const mismatch = await request(app)
      .get(`/api/StudentStudyContent/documents/${fileDocId}/download?classId=${L2}`)
      .set(await auth('student'));
    expect(mismatch.status).toBe(404);
    expect(mismatch.body.code).toBe('STUDY_CONTENT_DOCUMENT_CLASS_MISMATCH');
  });

  it('PUT documents/{id}: doi file -> xoa file cu, danh dau tainguyenluutru cu da xoa', async () => {
    const res = await request(app)
      .put(`/api/TeacherStudyContent/documents/${fileDocId}`)
      .set(await auth('teacher'))
      .field('MaLopHoc', L1)
      .field('TenTaiLieu', 'TEST_STUDY_ghi chu.txt')
      .attach('File', Buffer.from('hello'), 'note.txt');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ maTaiLieu: fileDocId, tenTaiLieu: 'TEST_STUDY_ghi chu.txt', loaiTaiLieu: 'Text', moTa: null });
    const newLink = res.body.data.linkTaiLieu as string;
    uploadedLinks.push(newLink);
    expect(newLink).not.toBe(fileLink);
    expect(fs.existsSync(uploadUrlToDiskPath(fileLink)!)).toBe(false);
    expect(await prisma.tainguyenluutru.findFirst({ where: { Link: fileLink } })).toMatchObject({ DaXoa: true, TrangThai: false });
    fileLink = newLink;
  });

  it('DELETE documents/{id} va chapters/{id}: xoa mem + xoa file', async () => {
    const t = await auth('teacher');
    const noClass = await request(app).delete(`/api/TeacherStudyContent/documents/${linkDocId}`).set(t);
    expect(noClass.status).toBe(400);
    expect(noClass.body.code).toBe('STUDY_CONTENT_CLASS_REQUIRED');

    const del = await request(app).delete(`/api/TeacherStudyContent/documents/${linkDocId}?classId=${L1}`).set(t);
    expect(del.status).toBe(200);
    expect(del.body).toMatchObject({ message: 'Xóa tài liệu thành công.', data: { documentId: linkDocId } });

    const delChapter = await request(app).delete(`/api/TeacherStudyContent/chapters/${chapterId}?classId=${L1}`).set(t);
    expect(delChapter.status).toBe(200);
    expect(delChapter.body.data).toEqual({ chapterId });
    expect(fs.existsSync(uploadUrlToDiskPath(fileLink)!)).toBe(false);
    expect(await prisma.tailieu.findUnique({ where: { MaTaiLieu: fileDocId } })).toMatchObject({ DaXoa: true, TrangThai: false });
    expect(await prisma.chuonghoc.findUnique({ where: { MaChuong: chapterId } })).toMatchObject({ DaXoa: true });

    const contents = await request(app).get(`/api/AdminStudyContent/contents?courseId=${K}`).set(await auth('admin'));
    expect(contents.body.data.noiDungHocTap).toEqual([]);
  });

  it('hoc sinh khong co quyen giao vien -> 403', async () => {
    const res = await request(app).get('/api/TeacherStudyContent/courses').set(await auth('student'));
    expect(res.status).toBe(403);
  });
});
