import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { ScheduleSearchStatus, solve, splitIntoContiguousRanges } from '../src/modules/schedule/scheduleConstraintSolver.js';
import { app, auth } from './helpers.js';
import { cleanupPeople, createCourse, createUser, type TestUser } from './people.fixture.js';

// ClassesController + ClassStudentsController (+ ScheduleGeneratorService).
const P = 'TEST_PEOPLE_CLS_';
const TIET = 11; // tiet tam cho test sinh lich (FK buoihoc -> tiethoc)

let gv: TestUser, gv2: TestUser, hs: TestUser, hs2: TestUser;
let courseA: string, courseB: string;
let createdTiet = false;
let admin: { Authorization: string };

beforeAll(async () => {
  await cleanupPeople(P);
  admin = await auth('admin');
  gv = await createUser(P, 'gv', 'Giao_Vien', `${P}GV Mot`);
  gv2 = await createUser(P, 'gv2', 'Giao_Vien', `${P}GV Hai`);
  hs = await createUser(P, 'hs', 'Hoc_Sinh', `${P}HS Binh`);
  hs2 = await createUser(P, 'hs2', 'Hoc_Sinh', `${P}HS An`);
  courseA = await createCourse(P, 'KH A', { price: '1500000.50', moTa: 'mo ta' });
  courseB = await createCourse(P, 'KH B', { active: false });
  if (!(await prisma.tiethoc.findUnique({ where: { MaTiet: TIET } }))) {
    try {
      await prisma.tiethoc.create({
        data: { MaTiet: TIET, TenTiet: `${P}Tiet`, GioBatDau: new Date(Date.UTC(1970, 0, 1, 12)), GioKetThuc: new Date(Date.UTC(1970, 0, 1, 12, 45)) },
      });
      createdTiet = true;
    } catch {
      /* agent khac vua tao */
    }
  }
});

afterAll(async () => {
  await cleanupPeople(P);
  if (createdTiet) await prisma.tiethoc.deleteMany({ where: { MaTiet: TIET, TenTiet: `${P}Tiet` } });
  await prisma.$disconnect();
});

describe('ScheduleConstraintSolver', () => {
  it('splitIntoContiguousRanges', () => {
    expect(splitIntoContiguousRanges([5, 1, 2, 3, 6, 9, 2])).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 6 },
      { start: 9, end: 9 },
    ]);
    expect(splitIntoContiguousRanges([])).toEqual([]);
  });

  it('solve: tranh trung giao vien cung ngay, quay lui khi can', () => {
    const date = new Date(Date.UTC(2031, 0, 6));
    const t = new Set(['t1']);
    const none = new Set<string>();
    const r = solve(
      [
        { classId: 'a', date, teacherIds: t, studentIds: none, candidates: [{ start: 1, end: 2, roomId: null }, { start: 3, end: 4, roomId: null }] },
        { classId: 'b', date, teacherIds: t, studentIds: none, candidates: [{ start: 1, end: 2, roomId: null }] },
      ],
      100,
    );
    expect(r.status).toBe(ScheduleSearchStatus.Solved);
    expect(r.assignments.get(1)).toEqual({ start: 1, end: 2, roomId: null });
    expect(r.assignments.get(0)).toEqual({ start: 3, end: 4, roomId: null });
    const none2 = solve([{ classId: 'a', date, teacherIds: t, studentIds: none, candidates: [] }], 100);
    expect(none2.status).toBe(ScheduleSearchStatus.NoSolution);
    expect(() => solve([], 0)).toThrow();
  });
});

describe('/api/classes', () => {
  let classId: string;

  it('chua dang nhap -> 401; id sai dinh dang -> 404', async () => {
    expect((await request(app).get('/api/classes')).status).toBe(401);
    expect((await request(app).get('/api/classes/abc').set(admin)).status).toBe(404);
  });

  it('POST validate: binding, ten rong, suc chua, khoa hoc khong ton tai', async () => {
    let res = await request(app).post('/api/classes').set(admin).send({ name: null });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.errors).toEqual({ Name: ['The Name field is required.'] });

    res = await request(app).post('/api/classes').set(admin).send({ name: 'x', courseIds: ['abc'] });
    expect(res.body.errors['$.courseIds[0]'][0]).toBe(
      'The JSON value could not be converted to System.Guid. Path: $.courseIds[0] | LineNumber: 0 | BytePositionInLine: 30.',
    );

    res = await request(app).post('/api/classes').set(admin).set('Content-Type', 'text/plain').send('abc');
    expect(res.status).toBe(415);

    res = await request(app).post('/api/classes').set(admin).send({ name: '  ' });
    expect(res.body).toMatchObject({ success: false, code: 'CLASS_NAME_REQUIRED', message: 'Ten lop hoc la bat buoc.' });
    res = await request(app).post('/api/classes').set(admin).send({ name: 'x', capacity: 0 });
    expect(res.body.code).toBe('CLASS_INVALID_CAPACITY');
    res = await request(app).post('/api/classes').set(admin).send({ name: `${P}x`, courseIds: ['11111111-1111-1111-1111-111111111111'] });
    expect(res.body.code).toBe('COURSE_NOT_FOUND');
    res = await request(app).post('/api/classes').set(admin).send({ name: `${P}x`, teacherIds: ['11111111-1111-1111-1111-111111111111'] });
    expect(res.body.code).toBe('TEACHER_NOT_FOUND');
  });

  it('POST khong co quyen PAGE_ADMIN_CLASSES_VIEW -> 403', async () => {
    const res = await request(app).post('/api/classes').set(gv.headers).send({ name: `${P}x` });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 });
  });

  it('POST tao lop + sinh lich, tra 201 + Location, endDate = buoi cuoi', async () => {
    const res = await request(app)
      .post('/api/classes')
      .set(admin)
      .send({
        name: `  ${P}Lop 1 `,
        startDate: '2033-01-03', // thu 2
        capacity: null,
        courseIds: [courseA, courseB, courseA],
        teacherIds: [gv.profileId],
        TotalPeriods: 3,
        ScheduleConfigs: [{ Days: ['Thu 2', 'Thu 4'], Periods: [TIET], RoomId: null, AllowAlternativePeriods: false }],
      });
    expect(res.status).toBe(201);
    classId = res.body.data.id;
    expect(res.headers.location).toMatch(new RegExp(`/api/classes/${classId}$`));
    expect(res.body.data).toMatchObject({
      name: `${P}Lop 1`,
      startDate: '2033-01-03',
      endDate: '2033-01-10',
      currentSize: 0,
      capacity: null,
      active: true,
      teachers: [{ id: gv.profileId, name: `${P}GV Mot` }],
      students: [],
    });
    expect(res.body.data.courses).toHaveLength(2);
    expect(res.body.data.courses.find((c: { id: string }) => c.id === courseA)).toEqual({
      id: courseA,
      name: `${P}KH A`,
      description: 'mo ta',
      basePrice: 1500000.5,
      active: true,
    });
    const sessions = await prisma.buoihoc.findMany({ where: { MaLopHoc: classId }, orderBy: { NgayHoc: 'asc' } });
    expect(sessions.map((s) => [s.NgayHoc.toISOString().slice(0, 10), s.MaTietBatDau, s.NoiDung, s.TieuDe])).toEqual([
      ['2033-01-03', TIET, `Lich hoc 01/03/2033 tiet ${TIET}-${TIET}`, `  ${P}Lop 1 `],
      ['2033-01-05', TIET, `Lich hoc 01/05/2033 tiet ${TIET}-${TIET}`, `  ${P}Lop 1 `],
      ['2033-01-10', TIET, `Lich hoc 01/10/2033 tiet ${TIET}-${TIET}`, `  ${P}Lop 1 `],
    ]);
  });

  it('POST trung ten -> 400; trung lich giao vien -> 400 va rollback', async () => {
    let res = await request(app).post('/api/classes').set(admin).send({ name: `${P}lop 1` });
    expect(res.body.code).toBe('CLASS_NAME_EXISTS');
    res = await request(app)
      .post('/api/classes')
      .set(admin)
      .send({
        name: `${P}Lop 2`,
        startDate: '2033-01-03',
        teacherIds: [gv.profileId],
        TotalPeriods: 1,
        ScheduleConfigs: [{ Days: ['Thu 2'], Periods: [TIET], AllowAlternativePeriods: false }],
      });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'SCHEDULE_GENERATION_FAILED',
      message: `Khong co khung gio kha dung ngay 01/03/2033 cho mau tiet ${TIET}-${TIET}; xung dot: giao vien. Da xep 0/1 tiet.`,
    });
    expect(await prisma.lophoc.count({ where: { TenLop: `${P}Lop 2` } })).toBe(0);
  });

  it('POST loi cau hinh lich', async () => {
    const base = { name: `${P}Lop 3`, startDate: '2033-01-03', TotalPeriods: 5 };
    let res = await request(app).post('/api/classes').set(admin).send({ ...base, ScheduleConfigs: [{ Days: ['Thu 9'], Periods: [1] }] });
    expect(res.body.message).toBe('Invalid day name: Thu 9');
    res = await request(app).post('/api/classes').set(admin).send({ ...base, ScheduleConfigs: [{ Days: ['Thu 2'], Periods: [15] }] });
    expect(res.body.message).toBe('Tiet hoc phai nam trong khoang tu 1 den 14.');
    res = await request(app).post('/api/classes').set(admin).send({ ...base, ScheduleConfigs: [{ Days: [], Periods: [1] }] });
    expect(res.body.message).toBe('Khong co cau hinh lich hop le (can chon ngay va tiet hoc).');
    res = await request(app).post('/api/classes').set(admin).send({ ...base, endDate: '2033-01-01', ScheduleConfigs: [{ Days: ['Thu 2'], Periods: [1] }] });
    expect(res.body.message).toBe('Ngay ket thuc phai bang hoac sau ngay bat dau.');
    res = await request(app).post('/api/classes').set(admin).send({ ...base, ScheduleConfigs: [null] });
    expect(res.body).toMatchObject({ code: 'CREATE_CLASS_FAILED', message: 'Object reference not set to an instance of an object.' });
  });

  it('GET list / by id / teachers-overview / assigned-to-me', async () => {
    const list = await request(app).get('/api/classes').set(hs.headers);
    expect(list.status).toBe(200);
    expect(list.body.data.some((c: { id: string }) => c.id === classId)).toBe(true);

    const one = await request(app).get(`/api/classes/${classId.toUpperCase()}`).set(hs.headers);
    expect(one.body.data.id).toBe(classId);

    const ov = await request(app).get('/api/classes/teachers-overview').set(admin);
    const mine = ov.body.data.find((t: { id: string }) => t.id === gv.profileId);
    expect(mine).toMatchObject({ name: `${P}GV Mot`, email: gv.email, classes: [{ classId, className: `${P}Lop 1` }] });

    const as = await request(app).get('/api/classes/assigned-to-me').set(gv.headers);
    expect(as.body.data.map((c: { id: string }) => c.id)).toEqual([classId]);
    const noProfile = await request(app).get('/api/classes/assigned-to-me').set(admin);
    expect(noProfile.status).toBe(404);
    expect(noProfile.body.code).toBe('TEACHER_PROFILE_NOT_FOUND');
  });

  it('hoc sinh trong lop: them / trung / quyen / suc chua / xoa / them lai', async () => {
    const url = `/api/classes/${classId}/students`;
    let res = await request(app).post(url).set(gv.headers).send({ studentId: hs.profileId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Da them hoc sinh vao lop.',
      data: { studentId: hs.profileId, userId: hs.userId, fullName: `${P}HS Binh`, email: hs.email, active: true },
    });
    expect(res.body.data.joinedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    res = await request(app).post(url).set(gv.headers).send({ studentId: hs.profileId });
    expect(res.body.code).toBe('CLASS_STUDENT_EXISTS');
    res = await request(app).post(url).set(gv2.headers).send({ studentId: hs2.profileId });
    expect(res.status).toBe(403);
    expect(res.text).toBe('');
    res = await request(app).post(url).set(admin).send({ studentId: '11111111-1111-1111-1111-111111111111' });
    expect(res.body.code).toBe('STUDENT_NOT_FOUND');

    // assigned-to-me: ban .NET khong nap hoc sinh -> userId rong, fullName = MaHocSinh
    const as = await request(app).get('/api/classes/assigned-to-me').set(gv.headers);
    expect(as.body.data[0].students[0]).toMatchObject({
      studentId: hs.profileId,
      userId: '00000000-0000-0000-0000-000000000000',
      fullName: hs.profileId,
      email: null,
    });

    // Update: suc chua < so hoc sinh
    res = await request(app).put(`/api/classes/${classId}`).set(admin).send({ name: `${P}Lop 1`, capacity: 0 });
    expect(res.body.code).toBe('CLASS_INVALID_CAPACITY');
    res = await request(app).put(`/api/classes/${classId}`).set(admin).send({ name: `${P}Lop 1`, capacity: 1, courseIds: [courseA], teacherIds: [gv.profileId] });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ capacity: 1, currentSize: 1, courses: [{ id: courseA }] });
    res = await request(app).post(url).set(admin).send({ studentId: hs2.profileId });
    expect(res.body.code).toBe('CLASS_CAPACITY_FULL');

    const listed = await request(app).get(url).set(gv.headers);
    expect(listed.body.data.map((s: { studentId: string }) => s.studentId)).toEqual([hs.profileId]);

    res = await request(app).delete(`${url}/${hs.profileId}`).set(gv.headers);
    expect(res.body).toMatchObject({ message: 'Da xoa mem hoc sinh khoi lop.', data: { classId, studentId: hs.profileId } });
    res = await request(app).delete(`${url}/${hs.profileId}`).set(gv.headers);
    expect(res.body.code).toBe('CLASS_STUDENT_NOT_FOUND');
    const cls = await prisma.lophoc.findUnique({ where: { MaLopHoc: classId } });
    expect(cls?.SiSoHienTai).toBe(0);

    res = await request(app).post(url).set(admin).send({ studentId: hs.profileId });
    expect(res.status).toBe(200);
    const row = await prisma.hocsinhlophoc.findFirst({ where: { MaLopHoc: classId, MaHocSinh: hs.profileId! } });
    expect(row).toMatchObject({ DaXoa: false, TrangThai: true, NgayRoiLop: null });
  });

  it('PUT doi giao vien/khoa hoc: lien ket cu bi xoa mem; giao vien cu mat quyen quan ly', async () => {
    const res = await request(app)
      .put(`/api/classes/${classId}`)
      .set(admin)
      .send({ name: `${P}Lop 1b`, startDate: '2033-01-03', endDate: '2033-06-30', capacity: 5, active: false, courseIds: [courseB], teacherIds: [gv2.profileId] });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: `${P}Lop 1b`,
      endDate: '2033-06-30',
      active: false,
      courses: [{ id: courseB, active: false }],
      teachers: [{ id: gv2.profileId }],
    });
    const link = await prisma.giangvienlophoc.findFirst({ where: { MaLopHoc: classId, MaGiangVien: gv.profileId! } });
    expect(link).toMatchObject({ DaXoa: true, TrangThai: false });
    expect((await request(app).get(`/api/classes/${classId}/students`).set(gv.headers)).status).toBe(403);
    expect((await request(app).put('/api/classes/11111111-1111-1111-1111-111111111111').set(admin).send({ name: 'x' })).body.code).toBe(
      'CLASS_NOT_FOUND',
    );
  });

  it('DELETE xoa mem lop + lien ket + lich', async () => {
    const res = await request(app).delete(`/api/classes/${classId}`).set(admin);
    expect(res.body).toMatchObject({ success: true, message: 'Da xoa mem lop hoc.', data: { id: classId } });
    expect((await request(app).get(`/api/classes/${classId}`).set(admin)).status).toBe(404);
    expect(await prisma.buoihoc.count({ where: { MaLopHoc: classId, DaXoa: false } })).toBe(0);
    expect(await prisma.chitietkhoahoc_lophoc.count({ where: { MaLopHoc: classId, DaXoa: false } })).toBe(0);
    expect((await request(app).delete(`/api/classes/${classId}`).set(admin)).status).toBe(404);
  });
});
