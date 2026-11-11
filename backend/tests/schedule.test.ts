import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { solve, splitIntoContiguousRanges, ScheduleSearchStatus } from '../src/modules/schedule/scheduleConstraintSolver.js';
import { generateAndPersistSchedule, type GenerateScheduleRequest } from '../src/modules/schedule/scheduleGenerator.service.js';
import { app, auth } from './helpers.js';
import { addSession, cleanup, createFixture, d, DEMO, diffJson, netCall, netToken, type Fixture } from './schedule.fixture.js';

// Tests cho module schedule (ScheduleController + ScheduleGeneratorService + ScheduleConstraintSolver
// + ScheduleChangeRequestService). Cac test "parity" goi them backend .NET (5099) tren cung database
// va so sanh ket qua; neu .NET khong chay / bi gioi han dang nhap thi bo qua phan so sanh.

const P = 'TEST_SCHED_S_';
let fx: Fixture;
let netUp = false;
const sessions: Record<string, string> = {};

const tomorrow = () => {
  const t = new Date();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1)).toISOString().slice(0, 10);
};
const plusDays = (n: number) => {
  const t = new Date();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + n)).toISOString().slice(0, 10);
};

beforeAll(async () => {
  fx = await createFixture(P);
  // Lich tuan 2031-03-10 .. 2031-03-16 (+ vai buoi phuc vu bo sinh lich).
  sessions.c1Mon = await addSession(fx.classes.c1, '2031-03-10', 1, 2, fx.rooms.a);
  sessions.c1Wed = await addSession(fx.classes.c1, '2031-03-12', 4, 5, fx.rooms.b);
  sessions.c1Deleted = await addSession(fx.classes.c1, '2031-03-11', 1, 1, fx.rooms.a, { DaXoa: true });
  sessions.c2Wed0 = await addSession(fx.classes.c2, '2031-03-05', 1, 3, fx.rooms.a);
  sessions.c2Fri = await addSession(fx.classes.c2, '2031-03-14', 7, 8, fx.rooms.b);
  sessions.c2Thu = await addSession(fx.classes.c2, '2031-03-13', 3, 4, null, { TieuDe: null });
  sessions.c2Tue = await addSession(fx.classes.c2, '2031-03-11', 6, 6, fx.rooms.b);
  sessions.c3Tue = await addSession(fx.classes.c3, '2031-03-11', 6, 7, fx.rooms.c);
  sessions.c3Tue2 = await addSession(fx.classes.c3, '2031-03-11', 11, 12, fx.rooms.c);
  sessions.c1Tomorrow = await addSession(fx.classes.c1, tomorrow(), 2, 3, fx.rooms.c);
  sessions.c1Later = await addSession(fx.classes.c1, plusDays(9), 2, 3, fx.rooms.c);
  sessions.c2Jun = await addSession(fx.classes.c2, '2031-06-09', 2, 2, fx.rooms.a);
  netUp = (await netToken('admin')) !== null && (await netToken('teacher')) !== null;
  if (!netUp) console.warn('[schedule.test] Backend .NET (5099) khong san sang - bo qua cac so sanh parity.');
}, 60_000);

afterAll(async () => {
  await cleanup(P);
}, 60_000);

// ------------------------------------------------------------------------------------------
describe('ScheduleConstraintSolver', () => {
  it('splitIntoContiguousRanges', () => {
    expect(splitIntoContiguousRanges([5, 1, 2, 3, 3, 6, 9])).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 6 },
      { start: 9, end: 9 },
    ]);
    expect(splitIntoContiguousRanges([])).toEqual([]);
  });

  it('quay lui khi hai buoi cung lop trung gio cung ngay', () => {
    const date = d('2031-01-06');
    const task = (cands: Array<[number, number, string | null]>) => ({
      classId: 'c',
      date,
      teacherIds: new Set(['t']),
      studentIds: new Set<string>(),
      candidates: cands.map(([start, end, roomId]) => ({ start, end, roomId })),
    });
    // task 1 co 1 ung vien (xep truoc), task 0 phai tranh no.
    const r = solve([task([[1, 2, 'r1'], [3, 4, 'r1']]), task([[1, 2, 'r2']])], 100);
    expect(r.status).toBe(ScheduleSearchStatus.Solved);
    expect(r.assignments.get(1)).toEqual({ start: 1, end: 2, roomId: 'r2' });
    expect(r.assignments.get(0)).toEqual({ start: 3, end: 4, roomId: 'r1' });
    expect(r.metrics.candidatesRejected).toBe(1);

    const none = solve([task([[1, 2, null]]), task([[2, 3, null]])], 100);
    expect(none.status).toBe(ScheduleSearchStatus.NoSolution);
    const limit = solve([task([[1, 2, null]]), task([[2, 3, null]])], 1);
    expect(limit.status).toBe(ScheduleSearchStatus.SearchLimitReached);
    expect(() => solve([], 0)).toThrow();
  });
});

// ------------------------------------------------------------------------------------------
describe('CRUD buoi hoc / phong hoc', () => {
  it('yeu cau dang nhap', async () => {
    const res = await request(app).get('/api/Schedule/rooms');
    expect(res.status).toBe(401);
  });

  it('POST /api/Schedule: kiem tra tiet, trung lop/phong/giao vien, tao moi', async () => {
    const h = await auth('admin');
    const bad = await request(app).post('/api/Schedule').set(h).send({ MaLopHoc: fx.classes.c1, NgayHoc: '2031-03-17T00:00:00', MaTietBatDau: 3, MaTietKetThuc: 2 });
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ error: 'MaTietBatDau must be <= MaTietKetThuc' });

    // Trung lop C1 + phong A (buoi 2031-03-10 tiet 1-2) + giao vien t1.
    const conflict = await request(app)
      .post('/api/Schedule')
      .set(h)
      .send({ MaLopHoc: fx.classes.c1, MaPhongHoc: fx.rooms.a, NgayHoc: '2031-03-10T00:00:00', MaTietBatDau: 2, MaTietKetThuc: 3 });
    expect(conflict.status).toBe(400);
    expect(conflict.body.errors).toEqual([
      'Trùng Lớp học: lớp này đã có buổi học trùng giờ.',
      'Trùng Phòng học: phòng này đã được sử dụng ở khung giờ đó.',
      'Trùng Giảng viên: một hoặc nhiều giảng viên đang bận trong khung giờ đó.',
    ]);

    // Buoi da xoa mem van chan (ban .NET khong loc DaXoa o buoc kiem tra truoc).
    const deletedBlocks = await request(app)
      .post('/api/Schedule')
      .set(h)
      .send({ MaLopHoc: fx.classes.c1, NgayHoc: '2031-03-11', MaTietBatDau: 1, MaTietKetThuc: 1 });
    expect(deletedBlocks.status).toBe(400);
    expect(deletedBlocks.body.errors).toContain('Trùng Lớp học: lớp này đã có buổi học trùng giờ.');

    const created = await request(app)
      .post('/api/Schedule')
      .set(h)
      .send({ maLopHoc: fx.classes.c3, maPhongHoc: null, ngayHoc: '2031-03-20T00:00:00', maTietBatDau: 9, maTietKetThuc: 10, tieuDe: 'T', noiDung: 'N' });
    expect(created.status).toBe(200);
    expect(Object.keys(created.body)).toEqual(['id']);
    const row = await prisma.buoihoc.findUnique({ where: { MaBuoiHoc: created.body.id } });
    expect(row?.NgayHoc.toISOString()).toBe('2031-03-20T00:00:00.000Z');
    expect(await prisma.tiethoc.count({ where: { MaTiet: { lte: 14 } } })).toBe(14);

    const badJson = await request(app).post('/api/Schedule').set(h).send({ MaLopHoc: 'abc' });
    expect(badJson.status).toBe(400);
    expect(badJson.body.errors).toHaveProperty('$.MaLopHoc');

    // PUT
    const upd = await request(app)
      .put(`/api/Schedule/${created.body.id}`)
      .set(h)
      .send({ MaLopHoc: fx.classes.c3, MaPhongHoc: fx.rooms.d, NgayHoc: '2031-03-20', MaTietBatDau: 10, MaTietKetThuc: 11, TieuDe: 'T2' });
    expect(upd.status).toBe(200);
    expect(upd.body).toEqual({ message: 'Cập nhật buổi học thành công.', id: created.body.id });
    const notFound = await request(app).put(`/api/Schedule/${randomUUID()}`).set(h).send({ MaLopHoc: fx.classes.c3, MaTietBatDau: 1, MaTietKetThuc: 1 });
    expect(notFound.status).toBe(404);
    const badId = await request(app).put('/api/Schedule/abc').set(h).send({});
    expect(badId.status).toBe(400);
    expect(badId.body.errors).toEqual({ id: ["The value 'abc' is not valid."] });

    // DELETE
    const del = await request(app).delete(`/api/Schedule/${created.body.id}`).set(h);
    expect(del.body).toEqual({ message: 'Đã xóa buổi học.', id: created.body.id });
    expect((await prisma.buoihoc.findUnique({ where: { MaBuoiHoc: created.body.id } }))?.DaXoa).toBe(true);
    expect((await request(app).delete(`/api/Schedule/${randomUUID()}`).set(h)).body).toEqual({ message: 'Không tìm thấy buổi học.' });
    expect((await request(app).delete('/api/Schedule/not-a-guid').set(h)).status).toBe(404);
  });

  it('phong hoc: tao / xem / sua / xoa', async () => {
    const h = await auth('admin');
    const missing = await request(app).post('/api/Schedule/rooms/create').set(h).send({ SucChua: 10 });
    expect(missing.status).toBe(400);
    expect(missing.body.errors).toEqual({ TenPhong: ['The TenPhong field is required.'] });
    const blank = await request(app).post('/api/Schedule/rooms/create').set(h).send({ TenPhong: '  ', SucChua: 0 });
    expect(blank.body).toMatchObject({ success: false, code: 'ROOM_NAME_REQUIRED', message: 'Tên phòng học không được để trống.' });
    const cap = await request(app).post('/api/Schedule/rooms/create').set(h).send({ TenPhong: `${P}R_X` });
    expect(cap.body).toMatchObject({ success: false, code: 'ROOM_CAPACITY_REQUIRED', message: 'Sức chứa phòng phải lớn hơn 0.' });
    const long = await request(app).post('/api/Schedule/rooms/create').set(h).send({ TenPhong: `${P}${'x'.repeat(60)}`, SucChua: 5 });
    expect(long.body.code).toBe('ROOM_NAME_TOO_LONG');
    const dup = await request(app).post('/api/Schedule/rooms/create').set(h).send({ TenPhong: ` ${P}R_A `, SucChua: 5 });
    expect(dup.body.code).toBe('ROOM_NAME_EXISTS');

    const ok = await request(app).post('/api/Schedule/rooms/create').set(h).send({ tenPhong: `${P}R_X`, sucChua: 12 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ success: true, message: `Đã tạo phòng học ${P}R_X thành công.`, code: 'SUCCESS' });
    const id = ok.body.data.roomId;

    const got = await request(app).get(`/api/Schedule/rooms/${id}`).set(h);
    expect(got.body).toEqual({ id, tenPhong: `${P}R_X`, sucChua: 12, active: true });

    const upd = await request(app).put(`/api/Schedule/rooms/${id}`).set(h).send({ TenPhong: `${P}R_Y`, SucChua: 0 });
    expect(upd.body.code).toBe('ROOM_INVALID_CAPACITY');
    const upd2 = await request(app).put(`/api/Schedule/rooms/${id}`).set(h).send({ TenPhong: `${P}R_Y`, TrangThai: false });
    expect(upd2.body).toMatchObject({ success: true, message: `Đã cập nhật phòng học ${P}R_Y thành công.`, data: { roomId: id } });

    const list = await request(app).get('/api/Schedule/rooms').set(h);
    expect(list.body.find((r: { id: string }) => r.id === id)).toEqual({ id, tenPhong: `${P}R_Y`, sucChua: 12, active: false });

    const del = await request(app).delete(`/api/Schedule/rooms/${id}`).set(h);
    expect(del.body).toMatchObject({ success: true, message: 'Đã xóa phòng học.', data: { roomId: id } });
    const gone = await request(app).get(`/api/Schedule/rooms/${id}`).set(h);
    expect(gone.status).toBe(404);
    expect(gone.body).toMatchObject({ success: false, message: 'Không tìm thấy phòng học.', code: 'ERROR_UNKNOWN' });
  });
});

// ------------------------------------------------------------------------------------------
describe('Bang lich - so sanh voi .NET', () => {
  async function compare(role: 'admin' | 'teacher' | 'student' | 'parent', path: string, ignore: string[] = []) {
    const node = await request(app).get(path).set(await auth(role));
    if (!netUp || !(await netToken(role))) return node;
    const net = await netCall(role, 'GET', path);
    expect(node.status, path).toBe(net.status);
    // Forbid()/NotFound() khong body: .NET tra chuoi rong, supertest tra {}.
    if (!(net.body === '' && node.text === '')) expect(diffJson(net.body, node.body, ['traceId', ...ignore]), path).toEqual([]);
    return node;
  }

  it('admin-board', async () => {
    const r = await compare('admin', '/api/Schedule/admin-board?weekStart=2031-03-12T00:00:00');
    expect(r.body.weekStart).toBe('2031-03-10T00:00:00');
    const mine = r.body.schedules.filter((s: { classCode: string }) => s.classCode.startsWith(P));
    expect(mine.length).toBe(7);
    const thu = mine.find((s: { id: string }) => s.id === sessions.c2Thu);
    expect(thu).toMatchObject({ room: 'Chưa gán phòng', subject: `${P}C2`, dayIdx: 3, ngayHoc: '2031-03-13', teacher: `${P}Giao Vien A` });
    await compare('admin', '/api/Schedule/admin-board?weekStart=2031-03-16');
    await compare('admin', '/api/Schedule/admin-board?weekStart=2031-03-16T17:00:00.000Z');
    await compare('admin', '/api/Schedule/admin-board?weekStart=bad');
  });

  it('teacher-board / student-board / parent-board / student-classes', async () => {
    const r = await compare('admin', `/api/Schedule/teacher-board?weekStart=2031-03-10&teacherId=${fx.teachers.t1}`);
    // t1 co link (khong hoat dong) voi C2 -> van thay lich C2 (ban .NET khong loc trang thai link).
    expect(r.body.schedules.length).toBe(5);
    expect(r.body.schedules[0].teacher).toBe('Giáo viên');
    await compare('teacher', '/api/Schedule/teacher-board?weekStart=2031-03-10');
    await compare('admin', '/api/Schedule/teacher-board?teacherId=abc');
    const sb = await compare('admin', `/api/Schedule/student-board?weekStart=2031-03-10&studentId=${fx.students.s2}`);
    expect(sb.body.schedules.map((s: { ngayHoc: string }) => s.ngayHoc)).toEqual(['2031-03-10', '2031-03-11', '2031-03-12', '2031-03-13', '2031-03-14']);
    await compare('student', '/api/Schedule/student-board?weekStart=2031-03-10');
    const pb = await compare('admin', `/api/Schedule/parent-board?weekStart=2031-03-10&parentId=${fx.parent.profileId}`);
    expect(pb.body.schedules.length).toBe(9);
    await compare('parent', '/api/Schedule/parent-board?weekStart=2031-03-10');
    const sc = await compare('admin', `/api/Schedule/student-classes?studentId=${fx.students.s2}`);
    expect(sc.body.classes.map((c: { classCode: string }) => c.classCode)).toEqual([`${P}C1`, `${P}C2`]);
    expect(sc.body.classes[0]).toMatchObject({ studentCount: 2, maxStudents: 30, startDate: '2031-01-01', endDate: '2031-12-31', status: 'Hoạt động' });
    expect(sc.body.classes[1]).toMatchObject({ maxStudents: 0, startDate: null, status: 'Không hoạt động', teacher: `${P}Giao Vien A` });
  });

  it('student-class-detail', async () => {
    const r = await compare('admin', `/api/Schedule/student-class-detail/${fx.classes.c1}?studentId=${fx.students.s1}`);
    expect(r.body.studentNames.sort()).toEqual([`${P}Hoc Sinh A`, `${P}Hoc Sinh B`]);
    expect(r.body.upcomingSchedules.map((s: { id: string }) => s.id)).toEqual([sessions.c1Tomorrow]);
    expect(r.body.teacherId).toBe(fx.teachers.t1);
    const forbidden = await compare('admin', `/api/Schedule/student-class-detail/${fx.classes.c2}?studentId=${fx.students.s1}`);
    expect(forbidden.status).toBe(403);
    expect((await compare('admin', '/api/Schedule/student-class-detail/abc')).status).toBe(404);
  });

  it('available-rooms / available-teachers / sample-payload', async () => {
    const rooms = await compare('admin', '/api/Schedule/available-rooms?ngayHoc=2031-03-10T00:00:00&maTietBatDau=2&maTietKetThuc=2');
    expect(rooms.body.some((r: { maPhongHoc: string }) => r.maPhongHoc === fx.rooms.a)).toBe(false);
    expect(rooms.body.some((r: { maPhongHoc: string }) => r.maPhongHoc === fx.rooms.b)).toBe(true);
    const teachers = await compare('admin', '/api/Schedule/available-teachers?ngayHoc=2031-03-10&maTietBatDau=1&maTietKetThuc=1');
    expect(teachers.body.some((t: { maGiangVien: string }) => t.maGiangVien === fx.teachers.t1)).toBe(false);
    expect(teachers.body.some((t: { maGiangVien: string }) => t.maGiangVien === fx.teachers.t2)).toBe(true);
    await compare('admin', '/api/Schedule/available-rooms');
    await compare('admin', '/api/Schedule/available-teachers?ngayHoc=x&maTietBatDau=y');
    await compare('admin', '/api/Schedule/sample-payload');
  });
});

// ------------------------------------------------------------------------------------------
describe('Yeu cau doi lich', () => {
  const ignoreId = ['maYeuCau', 'id'];

  async function both(role: 'admin' | 'teacher', method: 'post' | 'put' | 'get', path: string, body?: object) {
    const node = await (request(app) as any)[method](path).set(await auth(role)).send(body);
    const net = netUp ? await netCall(role, method.toUpperCase(), path, body) : null;
    return { node, net };
  }

  it('tao yeu cau: cac truong hop loi giong .NET', async () => {
    const cases: object[] = [
      { MaBuoiHoc: randomUUID(), LoaiYeuCau: 2 },
      { MaBuoiHoc: sessions.c1Mon, LoaiYeuCau: 2, MaPhongHocDeXuat: fx.rooms.d },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 3 },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 1, NgayHocDeXuat: '2031-03-12' },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 1, NgayHocDeXuat: '2020-01-01', MaTietBatDauDeXuat: 1, MaTietKetThucDeXuat: 2 },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 1, NgayHocDeXuat: '2031-03-12', MaTietBatDauDeXuat: 3, MaTietKetThucDeXuat: 2 },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 1, NgayHocDeXuat: '2031-03-11T00:00:00', MaTietBatDauDeXuat: 12, MaTietKetThucDeXuat: 12 },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 2 },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 2, MaPhongHocDeXuat: randomUUID() },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 2, MaPhongHocDeXuat: fx.rooms.b },
      { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 'x' },
    ];
    const expected = [
      'Buổi học không tồn tại hoặc đã bị xóa',
      'Bạn không phải là giáo viên của lớp này',
      'Loại yêu cầu không hợp lệ (1: Đổi thời gian, 2: Đổi phòng)',
      'Yêu cầu đổi thời gian phải có ngày và ca học mới',
      'Ngày học mới không được là quá khứ',
      'Tiết bắt đầu phải nhỏ hơn hoặc bằng tiết kết thúc',
      'Lớp học này đã có buổi học khác trùng với thời gian đề xuất',
      'Yêu cầu đổi phòng phải có mã phòng mới',
      'Phòng học không tồn tại',
      'Phòng học này đã được sử dụng trong thời gian đó',
    ];
    for (let i = 0; i < cases.length; i++) {
      const { node, net } = await both('teacher', 'post', '/api/Schedule/change-request', cases[i]);
      expect(node.status, JSON.stringify(cases[i]) + ' => ' + JSON.stringify(node.body)).toBe(400);
      if (i < expected.length) expect(node.body).toMatchObject({ success: false, message: expected[i] });
      if (net) {
        expect(net.status).toBe(node.status);
        expect(diffJson(net.body, node.body, ['maYeuCau', 'traceId']), JSON.stringify(cases[i])).toEqual([]);
      }
    }
  });

  it('tao, xem, duyet, tu choi yeu cau', async () => {
    const roomReq = { MaBuoiHoc: sessions.c3Tue, LoaiYeuCau: 2, MaPhongHocDeXuat: fx.rooms.d, LyDo: `${P} doi phong` };
    const created = await both('teacher', 'post', '/api/Schedule/change-request', roomReq);
    expect(created.node.status).toBe(200);
    expect(created.node.body).toMatchObject({ success: true, message: 'Yêu cầu đổi lịch đã được tạo thành công, vui lòng chờ admin xử lý' });
    const nodeId = created.node.body.maYeuCau as string;
    const netId = created.net?.body?.maYeuCau as string | undefined;
    if (created.net) expect(diffJson(created.net.body, created.node.body, ignoreId)).toEqual([]);

    // Thong bao cho admin
    const notif = await prisma.thongbao.findFirst({
      where: { NoiDung: { contains: `${P} doi phong` }, nguoinhanthongbao: { some: { MaNguoiDung: DEMO.adminUserId } } },
    });
    expect(notif?.NoiDung).toBe(`Tai khoan Giao Vien yêu cầu đổi lịch lớp ${P}C3 (buổi 11/03/2031 ca 6-7), đổi phòng sang ${P}R_D. Lý do: ${P} doi phong.`);

    const timeReq = { MaBuoiHoc: sessions.c3Tue2, LoaiYeuCau: 1, NgayHocDeXuat: '2031-03-12T00:00:00', MaTietBatDauDeXuat: 9, MaTietKetThucDeXuat: 10 };
    const created2 = await both('teacher', 'post', '/api/Schedule/change-request', timeReq);
    expect(created2.node.status).toBe(200);
    const nodeId2 = created2.node.body.maYeuCau as string;
    const netId2 = created2.net?.body?.maYeuCau as string | undefined;

    // Danh sach / chi tiet: hai ben cung doc cung database -> phai giong het.
    for (const [role, path] of [
      ['admin', '/api/Schedule/change-requests/pending'],
      ['teacher', '/api/Schedule/change-requests/my-requests'],
      ['admin', `/api/Schedule/change-requests/${nodeId}`],
      ['admin', `/api/Schedule/change-requests/${nodeId2}`],
      ['admin', `/api/Schedule/change-requests/${randomUUID()}`],
      ['admin', '/api/Schedule/admin-board?weekStart=2031-03-10'],
      ['teacher', '/api/Schedule/teacher-board?weekStart=2031-03-10'],
    ] as const) {
      const node = await request(app).get(path).set(await auth(role));
      expect(node.status, path).not.toBe(500);
      if (netUp) {
        const net = await netCall(role, 'GET', path);
        expect(node.status, path).toBe(net.status);
        expect(diffJson(net.body, node.body), path).toEqual([]);
      }
    }
    const detail = await request(app).get(`/api/Schedule/change-requests/${nodeId2}`).set(await auth('admin'));
    expect(detail.body).toMatchObject({
      maBuoiHoc: sessions.c3Tue2,
      loaiYeuCau: 1,
      ngayHocHienTai: '2031-03-11T00:00:00',
      ngayHocDeXuat: '2031-03-12T00:00:00',
      maTietBatDauHienTai: 11,
      tenPhongHocHienTai: `${P}R_C`,
      trangThaiDuyet: 0,
      tenGiangVien: 'Tai khoan Giao Vien',
    });
    const board = await request(app).get('/api/Schedule/admin-board?weekStart=2031-03-10').set(await auth('admin'));
    const boardReq = board.body.rescheduleRequests.find((r: { id: string }) => r.id === nodeId);
    expect(boardReq).toMatchObject({ oldDate: '11/03 - Ca 6', newDate: `Đổi phòng: ${P}R_C → ${P}R_D`, reason: `${P} doi phong`, status: 0, loaiYeuCau: 2 });

    // Duyet doi phong: Node duyet yeu cau Node tao, .NET duyet yeu cau .NET tao.
    const approveNode = await request(app).put(`/api/Schedule/reschedule-requests/${nodeId}/approve`).set(await auth('admin'));
    expect(approveNode.status).toBe(200);
    expect(approveNode.body).toEqual({ message: 'Yêu cầu đổi phòng đã được duyệt. Phòng học đã được cập nhật', id: nodeId });
    expect((await prisma.buoihoc.findUnique({ where: { MaBuoiHoc: sessions.c3Tue } }))?.MaPhongHoc).toBe(fx.rooms.d);
    if (netId) {
      const approveNet = await netCall('admin', 'PUT', `/api/Schedule/reschedule-requests/${netId}/approve`);
      expect(diffJson(approveNet.body, approveNode.body, ignoreId)).toEqual([]);
      // Duyet lai -> "da duoc duyet truoc do" (success = true).
      const again = await netCall('admin', 'PUT', `/api/Schedule/reschedule-requests/${nodeId}/approve`);
      const againNode = await request(app).put(`/api/Schedule/reschedule-requests/${netId}/approve`).set(await auth('admin'));
      expect(againNode.body.message).toBe('Yêu cầu này đã được duyệt trước đó');
      expect(diffJson(again.body, againNode.body, ignoreId)).toEqual([]);
    }

    // Doi gio: Node duyet qua POST change-request/approve, .NET tu choi; roi thu lai -> "da duoc xu ly".
    const approve2 = await request(app)
      .post('/api/Schedule/change-request/approve')
      .set(await auth('admin'))
      .send({ MaYeuCau: nodeId2, TrangThaiDuyet: 1, GhiChuAdmin: 'ok' });
    expect(approve2.body).toEqual({ maYeuCau: nodeId2, message: 'Yêu cầu đổi thời gian đã được duyệt. Lịch dạy đã được cập nhật', success: true });
    const moved = await prisma.buoihoc.findUnique({ where: { MaBuoiHoc: sessions.c3Tue2 } });
    expect([moved?.NgayHoc.toISOString().slice(0, 10), moved?.MaTietBatDau, moved?.MaTietKetThuc]).toEqual(['2031-03-12', 9, 10]);
    if (netId2) {
      const rejectNet = await netCall('admin', 'POST', '/api/Schedule/change-request/reject', { MaYeuCau: netId2, GhiChuAdmin: 'khong' });
      const rejectAgainNode = await request(app)
        .post('/api/Schedule/change-request/reject')
        .set(await auth('admin'))
        .send({ MaYeuCau: netId2, GhiChuAdmin: 'khong' });
      expect(rejectNet.body).toMatchObject({ success: true, message: 'Yêu cầu đã bị từ chối' });
      expect(rejectAgainNode.body).toEqual({ maYeuCau: netId2, message: 'Yêu cầu này đã được xử lý', success: false });
    }

    const badStatus = await both('admin', 'post', '/api/Schedule/change-request/approve', { MaYeuCau: nodeId2, TrangThaiDuyet: 5 });
    expect(badStatus.node.body).toEqual({ error: 'Trạng thái không hợp lệ (1: Duyệt, 2: Từ chối)' });
    if (badStatus.net) expect(badStatus.net.body).toEqual(badStatus.node.body);
    const missing = await both('admin', 'put', `/api/Schedule/reschedule-requests/${randomUUID()}/reject`);
    expect(missing.node.status).toBe(400);
    expect(missing.node.body).toEqual({ message: 'Yêu cầu không tồn tại' });
    if (missing.net) expect(missing.net.body).toEqual(missing.node.body);

    // Quyen SCHEDULE_CHANGE_REQUEST_ADMIN
    const forbidden = await request(app).get('/api/Schedule/change-requests/pending').set(await auth('teacher'));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 });
  });
});

// ------------------------------------------------------------------------------------------
// Bo sinh lich: tao lop qua POST /api/classes cua .NET (goi ScheduleGeneratorService ben trong),
// lay lich .NET da sinh, vo hieu hoa no, roi chay generateAndPersistSchedule cua Node voi cung dau vao
// tren cung trang thai database va so sanh tung buoi (ngay, tiet, phong, noi dung).
describe('ScheduleGeneratorService - so sanh voi .NET', () => {
  interface Scenario {
    name: string;
    request: Omit<GenerateScheduleRequest, 'name' | 'startDate' | 'endDate'> & { startDate?: string; endDate?: string | null };
    expectError?: string;
  }

  const scenarios = (): Scenario[] => [
    {
      name: 'A_alt_preferred_room',
      request: {
        startDate: '2031-03-05',
        capacity: 900,
        teacherIds: [fx.teachers.t1],
        totalPeriods: 14,
        scheduleConfigs: [
          { days: ['Thu 2', 'Thu 4'], periods: [3, 1, 2], roomId: null, allowAlternativePeriods: true },
          { days: ['Thu 6'], periods: [7, 8], roomId: fx.rooms.b, allowAlternativePeriods: true },
        ],
      },
    },
    {
      name: 'B_same_day_backtrack',
      request: {
        startDate: '2031-04-07',
        capacity: 950,
        teacherIds: [fx.teachers.t2],
        totalPeriods: 12,
        scheduleConfigs: [
          { days: ['Thu 2'], periods: [1, 2, 3], allowAlternativePeriods: true },
          { days: ['Thu 2', 'Thu 2'], periods: [2, 3, 4], allowAlternativePeriods: true },
        ],
      },
    },
    {
      name: 'C_no_capacity',
      request: {
        startDate: '2031-05-06',
        endDate: '2031-05-31',
        capacity: null,
        teacherIds: [],
        totalPeriods: 4,
        scheduleConfigs: [{ days: ['Thu 3', 'Chu nhat'], periods: [9, 10], allowAlternativePeriods: false }],
      },
    },
    {
      name: 'D_end_date_too_early',
      request: {
        startDate: '2031-06-02',
        endDate: '2031-06-04',
        capacity: 900,
        teacherIds: [],
        totalPeriods: 10,
        scheduleConfigs: [{ days: ['Thu 2', 'Thu 6'], periods: [1, 2], allowAlternativePeriods: false }],
      },
      expectError: 'Khong du khung lich truoc ngay ket thuc 06/04/2031. Da xep 2/10 tiet.',
    },
    {
      name: 'E_fixed_room_busy',
      request: {
        startDate: '2031-06-09',
        capacity: 900,
        teacherIds: [],
        totalPeriods: 3,
        scheduleConfigs: [{ days: ['Thu 2'], periods: [1, 2, 3], roomId: fx.rooms.a, allowAlternativePeriods: false }],
      },
      expectError: 'Khong co khung gio kha dung ngay 06/09/2031 cho mau tiet 1-3; xung dot: phong da duoc dat. Da xep 0/3 tiet.',
    },
    {
      name: 'F_bad_day',
      request: { startDate: '2031-06-09', totalPeriods: 3, scheduleConfigs: [{ days: ['Thu 9'], periods: [1] }] },
      expectError: 'Invalid day name: Thu 9',
    },
    {
      name: 'G_room_capacity',
      request: { startDate: '2031-06-09', capacity: 920, totalPeriods: 3, scheduleConfigs: [{ days: ['Thu 3'], periods: [1], roomId: fx.rooms.a }] },
      expectError: `Phong ${P}R_A khong du suc chua cho lop.`,
    },
    {
      name: 'H_bad_period',
      request: { startDate: '2031-06-09', totalPeriods: 3, scheduleConfigs: [{ days: ['Thu 3'], periods: [0, 1] }] },
      expectError: 'Tiet hoc phai nam trong khoang tu 1 den 14.',
    },
    {
      name: 'I_end_before_start',
      request: { startDate: '2031-06-09', endDate: '2031-06-01', totalPeriods: 3, scheduleConfigs: [{ days: ['Thu 3'], periods: [1] }] },
      expectError: 'Ngay ket thuc phai bang hoac sau ngay bat dau.',
    },
  ];

  type Row = { date: string; start: number; end: number; room: string | null; noiDung: string | null };
  const rowsOf = async (classId: string): Promise<Row[]> =>
    (
      await prisma.buoihoc.findMany({ where: { MaLopHoc: classId }, orderBy: [{ NgayHoc: 'asc' }, { MaTietBatDau: 'asc' }] })
    ).map((b) => ({ date: b.NgayHoc.toISOString().slice(0, 10), start: b.MaTietBatDau, end: b.MaTietKetThuc, room: b.MaPhongHoc, noiDung: b.NoiDung }));

  /** Tai hien ClassesController.Create cua .NET: them lop + link giao vien, sinh lich, cap nhat NgayKetThuc. */
  async function nodeCreateClass(name: string, s: Scenario) {
    const classId = randomUUID();
    const req: GenerateScheduleRequest = {
      ...s.request,
      name,
      startDate: s.request.startDate ? d(s.request.startDate) : null,
      endDate: s.request.endDate ? d(s.request.endDate) : null,
    };
    try {
      return await prisma.$transaction(
        async (tx) => {
          await tx.lophoc.create({
            data: {
              MaLopHoc: classId,
              TenLop: name,
              NgayBatDau: req.startDate,
              NgayKetThuc: req.endDate,
              SiSoHienTai: 0,
              SiSoToiDa: req.capacity ?? null,
              TrangThai: true,
              DaXoa: false,
            },
          });
          for (const t of req.teacherIds ?? []) {
            await tx.giangvienlophoc.create({ data: { MaLopHoc: classId, MaGiangVien: t, TrangThai: true, DaXoa: false } });
          }
          const r = await generateAndPersistSchedule(tx, classId, req);
          if (!r.success) throw Object.assign(new Error('rollback'), { genError: r.error });
          if (r.endDate) await tx.lophoc.update({ where: { MaLopHoc: classId }, data: { NgayKetThuc: r.endDate } });
          return { classId, error: null as string | null, endDate: r.endDate };
        },
        { isolationLevel: 'Serializable', timeout: 60_000 },
      );
    } catch (err) {
      const genError = (err as { genError?: string }).genError;
      if (genError === undefined) throw err;
      return { classId: null, error: genError, endDate: null };
    }
  }

  async function neutralize(classId: string) {
    await prisma.buoihoc.updateMany({ where: { MaLopHoc: classId }, data: { DaXoa: true } });
    await prisma.giangvienlophoc.updateMany({ where: { MaLopHoc: classId }, data: { DaXoa: true, TrangThai: false } });
    await prisma.lophoc.update({ where: { MaLopHoc: classId }, data: { DaXoa: true } });
  }

  // Ket qua Node khi khong co .NET de so sanh (gia tri tinh tay theo thuat toan).
  const expectedA: Row[] = [
    { date: '2031-03-05', start: 1, end: 3, room: 'b', noiDung: 'Lich hoc 03/05/2031 tiet 1-3' },
    { date: '2031-03-07', start: 7, end: 8, room: 'b', noiDung: 'Lich hoc 03/07/2031 tiet 7-8' },
    { date: '2031-03-10', start: 3, end: 5, room: 'a', noiDung: 'Lich hoc 03/10/2031 tiet 3-5' },
    { date: '2031-03-12', start: 1, end: 3, room: 'b', noiDung: 'Lich hoc 03/12/2031 tiet 1-3' },
    { date: '2031-03-14', start: 5, end: 6, room: 'b', noiDung: 'Lich hoc 03/14/2031 tiet 5-6' },
    { date: '2031-03-17', start: 1, end: 1, room: 'a', noiDung: 'Lich hoc 03/17/2031 tiet 1-1' },
  ];

  it('cac kich ban sinh lich cho ket qua giong het .NET', async () => {
    const roomKey = (id: string | null) => (id === null ? null : (Object.entries(fx.rooms).find(([, v]) => v === id)?.[0] ?? id));
    for (const s of scenarios()) {
      let netRows: Row[] | null = null;
      let netError: string | null = null;
      if (netUp) {
        const body = {
          name: `${P}GEN_NET_${s.name}`,
          startDate: s.request.startDate ?? null,
          endDate: s.request.endDate ?? null,
          capacity: s.request.capacity ?? null,
          active: true,
          courseIds: [],
          teacherIds: s.request.teacherIds ?? [],
          totalPeriods: s.request.totalPeriods,
          scheduleConfigs: s.request.scheduleConfigs,
        };
        const res = await netCall('admin', 'POST', '/api/classes', body);
        if (res.status === 201) {
          const id = res.body.data.id as string;
          netRows = await rowsOf(id);
          await neutralize(id);
        } else {
          netError = res.body?.message ?? JSON.stringify(res.body);
        }
      }

      const node = await nodeCreateClass(`${P}GEN_NODE_${s.name}`, s);
      const nodeRows = node.classId ? await rowsOf(node.classId) : null;
      if (node.classId) {
        const cls = await prisma.lophoc.findUnique({ where: { MaLopHoc: node.classId } });
        expect(cls?.NgayKetThuc?.toISOString().slice(0, 10)).toBe(nodeRows!.at(-1)!.date);
        await neutralize(node.classId);
      }

      if (s.expectError) expect(node.error, s.name).toBe(s.expectError);
      else expect(node.error, s.name).toBeNull();
      if (s.name.startsWith('A_')) expect(nodeRows!.map((r) => ({ ...r, room: roomKey(r.room) }))).toEqual(expectedA);

      if (netUp) {
        expect(node.error, s.name).toBe(netError);
        expect(nodeRows, s.name).toEqual(netRows);
      }
    }
  }, 120_000);
});
