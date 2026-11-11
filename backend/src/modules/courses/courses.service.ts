import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { fail, type ApiResponse } from '../../utils/apiResponse.js';

// Chuyen tu logic trong CoursesController.cs (.NET).

const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };

export interface CourseDto {
  id: string;
  name: string;
  description: string | null;
  basePrice: number | Prisma.Decimal | null;
  active: boolean;
}

export interface UpsertCourseRequest {
  Name: string;
  Description: string | null;
  BasePrice: number | null;
  Active: boolean;
}

type CourseRow = {
  MaKhoaHoc: string;
  TenKhoaHoc: string;
  MoTa: string | null;
  GiaCoBan: Prisma.Decimal | number | null;
  TrangThai: boolean | null;
};

/**
 * Cot DECIMAL(14,2) doc tu DB: decimal .NET giu nguyen scale nen ghi JSON 1234.50 (khong phai 1234.5).
 * Dung JSON.rawJSON (Node >= 21) de ghi y het; gia tri so khong doi khi frontend parse.
 */
const rawJSON = (JSON as unknown as { rawJSON?: (s: string) => unknown }).rawJSON;
function dbDecimal(v: Prisma.Decimal | number | null): CourseDto['basePrice'] {
  if (v === null || typeof v === 'number' || !rawJSON) return v;
  return rawJSON(v.toFixed(2)) as number;
}

export function toDto(c: CourseRow): CourseDto {
  return {
    id: c.MaKhoaHoc,
    name: c.TenKhoaHoc,
    description: c.MoTa,
    basePrice: dbDecimal(c.GiaCoBan),
    active: c.TrangThai !== false,
  };
}

export async function listCourses(): Promise<CourseDto[]> {
  const rows = await prisma.khoahoc.findMany({ where: notDeleted, orderBy: { TenKhoaHoc: 'asc' } });
  return rows.map(toDto);
}

export function findActiveCourse(id: string) {
  return prisma.khoahoc.findFirst({ where: { MaKhoaHoc: id, ...notDeleted } });
}

export async function validateRequest(request: UpsertCourseRequest, currentId?: string): Promise<ApiResponse<null> | null> {
  if (!request.Name || !request.Name.trim()) return fail('Ten khoa hoc la bat buoc.', 'COURSE_NAME_REQUIRED');
  const normalizedName = request.Name.trim();
  const exists = await prisma.khoahoc.count({
    where: { ...notDeleted, TenKhoaHoc: normalizedName, ...(currentId ? { MaKhoaHoc: { not: currentId } } : {}) },
  });
  return exists ? fail('Ten khoa hoc da ton tai.', 'COURSE_NAME_EXISTS') : null;
}

/** Ban .NET tra ToDto(entity trong bo nho) -> basePrice la gia tri client gui (chua lam tron theo DECIMAL(14,2)). */
export async function createCourse(request: UpsertCourseRequest): Promise<CourseDto> {
  const row = {
    MaKhoaHoc: randomUUID(),
    TenKhoaHoc: request.Name.trim(),
    MoTa: request.Description?.trim() ?? null,
    GiaCoBan: request.BasePrice,
    TrangThai: request.Active,
    DaXoa: false,
    ThoiGianTao: new Date(),
  };
  await prisma.khoahoc.create({ data: row });
  return toDto(row);
}

export async function updateCourse(existing: CourseRow, request: UpsertCourseRequest): Promise<CourseDto> {
  const data = {
    TenKhoaHoc: request.Name.trim(),
    MoTa: request.Description?.trim() ?? null,
    GiaCoBan: request.BasePrice,
    TrangThai: request.Active,
    ThoiGianSua: new Date(),
  };
  await prisma.khoahoc.update({ where: { MaKhoaHoc: existing.MaKhoaHoc }, data });
  return toDto({ ...existing, ...data });
}

/** Xoa mem khoa hoc + cac lien ket khoa hoc - lop hoc (mot SaveChanges = mot transaction). */
export async function softDeleteCourse(id: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.khoahoc.update({ where: { MaKhoaHoc: id }, data: { DaXoa: true, TrangThai: false, ThoiGianSua: now } }),
    prisma.chitietkhoahoc_lophoc.updateMany({
      where: { MaKhoaHoc: id, ...notDeleted },
      data: { DaXoa: true, TrangThai: false, ThoiGianSua: now },
    }),
  ]);
}
