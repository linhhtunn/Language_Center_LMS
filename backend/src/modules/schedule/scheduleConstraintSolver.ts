// Chuyen tu Services/ScheduleConstraintSolver.cs - giu nguyen thu tu duyet de ra cung ket qua voi .NET.

export interface ScheduleSolverCandidate {
  start: number;
  end: number;
  roomId: string | null;
}

export interface ScheduleSolverTask {
  classId: string;
  /** Ngay hoc (Date 00:00 UTC). */
  date: Date;
  teacherIds: ReadonlySet<string>;
  candidates: ScheduleSolverCandidate[];
  studentIds: ReadonlySet<string>;
}

export enum ScheduleSearchStatus {
  Solved = 0,
  NoSolution = 1,
  SearchLimitReached = 2,
}

export interface ScheduleSearchMetrics {
  statesExplored: number;
  backtracks: number;
  candidateAttempts: number;
  candidatesRejected: number;
}

export interface ScheduleSearchResult {
  status: ScheduleSearchStatus;
  assignments: Map<number, ScheduleSolverCandidate>;
  metrics: ScheduleSearchMetrics;
}

/** Tach danh sach tiet thanh cac khoang lien tiep: [1,2,3,5,6] -> [(1,3),(5,6)]. */
export function splitIntoContiguousRanges(selectedPeriods: Iterable<number>): Array<{ start: number; end: number }> {
  const periods = [...new Set(selectedPeriods)].sort((a, b) => a - b);
  if (periods.length === 0) return [];
  const ranges: Array<{ start: number; end: number }> = [];
  let rangeStart = periods[0];
  let rangeEnd = periods[0];
  for (let i = 1; i < periods.length; i++) {
    if (periods[i] === rangeEnd + 1) {
      rangeEnd = periods[i];
      continue;
    }
    ranges.push({ start: rangeStart, end: rangeEnd });
    rangeStart = periods[i];
    rangeEnd = periods[i];
  }
  ranges.push({ start: rangeStart, end: rangeEnd });
  return ranges;
}

function intersects(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

function conflictsWithAssignments(
  currentTask: ScheduleSolverTask,
  currentCandidate: ScheduleSolverCandidate,
  assignments: Map<number, ScheduleSolverCandidate>,
  tasks: readonly ScheduleSolverTask[],
): boolean {
  for (const [key, value] of assignments) {
    const assignedTask = tasks[key];
    const overlaps = value.start <= currentCandidate.end && value.end >= currentCandidate.start;
    if (assignedTask.date.getTime() !== currentTask.date.getTime() || !overlaps) continue;

    const sameClass = assignedTask.classId === currentTask.classId;
    const sharedTeacher = intersects(assignedTask.teacherIds, currentTask.teacherIds);
    const sharedStudent = intersects(assignedTask.studentIds, currentTask.studentIds);
    const sameRoom = value.roomId !== null && value.roomId === currentCandidate.roomId;
    if (sameClass || sharedTeacher || sharedStudent || sameRoom) return true;
  }
  return false;
}

/** Tim kiem quay lui (backtracking), toi da maxStates trang thai. */
export function solve(tasks: readonly ScheduleSolverTask[], maxStates: number): ScheduleSearchResult {
  if (maxStates < 1) throw new RangeError('maxStates');

  // OrderBy(so ung vien).ThenBy(ngay).ThenBy(chi so) - sort cua JS on dinh, khoa phu cuoi la index nen tuong duong.
  const orderedTasks = tasks
    .map((task, index) => ({ task, index }))
    .sort(
      (a, b) =>
        a.task.candidates.length - b.task.candidates.length ||
        a.task.date.getTime() - b.task.date.getTime() ||
        a.index - b.index,
    );

  const assignments = new Map<number, ScheduleSolverCandidate>();
  let statesExplored = 0;
  let backtracks = 0;
  let candidateAttempts = 0;
  let candidatesRejected = 0;
  let searchLimitReached = false;

  const search = (depth: number): boolean => {
    if (statesExplored >= maxStates) {
      searchLimitReached = true;
      return false;
    }
    statesExplored++;
    if (depth === orderedTasks.length) return true;

    const current = orderedTasks[depth];
    for (const candidate of current.task.candidates) {
      candidateAttempts++;
      if (conflictsWithAssignments(current.task, candidate, assignments, tasks)) {
        candidatesRejected++;
        continue;
      }
      assignments.set(current.index, candidate);
      if (search(depth + 1)) return true;
      assignments.delete(current.index);
      backtracks++;
      if (searchLimitReached) return false;
    }
    return false;
  };

  const solved = search(0);
  const status = solved
    ? ScheduleSearchStatus.Solved
    : searchLimitReached
      ? ScheduleSearchStatus.SearchLimitReached
      : ScheduleSearchStatus.NoSolution;
  return {
    status,
    assignments: solved ? new Map(assignments) : new Map(),
    metrics: { statesExplored, backtracks, candidateAttempts, candidatesRejected },
  };
}
