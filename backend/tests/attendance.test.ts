import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { app, auth } from './helpers.js';
import { addSession, cleanup, createFixture, DEMO, diffJson, netCall, netToken, type Fixture } from './schedule.fixture.js';

// Tests cho AttendanceController + AdminAttendanceController/AdminAttendanceService.
// So sanh voi backend .NET (5099) cung database neu dang chay.

const P = 'TEST_SCHED_A_';
let fx: Fixture;
let netUp = false;
const s: Record<string, string> = {};
const courses = { k1: randomUUID(), k2: randomUUID() };

async function cleanupAll() {
  await cleanup(P);
  await prisma.chitietkhoahoc_lophoc.deleteMany({ where: { MaKhoaHoc: { in: Object.values(courses) } } });
  await prisma.khoahoc.deleteMany({ where: { TenKhoaHoc: { startsWith: P } } });
}

beforeAll(async () => {
  await prisma.khoahoc.deleteMany({ where: { TenKhoaHoc: { startsWith: P }, chitietkhoahoc_lophoc: { none: {} } } });
  fx = await createFixture(P);
  s.c1a = await addSession(fx.classes.c1, '2031-02-03', 1, 2, fx.rooms.a);
  s.c1b = await addSession(fx.classes.c1, '2031-02-03', 6, 7, fx.rooms.b);
  s.c1c = await addSession(fx.classes.c1, '2031-02-04', 13, 14, null);
  s.c2a = await addSession(fx.classes.c2, '2031-02-05', 3, 3, fx.rooms.a);
  s.c1Deleted = await addSession(fx.classes.c1, '2031-02-06', 1, 1, null, { DaXoa: true });
  await prisma.khoahoc.createMany({
    data: [
      { MaKhoaHoc: courses.k1, TenKhoaHoc: `${P}Khoa B`, TrangThai: true, DaXoa: false },
      { MaKhoaHoc: courses.k2, TenKhoaHoc: `${P}Khoa A`, TrangThai: true, DaXoa: false },
    ],
  });
  await prisma.chitietkhoahoc_lophoc.createMany({
    data: [
      { MaKhoaHoc: courses.k1, MaLopHoc: fx.classes.c1, TrangThai: true, DaXoa: false },
      { MaKhoaHoc: courses.k2, MaLopHoc: fx.classes.c1, TrangThai: true, DaXoa: false },
    ],
  });
  // Lien ket tam (xoa khi cleanup): phu huynh demo -> hoc sinh s1, hoc sinh demo vao lop C1.
  await prisma.phuhuynhhocsinh.create({ data: { MaPhuHuynh: (await prisma.phuhuynh.findFirstOrThrow({ where: { MaNguoiDung: DEMO.parentUserId } })).MaPhuHuynh, MaHocSinh: fx.students.s1, TrangThai: true, DaXoa: false } });
  await prisma.hocsinhlophoc.create({ data: { MaLopHoc: fx.classes.c1, MaHocSinh: DEMO.studentProfileId, TrangThai: true, DaXoa: false } });
  netUp = (await netToken('admin')) !== null;
  if (!netUp) console.warn('[attendance.test] Backend .NET (5099) khong san sang - bo qua so sanh parity.');
}, 60_000);

afterAll(async () => {
  // Lien ket tam voi tai khoan demo
  await prisma.diemdanh.deleteMany({ where: { MaBuoiHoc: { in: Object.values(s) } } });
  await prisma.hocsinhlophoc.deleteMany({ where: { MaLopHoc: fx.classes.c1, MaHocSinh: DEMO.studentProfileId } });
  await cleanupAll();
}, 60_000);

type Role = 'admin' | 'teacher' | 'student' | 'parent';

async function compare(role: Role, method: 'GET' | 'POST', path: string, body?: unknown, ignore: string[] = []) {
  const req = method === 'GET' ? request(app).get(path) : request(app).post(path).send(body as object);
  const node = await req.set(await auth(role));
  if (netUp && (await netToken(role))) {
    const net = await netCall(role, method, path, body);
    expect(node.status, `${method} ${path}`).toBe(net.status);
    if (!(net.body === '' && node.text === '')) expect(diffJson(net.body, node.body, ['traceId', ...ignore]), `${method} ${path}`).toEqual([]);
  }
  return node;
}

const url = (classId: string, sessionId: string) => `/api/classes/${classId}/sessions/${sessionId}/attendance`;

describe('Diem danh buoi hoc', () => {
  it('xem diem danh khi chua co ban ghi', async () => {
    const r = await compare('admin', 'GET', url(fx.classes.c1, s.c1a));
    expect(r.body.success).toBe(true);
    expect(r.body.data.map((x: { studentName: string }) => x.studentName)).toEqual(['Tai khoan Hoc Sinh', `${P}Hoc Sinh A`, `${P}Hoc Sinh B`]);
    expect(r.body.data[1]).toEqual({ studentId: fx.students.s2, studentName: `${P}Hoc Sinh A`, status: '', statusLabel: 'Chua diem danh', note: null, updatedAt: null });
    // Buoi khong thuoc lop / da xoa / id sai
    const nf = await compare('admin', 'GET', url(fx.classes.c2, s.c1a));
    expect(nf.status).toBe(404);
    expect(nf.body).toMatchObject({ success: false, code: 'SESSION_NOT_FOUND', message: 'Khong tim thay buoi hoc trong lop.' });
    expect((await compare('admin', 'GET', url(fx.classes.c1, s.c1Deleted))).status).toBe(404);
    expect((await compare('admin', 'GET', url('abc', s.c1a))).status).toBe(404);
    // Giao vien demo khong day lop C1 -> 403
    expect((await compare('teacher', 'GET', url(fx.classes.c1, s.c1a))).status).toBe(403);
    // Hoc sinh khong co quyen ATTENDANCE_VIEW
    const st = await compare('student', 'GET', url(fx.classes.c1, s.c1a));
    expect(st.status).toBe(403);
  });

  it('luu diem danh: cac loi giong .NET', async () => {
    const path = url(fx.classes.c1, s.c1a);
    const cases: Array<[unknown, number, string | null]> = [
      [{ items: [] }, 400, 'ATTENDANCE_EMPTY'],
      [{}, 400, 'ATTENDANCE_EMPTY'],
      [{ items: [{ studentId: fx.students.s1, status: 'present' }, { studentId: fx.students.s1, status: 'late' }] }, 400, 'ATTENDANCE_DUPLICATE_STUDENT'],
      [{ items: [{ studentId: randomUUID(), status: 'present' }] }, 400, 'ATTENDANCE_STUDENT_NOT_IN_CLASS'],
      [{ items: [{ studentId: fx.students.s1, status: 'present' }, { studentId: fx.students.s2, status: 'sick' }] }, 400, 'ATTENDANCE_INVALID_STATUS'],
      [{ items: [{ studentId: fx.students.s1, status: '' }] }, 400, 'ATTENDANCE_INVALID_STATUS'],
      [{ items: [{ studentId: fx.students.s1 }] }, 400, 'ATTENDANCE_INVALID_STATUS'],
      [{ items: [{ studentId: fx.students.s1, status: null }] }, 400, null],
      [{ items: null }, 400, null],
      [{ items: [{ studentId: 'abc', status: 'present' }] }, 400, null],
      [{ Items: 5 }, 400, null],
    ];
    for (const [body, status, code] of cases) {
      const r = await compare('admin', 'POST', path, body);
      expect(r.status, JSON.stringify(body)).toBe(status);
      if (code) expect(r.body.code, JSON.stringify(body)).toBe(code);
      else expect(r.body.title).toBe('One or more validation errors occurred.');
    }
    // Trang thai sai -> khong luu gi
    expect(await prisma.diemdanh.count({ where: { MaBuoiHoc: s.c1a } })).toBe(0);
  });

  it('luu roi doc lai: Node va .NET ghi / doc giong nhau', async () => {
    const save = await request(app)
      .post(url(fx.classes.c1, s.c1a))
      .set(await auth('admin'))
      .send({ items: [{ studentId: fx.students.s1, status: ' Co_Mat ', note: '  den som ' }, { studentId: fx.students.s2, status: 'VANG' }] });
    expect(save.status).toBe(200);
    expect(save.body).toMatchObject({ success: true, message: 'Da luu diem danh.', data: { classId: fx.classes.c1, sessionId: s.c1a, count: 2 } });
    const rows = await prisma.diemdanh.findMany({ where: { MaBuoiHoc: s.c1a }, include: { chitietdanhmuc: true } });
    expect(rows.map((r) => [r.MaHocSinh, r.chitietdanhmuc?.MaCode, r.GhiChu]).sort()).toEqual(
      [
        [fx.students.s1, 'DD_PRESENT', 'den som'],
        [fx.students.s2, 'DD_ABSENT', null],
      ].sort(),
    );

    // Cap nhat lan 2 (dong da co -> ThoiGianSua) + them hoc sinh demo
    await request(app)
      .post(url(fx.classes.c1, s.c1a))
      .set(await auth('admin'))
      .send({ items: [{ studentId: fx.students.s2, status: 'di_muon', note: null }, { studentId: DEMO.studentProfileId, status: 'excused' }] });
    if (netUp) {
      const net = await netCall('admin', 'POST', url(fx.classes.c1, s.c1b), { items: [{ studentId: fx.students.s1, status: 'late', note: 'x' }, { studentId: DEMO.studentProfileId, status: 'co_phep' }] });
      expect(net.status).toBe(200);
    } else {
      await request(app)
        .post(url(fx.classes.c1, s.c1b))
        .set(await auth('admin'))
        .send({ items: [{ studentId: fx.students.s1, status: 'late', note: 'x' }, { studentId: DEMO.studentProfileId, status: 'co_phep' }] });
    }

    const a = await compare('admin', 'GET', url(fx.classes.c1, s.c1a));
    expect(a.body.data.map((x: { status: string; statusLabel: string }) => `${x.status}/${x.statusLabel}`)).toEqual(['excused/Co phep', 'late/Di muon', 'present/Co mat']);
    expect(typeof a.body.data[1].updatedAt).toBe('string');
    await compare('admin', 'GET', url(fx.classes.c1, s.c1b));
  });

  it('phu huynh / hoc sinh xem diem danh', async () => {
    const parent = await compare('parent', 'GET', `/api/parents/${DEMO.parentUserId}/children/attendance`);
    expect(parent.status).toBe(200);
    expect(parent.body.data.map((x: { sessionDate: string; status: string }) => `${x.sessionDate} ${x.status}`).sort()).toEqual(['2031-02-03 late', '2031-02-03 present']);
    expect(parent.body.data.find((x: { note: string }) => x.note === 'x')).toMatchObject({ studentId: fx.students.s1, className: `${P}C1`, classId: fx.classes.c1 });
    expect((await compare('parent', 'GET', `/api/parents/${randomUUID()}/children/attendance`)).status).toBe(403);
    expect((await compare('admin', 'GET', `/api/parents/${DEMO.adminUserId}/children/attendance`)).body).toMatchObject({ code: 'PARENT_NOT_FOUND' });

    const me = await compare('student', 'GET', '/api/students/me/attendance');
    expect(me.body.data.map((x: { status: string }) => x.status)).toEqual(['excused', 'excused']);
    const adminMe = await compare('admin', 'GET', '/api/students/me/attendance');
    expect(adminMe.body).toMatchObject({ code: 'STUDENT_PROFILE_NOT_FOUND' });
  });
});

describe('GET /api/admin/attendance', () => {
  it('tong hop theo buoi giong .NET', async () => {
    const r = await compare('admin', 'GET', '/api/admin/attendance?fromDate=2031-02-01&toDate=2031-02-28');
    expect(r.body).toMatchObject({ success: true, message: 'Lấy danh sách điểm danh thành công.', messageKey: 'ATTENDANCE.GET_ALL_SUCCESS' });
    const mine = r.body.data.filter((x: { classCode: string }) => x.classCode.startsWith(P));
    // C1: 2 khoa hoc x 1 giao vien -> 2 dong/buoi; C2: khong khoa hoc, 2 link giao vien (DaXoa=false, ke ca TrangThai=false) -> 2 dong.
    expect(mine.length).toBe(8);
    expect(mine[0]).toMatchObject({ id: s.c2a, courseName: 'Chưa xác định', date: '05/02/2031', time: '08:50 - 09:40', present: 0, status: 'Chưa điểm danh' });
    const evening = mine.find((x: { id: string }) => x.id === s.c1c);
    expect(evening.time).toBe('07:20 - 09:05');
    const noon = mine.find((x: { id: string }) => x.id === s.c1b);
    expect(noon).toMatchObject({ time: '12:30 - 02:15', present: 2, total: 3, status: 'Đã điểm danh' });

    await compare('admin', 'GET', `/api/admin/attendance?classCode=${encodeURIComponent(`${P.toLowerCase()}c1`)}&status=${encodeURIComponent('Đã điểm danh')}&fromDate=2031-02-01`);
    await compare('admin', 'GET', '/api/admin/attendance?classCode=&status=&toDate=2031-02-04');
    await compare('admin', 'GET', '/api/admin/attendance?fromDate=02/01/2031&toDate=2031-02-30');
    expect((await compare('teacher', 'GET', '/api/admin/attendance')).status).toBe(403);
  });
});
