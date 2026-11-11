import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Router, type Response } from 'express';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { isGuid } from '../../utils/dotnetCompat.js';
import {
  AddClassStudentRequestDtoSpec,
  UpsertClassRequestDtoSpec,
  type AddClassStudentRequest,
  type UpsertClassRequest,
} from './classes.dto.js';
import * as svc from './classes.service.js';
import { bindBody, guidParams, notTrue, sendProblem, todayDateOnly } from './dtoBinding.js';
import {
  generateAndPersistSchedule,
  isMySqlLockConflict as isMySqlLockError,
} from '../schedule/scheduleGenerator.service.js';

/** ScheduleGeneratorService dung chung voi module schedule (ban .NET chi co 1 service). */
const generateAndPersist = (tx: Parameters<typeof generateAndPersistSchedule>[0], classId: string, r: UpsertClassRequest) =>
  generateAndPersistSchedule(tx, classId, {
    name: r.Name,
    startDate: r.StartDate,
    endDate: r.EndDate,
    capacity: r.Capacity,
    teacherIds: r.TeacherIds,
    totalPeriods: r.TotalPeriods,
    scheduleConfigs: (r.ScheduleConfigs ?? []).map((c) =>
      c === null ? null : { days: c.Days, periods: c.Periods, roomId: c.RoomId, allowAlternativePeriods: c.AllowAlternativePeriods },
    ),
  });

// Chuyen tu Controllers/ClassesController.cs ([Authorize], route api/classes)
// va Controllers/ClassStudentsController.cs ([AuthorizeByPermission("CLASSES_STUDENTS_VIEW")], route api/classes/{classId:guid}/students).
const router = Router();

const forbid = (res: Response) => res.status(403).end();

class RollbackSignal extends Error {
  constructor(public result: { error: string; isConflict: boolean }) {
    super('rollback');
  }
}

// ===================== ClassesController =====================

router.get('/api/classes', requireAuth, async (_req, res) => {
  res.json(ok(await svc.listClasses()));
});

router.get('/api/classes/assigned-to-me', ...requirePermission('PAGE_TEACHER_SCHEDULE_VIEW'), async (req, res) => {
  const teacherId = req.user!.profileId;
  if (!isGuid(teacherId)) {
    return res.status(404).json(fail('Khong tim thay ho so giao vien.', 'TEACHER_PROFILE_NOT_FOUND'));
  }
  return res.json(ok(await svc.listClassesAssignedTo(teacherId.toLowerCase())));
});

router.get('/api/classes/teachers-overview', ...requirePermission('PAGE_ADMIN_CLASSES_VIEW'), async (_req, res) => {
  res.json(ok(await svc.teachersOverview()));
});

router.get('/api/classes/:id', guidParams('id'), requireAuth, async (req, res) => {
  const entity = await svc.loadClass(req.params.id as string);
  if (!entity) return res.status(404).json(fail('Khong tim thay lop hoc.', 'CLASS_NOT_FOUND'));
  return res.json(ok(svc.toClassDto(entity)));
});

router.post('/api/classes', ...requirePermission('PAGE_ADMIN_CLASSES_VIEW'), async (req, res) => {
  const bound = bindBody<UpsertClassRequest>(req, UpsertClassRequestDtoSpec, 'request');
  if (!bound.ok) return sendProblem(res, bound.status, bound.body);
  const request = bound.value;

  const validation = await svc.validateRequest(request);
  if (validation) return res.status(400).json(validation);

  let classId: string;
  try {
    classId = await prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const id = randomUUID();
        await tx.lophoc.create({
          data: {
            MaLopHoc: id,
            TenLop: request.Name.trim(),
            NgayBatDau: request.StartDate,
            NgayKetThuc: request.EndDate,
            SiSoHienTai: 0,
            SiSoToiDa: request.Capacity,
            TrangThai: request.Active,
            DaXoa: false,
            ThoiGianTao: now,
          },
        });
        await svc.replaceCourseLinks(tx, id, request.CourseIds);
        await svc.replaceTeacherLinks(tx, id, request.TeacherIds);

        if (request.ScheduleConfigs?.length > 0 && (request.TotalPeriods ?? 0) > 0) {
          const gen = await generateAndPersist(tx, id, request);
          if (!gen.success) {
            const isConflict = gen.error?.startsWith('Du lieu lich da thay doi') === true;
            throw new RollbackSignal({ error: gen.error ?? 'Khong the tao lich.', isConflict });
          }
          if (gen.endDate) {
            await tx.lophoc.update({ where: { MaLopHoc: id }, data: { NgayKetThuc: gen.endDate } });
          }
        }
        return id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15_000, timeout: 120_000 },
    );
  } catch (e) {
    if (e instanceof RollbackSignal) {
      return e.result.isConflict
        ? res.status(409).json(fail(e.result.error, 'SCHEDULE_CONCURRENT_CONFLICT'))
        : res.status(400).json(fail(e.result.error, 'SCHEDULE_GENERATION_FAILED'));
    }
    if (isMySqlLockError(e)) {
      return res
        .status(409)
        .json(fail('Lich vua duoc cap nhat boi yeu cau khac. Hay tai lai va thu lai.', 'SCHEDULE_CONCURRENCY_RETRY'));
    }
    return res.status(400).json(fail((e as Error)?.message ?? 'Loi khi tao lop.', 'CREATE_CLASS_FAILED'));
  }

  const created = await svc.loadClass(classId);
  res.setHeader('Location', `${req.protocol}://${req.get('host')}/api/classes/${classId}`);
  return res.status(201).json(ok(svc.toClassDto(created!)));
});

router.put('/api/classes/:id', guidParams('id'), ...requirePermission('PAGE_ADMIN_CLASSES_VIEW'), async (req, res) => {
  const id = req.params.id as string;
  const bound = bindBody<UpsertClassRequest>(req, UpsertClassRequestDtoSpec, 'request');
  if (!bound.ok) return sendProblem(res, bound.status, bound.body);
  const request = bound.value;

  const entity = await prisma.lophoc.findFirst({ where: { MaLopHoc: id, ...notTrue('DaXoa') } as Prisma.lophocWhereInput });
  if (!entity) return res.status(404).json(fail('Khong tim thay lop hoc.', 'CLASS_NOT_FOUND'));

  const validation = await svc.validateRequest(request, id);
  if (validation) return res.status(400).json(validation);

  const activeStudentCount = await svc.countActiveStudents(id);
  if (request.Capacity !== null && request.Capacity < activeStudentCount) {
    return res.status(400).json(fail('Suc chua moi nho hon so hoc sinh hien tai.', 'CLASS_CAPACITY_TOO_SMALL'));
  }

  // SaveChangesAsync cua EF la 1 giao dich.
  await prisma.$transaction(async (tx) => {
    await tx.lophoc.update({
      where: { MaLopHoc: entity.MaLopHoc },
      data: {
        TenLop: request.Name.trim(),
        NgayBatDau: request.StartDate,
        NgayKetThuc: request.EndDate,
        SiSoToiDa: request.Capacity,
        SiSoHienTai: activeStudentCount,
        TrangThai: request.Active,
        ThoiGianSua: new Date(),
      },
    });
    await svc.replaceCourseLinks(tx, id, request.CourseIds);
    await svc.replaceTeacherLinks(tx, id, request.TeacherIds);
  });

  const updated = await svc.loadClass(id);
  return res.json(ok(svc.toClassDto(updated!)));
});

router.delete('/api/classes/:id', guidParams('id'), ...requirePermission('PAGE_ADMIN_CLASSES_VIEW'), async (req, res) => {
  const id = req.params.id as string;
  const entity = await prisma.lophoc.findFirst({ where: { MaLopHoc: id, ...notTrue('DaXoa') } as Prisma.lophocWhereInput });
  if (!entity) return res.status(404).json(fail('Khong tim thay lop hoc.', 'CLASS_NOT_FOUND'));

  const now = new Date();
  const soft = { DaXoa: true, TrangThai: false, ThoiGianSua: now };
  await prisma.$transaction([
    prisma.lophoc.update({ where: { MaLopHoc: entity.MaLopHoc }, data: soft }),
    prisma.chitietkhoahoc_lophoc.updateMany({ where: { MaLopHoc: id, ...notTrue('DaXoa') } as Prisma.chitietkhoahoc_lophocWhereInput, data: soft }),
    prisma.giangvienlophoc.updateMany({ where: { MaLopHoc: id, ...notTrue('DaXoa') } as Prisma.giangvienlophocWhereInput, data: soft }),
    // Xoa tat ca lich hoc cua lop nay
    prisma.buoihoc.updateMany({ where: { MaLopHoc: id, ...notTrue('DaXoa') } as Prisma.buoihocWhereInput, data: soft }),
  ]);
  return res.json(ok({ id }, 'Da xoa mem lop hoc.'));
});

// ===================== ClassStudentsController =====================

const studentsAuth = requirePermission('CLASSES_STUDENTS_VIEW');

router.get('/api/classes/:classId/students', guidParams('classId'), ...studentsAuth, async (req, res) => {
  const classId = req.params.classId as string;
  if (!(await svc.canManageClass(req.user, classId))) return forbid(res);
  return res.json(ok(await svc.listClassStudents(classId)));
});

router.post('/api/classes/:classId/students', guidParams('classId'), ...studentsAuth, async (req, res) => {
  const classId = req.params.classId as string;
  const bound = bindBody<AddClassStudentRequest>(req, AddClassStudentRequestDtoSpec, 'request');
  if (!bound.ok) return sendProblem(res, bound.status, bound.body);
  const { StudentId: studentId } = bound.value;

  if (!(await svc.canManageClass(req.user, classId))) return forbid(res);

  const classEntity = await prisma.lophoc.findFirst({ where: { MaLopHoc: classId, ...notTrue('DaXoa') } as Prisma.lophocWhereInput });
  if (!classEntity) return res.status(404).json(fail('Khong tim thay lop hoc.', 'CLASS_NOT_FOUND'));

  const studentExists = await prisma.hocsinh.count({ where: { MaHocSinh: studentId, ...notTrue('DaXoa') } as Prisma.hocsinhWhereInput });
  if (!studentExists) return res.status(404).json(fail('Khong tim thay hoc sinh.', 'STUDENT_NOT_FOUND'));

  const existing = await prisma.hocsinhlophoc.findFirst({ where: { MaLopHoc: classId, MaHocSinh: studentId } });
  if (existing && existing.DaXoa !== true && existing.TrangThai !== false) {
    return res.status(400).json(fail('Hoc sinh da co trong lop.', 'CLASS_STUDENT_EXISTS'));
  }

  const currentCount = await svc.countActiveStudents(classId);
  if (classEntity.SiSoToiDa !== null && currentCount >= classEntity.SiSoToiDa) {
    return res.status(400).json(fail('Lop hoc da vuot suc chua.', 'CLASS_CAPACITY_FULL'));
  }

  const now = new Date();
  await prisma.$transaction([
    existing
      ? prisma.hocsinhlophoc.update({
          where: { MaLopHoc_MaHocSinh: { MaLopHoc: existing.MaLopHoc, MaHocSinh: existing.MaHocSinh } },
          data: { DaXoa: false, TrangThai: true, NgayThamGia: todayDateOnly(), NgayRoiLop: null, ThoiGianSua: now },
        })
      : prisma.hocsinhlophoc.create({
          data: { MaLopHoc: classId, MaHocSinh: studentId, NgayThamGia: todayDateOnly(), TrangThai: true, DaXoa: false, ThoiGianTao: now },
        }),
    prisma.lophoc.update({ where: { MaLopHoc: classEntity.MaLopHoc }, data: { SiSoHienTai: currentCount + 1, ThoiGianSua: now } }),
  ]);

  const saved = await svc.loadEnrollment(classId, studentId);
  return res.json(ok(svc.toClassStudentDto(saved!), 'Da them hoc sinh vao lop.'));
});

router.delete('/api/classes/:classId/students/:studentId', guidParams('classId', 'studentId'), ...studentsAuth, async (req, res) => {
  const classId = req.params.classId as string;
  const studentId = req.params.studentId as string;
  if (!(await svc.canManageClass(req.user, classId))) return forbid(res);

  const enrollment = await prisma.hocsinhlophoc.findFirst({
    where: { MaLopHoc: classId, MaHocSinh: studentId, ...notTrue('DaXoa') } as Prisma.hocsinhlophocWhereInput,
  });
  if (!enrollment) return res.status(404).json(fail('Hoc sinh khong co trong lop.', 'CLASS_STUDENT_NOT_FOUND'));

  const now = new Date();
  const classEntity = await prisma.lophoc.findFirst({ where: { MaLopHoc: classId } });
  // Ban .NET dem TRUOC khi luu thay doi (ban ghi dang xoa van duoc dem) roi tru 1.
  const activeCount = classEntity ? await svc.countActiveStudents(classId) : 0;
  await prisma.$transaction([
    prisma.hocsinhlophoc.update({
      where: { MaLopHoc_MaHocSinh: { MaLopHoc: enrollment.MaLopHoc, MaHocSinh: enrollment.MaHocSinh } },
      data: { DaXoa: true, TrangThai: false, NgayRoiLop: todayDateOnly(), ThoiGianSua: now },
    }),
    ...(classEntity
      ? [prisma.lophoc.update({ where: { MaLopHoc: classEntity.MaLopHoc }, data: { SiSoHienTai: Math.max(0, activeCount - 1), ThoiGianSua: now } })]
      : []),
  ]);
  return res.json(ok({ classId, studentId }, 'Da xoa mem hoc sinh khoi lop.'));
});

export default router;
