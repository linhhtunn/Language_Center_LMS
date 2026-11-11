import type { DtoSpec } from './dtoBinding.js';

// DTO lay tu DTOs/P0AdminDtos.cs (ban .NET). Key trong object da bind = ten thuoc tinh C#.

export interface ScheduleConfig {
  Days: (string | null)[];
  Periods: number[];
  RoomId: string | null;
  AllowAlternativePeriods: boolean;
}

export interface UpsertClassRequest {
  Name: string;
  StartDate: Date | null;
  EndDate: Date | null;
  Capacity: number | null;
  Active: boolean;
  CourseIds: string[];
  TeacherIds: string[];
  TotalPeriods: number | null;
  ScheduleConfigs: (ScheduleConfig | null)[];
}

export const ScheduleConfigDtoSpec: DtoSpec = {
  clrName: 'backend.DTOs.ScheduleConfigDto',
  fields: [
    { name: 'Days', type: { list: 'string?' }, default: () => [] },
    { name: 'Periods', type: { list: 'int' }, default: () => [] },
    { name: 'RoomId', type: 'guid?' },
    { name: 'AllowAlternativePeriods', type: 'bool', default: () => false },
  ],
};

export const UpsertClassRequestDtoSpec: DtoSpec = {
  clrName: 'backend.DTOs.UpsertClassRequestDto',
  fields: [
    { name: 'Name', type: 'string', default: () => '' },
    { name: 'StartDate', type: 'dateonly?' },
    { name: 'EndDate', type: 'dateonly?' },
    { name: 'Capacity', type: 'int?' },
    { name: 'Active', type: 'bool', default: () => true },
    { name: 'CourseIds', type: { list: 'guid' }, default: () => [] },
    { name: 'TeacherIds', type: { list: 'guid' }, default: () => [] },
    { name: 'TotalPeriods', type: 'int?' },
    { name: 'ScheduleConfigs', type: { list: ScheduleConfigDtoSpec }, default: () => [] },
  ],
};

export interface AddClassStudentRequest {
  StudentId: string;
}

export const AddClassStudentRequestDtoSpec: DtoSpec = {
  clrName: 'backend.DTOs.AddClassStudentRequestDto',
  fields: [{ name: 'StudentId', type: 'guid', default: () => '00000000-0000-0000-0000-000000000000' }],
};

// ----- Response DTO (camelCase giong System.Text.Json) -----

export interface CourseDto {
  id: string;
  name: string;
  description: string | null;
  basePrice: number | null;
  active: boolean;
}

export interface TeacherItemDto {
  id: string;
  name: string;
}

export interface ClassStudentDto {
  studentId: string;
  userId: string;
  fullName: string;
  email: string | null;
  joinedAt: string | null;
  active: boolean;
}

export interface ClassDto {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  currentSize: number;
  capacity: number | null;
  active: boolean;
  courses: CourseDto[];
  teachers: TeacherItemDto[];
  students: ClassStudentDto[];
}

export interface TeacherClassOverviewDto {
  classId: string;
  className: string;
  courses: CourseDto[];
}

export interface TeacherOverviewDto {
  id: string;
  name: string;
  email: string | null;
  classes: TeacherClassOverviewDto[];
}
