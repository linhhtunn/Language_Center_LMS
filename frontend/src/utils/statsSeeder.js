import {
  DEMO_COURSE_NAMES,
  DEMO_STUDENT_NAMES,
  DEMO_TEACHER_NAMES,
  SCORE_BUCKETS,
  DATE_PRESETS,
} from "../constants/statsConstants";

export {
  DEMO_COURSE_NAMES,
  DEMO_STUDENT_NAMES,
  DEMO_TEACHER_NAMES,
  SCORE_BUCKETS,
  DATE_PRESETS,
};

export const hashSeed = (value = "") => {
  const text = String(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 2147483647;
  }
  return Math.abs(hash);
};

export const seededNumber = (seed, min, max, decimals = 0) => {
  const hashed = hashSeed(seed);
  const ratio = (hashed % 10000) / 10000;
  const raw = min + (max - min) * ratio;
  return Number(raw.toFixed(decimals));
};

export const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

export const startOfDay = (input = new Date()) => {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfDay = (input = new Date()) => {
  const date = new Date(input);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const addDays = (input, days) => {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date;
};

export const startOfWeek = (input = new Date()) => {
  const date = startOfDay(input);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

export const endOfWeek = (input = new Date()) =>
  endOfDay(addDays(startOfWeek(input), 6));

export const startOfMonth = (input = new Date()) =>
  new Date(input.getFullYear(), input.getMonth(), 1);

export const endOfMonth = (input = new Date()) =>
  endOfDay(new Date(input.getFullYear(), input.getMonth() + 1, 0));

export const startOfQuarter = (input = new Date()) => {
  const quarterMonth = Math.floor(input.getMonth() / 3) * 3;
  return new Date(input.getFullYear(), quarterMonth, 1);
};

export const endOfQuarter = (input = new Date()) => {
  const start = startOfQuarter(input);
  return endOfDay(new Date(start.getFullYear(), start.getMonth() + 3, 0));
};

export const startOfYear = (input = new Date()) =>
  new Date(input.getFullYear(), 0, 1);
export const endOfYear = (input = new Date()) =>
  endOfDay(new Date(input.getFullYear(), 11, 31));

export const toInputDate = (input) => {
  if (!input) {
    return "";
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const buildRangeFromPreset = (presetId) => {
  const now = new Date();
  switch (presetId) {
    case "today":
      return {
        from: toInputDate(startOfDay(now)),
        to: toInputDate(endOfDay(now)),
        preset: presetId,
      };
    case "thisWeek":
      return {
        from: toInputDate(startOfWeek(now)),
        to: toInputDate(endOfWeek(now)),
        preset: presetId,
      };
    case "nextWeek": {
      const nextWeekStart = addDays(startOfWeek(now), 7);
      return {
        from: toInputDate(nextWeekStart),
        to: toInputDate(endOfWeek(nextWeekStart)),
        preset: presetId,
      };
    }
    case "nextMonth": {
      const monthStart = startOfMonth(now);
      const nextMonthStart = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        1,
      );
      return {
        from: toInputDate(nextMonthStart),
        to: toInputDate(endOfMonth(nextMonthStart)),
        preset: presetId,
      };
    }
    case "thisQuarter":
      return {
        from: toInputDate(startOfQuarter(now)),
        to: toInputDate(endOfQuarter(now)),
        preset: presetId,
      };
    case "thisYear":
      return {
        from: toInputDate(startOfYear(now)),
        to: toInputDate(endOfYear(now)),
        preset: presetId,
      };
    case "thisMonth":
    default:
      return {
        from: toInputDate(startOfMonth(now)),
        to: toInputDate(endOfMonth(now)),
        preset: "thisMonth",
      };
  }
};

export const parseApiDate = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const normalized = value.includes("T") ? value : `${value}T00:00:00`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    const year = value.year ?? value.Year;
    const month = value.month ?? value.Month;
    const day = value.day ?? value.Day;
    if (year && month && day) {
      const parsed = new Date(year, month - 1, day);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
};

export const formatDateVN = (value) => {
  const date = value instanceof Date ? value : parseApiDate(value);
  return date ? date.toLocaleDateString("vi-VN") : "--";
};

export const unwrapApiData = (result) => {
  if (result?.success === false) {
    throw new Error(result.message || "Không thể tải dữ liệu.");
  }
  return result?.data ?? result ?? [];
};

export const buildDemoRosterForClass = (classId, desiredSize) => {
  const size = Math.max(12, Math.min(Number(desiredSize) || 20, 34));
  return Array.from({ length: size }, (_, index) => {
    const seed = `${classId}-${index}`;
    const nameIndex =
      (hashSeed(seed) + index * 7) % Math.max(1, DEMO_STUDENT_NAMES.length);
    const fullName = DEMO_STUDENT_NAMES[nameIndex] || `Học viên ${index + 1}`;
    return {
      studentId: `demo-${classId}-${index}`,
      fullName,
      email: `student.${hashSeed(seed) % 9999}@demo.edu.vn`,
    };
  });
};

export const buildTeacherDemoEmail = (teacherName = "") => {
  const parts = String(teacherName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "teacher@edu.vn";
  }
  const firstName = parts[0].toLowerCase();
  const lastName = parts[parts.length - 1].toLowerCase();
  return `${lastName}.${firstName}@edu.vn`;
};

export const normalizeClass = (cls, index) => {
  const courseLabel =
    cls.courses?.map((course) => course.name).join(", ") ||
    DEMO_COURSE_NAMES[(index ?? 0) % DEMO_COURSE_NAMES.length];
  const teacherLabel =
    cls.teachers?.map((teacher) => teacher.name).join(", ") || "Chưa phân công";
  return {
    ...cls,
    courseLabel,
    teacherLabel,
    currentSize: cls.currentSize ?? seededNumber(`${cls.id}-size`, 14, 28, 0),
  };
};

export const getScoreBucket = (score) => {
  for (let index = SCORE_BUCKETS.length - 1; index >= 0; index -= 1) {
    const bucket = SCORE_BUCKETS[index];
    const inRange = bucket.includeMax
      ? score >= bucket.min && score <= bucket.max
      : score >= bucket.min && score < bucket.max;
    if (inRange) {
      return {
        label: bucket.label,
        color: bucket.color,
        rangeLabel: bucket.rangeLabel,
        key: bucket.key,
      };
    }
  }
  return {
    label: "Chưa phân loại",
    color: "#868e96",
    rangeLabel: "Không xác định",
    key: "unknown",
  };
};

export const summarizeScoreBuckets = (scoredRows, scoreKey = "score") => {
  const total = scoredRows?.length || 0;
  return SCORE_BUCKETS.map((bucket) => {
    const count = (scoredRows || []).filter((row) => {
      const value = Number(row[scoreKey]);
      return bucket.includeMax
        ? value >= bucket.min && value <= bucket.max
        : value >= bucket.min && value < bucket.max;
    }).length;
    return {
      ...bucket,
      count,
      percent: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    };
  });
};

export const doesOverlapRange = (startDate, endDate, rangeStart, rangeEnd) => {
  const start = parseApiDate(startDate);
  const end = parseApiDate(endDate);
  if (!rangeStart || !rangeEnd) return true;
  const effectiveStart = start ? startOfDay(start) : startOfDay(rangeStart);
  const effectiveEnd = end ? endOfDay(end) : endOfDay(rangeEnd);
  return (
    effectiveStart <= endOfDay(rangeEnd) &&
    effectiveEnd >= startOfDay(rangeStart)
  );
};

export const getClassStatus = (startDate, endDate, now = new Date()) => {
  const start = parseApiDate(startDate);
  const end = parseApiDate(endDate);
  if (!start && !end) {
    return {
      key: "unscheduled",
      label: "Chưa có lịch",
      badgeClass: "bg-light text-muted border",
    };
  }
  const today = startOfDay(now);
  if (start && today < startOfDay(start)) {
    return {
      key: "upcoming",
      label: "Sắp bắt đầu",
      badgeClass:
        "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
    };
  }
  if (end && today > endOfDay(end)) {
    return {
      key: "ended",
      label: "Đã kết thúc",
      badgeClass: "bg-light text-secondary border",
    };
  }
  return {
    key: "ongoing",
    label: "Đang học",
    badgeClass: "bg-success-subtle text-success border border-success-subtle",
  };
};

export const wrapChartAxisLabel = (value, maxLineLength = 10) => {
  const label = String(value ?? "").trim();
  if (!label || label.length <= maxLineLength || !label.includes(" ")) {
    return label;
  }
  const words = label.split(/\s+/);
  const lines = [];
  let currentLine = words[0] || "";
  for (let index = 1; index < words.length; index += 1) {
    const nextWord = words[index];
    if (`${currentLine} ${nextWord}`.length <= maxLineLength) {
      currentLine = `${currentLine} ${nextWord}`;
    } else {
      lines.push(currentLine);
      currentLine = nextWord;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

export const buildGroupedBarOptions = (leftLabel, rightLabel, options = {}) => {
  const { percentMax = 100, leftMax, wrapLabels = true } = options;
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label(context) {
            const suffix = context.dataset.yAxisID === "y1" ? "%" : "";
            return `${context.dataset.label}: ${context.parsed.y}${suffix}`;
          },
        },
      },
    },
    scales: {
      x: {
        offset: true,
        grid: {
          display: false,
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          padding: 12,
          font: {
            size: 11,
            lineHeight: 1.15,
          },
          callback(value) {
            return wrapLabels
              ? wrapChartAxisLabel(this.getLabelForValue(value))
              : this.getLabelForValue(value);
          },
        },
      },
      y: {
        beginAtZero: true,
        max: leftMax,
        title: {
          display: true,
          text: leftLabel,
        },
      },
      y1: {
        beginAtZero: true,
        position: "right",
        max: percentMax,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: rightLabel,
        },
      },
    },
  };
};

export const buildFocusedGroupedBarOptions = (
  leftLabel,
  rightLabel,
  focusIndex,
  percentMax = 100,
) => {
  const base = buildGroupedBarOptions(leftLabel, rightLabel, { percentMax });
  return {
    ...base,
    scales: {
      ...base.scales,
      x: {
        ...base.scales.x,
        ticks: {
          ...base.scales.x.ticks,
          callback(value, index) {
            if (typeof focusIndex === "number" && index !== focusIndex) {
              return "";
            }
            return wrapChartAxisLabel(this.getLabelForValue(value));
          },
        },
      },
    },
  };
};

export const buildContinuousBins = (values, binCount, minValue, maxValue) => {
  const safeValues = values.filter((value) => Number.isFinite(value));
  const count = Math.max(1, binCount);
  const rangeSize = maxValue - minValue || 1;
  const step = rangeSize / count;
  const buckets = Array.from({ length: count }, (_, index) => {
    const start = minValue + step * index;
    const end = index === count - 1 ? maxValue : minValue + step * (index + 1);
    return { start, end, count: 0 };
  });

  safeValues.forEach((value) => {
    const ratio = Math.min(
      Math.max((value - minValue) / rangeSize, 0),
      0.999999,
    );
    const bucketIndex = Math.min(count - 1, Math.floor(ratio * count));
    buckets[bucketIndex].count += 1;
  });

  const total = safeValues.length || 1;
  return buckets.map((bucket, index) => {
    const label = `${bucket.start.toFixed(1)}-${(index === buckets.length - 1 ? bucket.end : bucket.end - 0.01).toFixed(1)}`;
    return {
      label,
      count: bucket.count,
      percent: Number(((bucket.count / total) * 100).toFixed(1)),
    };
  });
};

export const buildIntegerBins = (values, binCount) => {
  const safeValues = values.filter(
    (value) => Number.isFinite(value) && value >= 0,
  );
  const maxValue = Math.max(...safeValues, 0);
  const count = Math.max(1, binCount);
  const step = Math.max(1, Math.ceil((maxValue + 1) / count));
  const buckets = Array.from({ length: count }, (_, index) => {
    const start = index * step;
    const end =
      index === count - 1 ? Math.max(maxValue, start) : start + step - 1;
    return { start, end, count: 0 };
  });

  safeValues.forEach((value) => {
    const bucketIndex = Math.min(count - 1, Math.floor(value / step));
    buckets[bucketIndex].count += 1;
  });

  const total = safeValues.length || 1;
  return buckets.map((bucket) => ({
    label: `${bucket.start}-${bucket.end} buổi`,
    count: bucket.count,
    percent: Number(((bucket.count / total) * 100).toFixed(1)),
  }));
};

export const SCHEDULE_SLOTS = {
  1: { start: "07:00", end: "07:50" },
  2: { start: "07:55", end: "08:45" },
  3: { start: "08:50", end: "09:40" },
  4: { start: "09:50", end: "10:40" },
  5: { start: "10:45", end: "11:35" },
  6: { start: "12:30", end: "13:20" },
  7: { start: "13:25", end: "14:15" },
  8: { start: "14:20", end: "15:10" },
  9: { start: "15:20", end: "16:10" },
  10: { start: "16:15", end: "17:05" },
  11: { start: "17:30", end: "18:20" },
  12: { start: "18:25", end: "19:15" },
  13: { start: "19:20", end: "20:10" },
  14: { start: "20:15", end: "21:05" },
};

export const parseClock = (day, hhmm) => {
  if (!hhmm) return null;
  const [hh, mm] = String(hhmm)
    .split(":")
    .map((val) => Number(val));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const date = new Date(day);
  date.setHours(hh, mm, 0, 0);
  return date;
};

export const computeSessionStatus = ({ startAt, endAt }, now = new Date()) => {
  if (!startAt || !endAt)
    return {
      key: "unknown",
      label: "Chờ dạy",
      badgeClass: "bg-info-subtle text-info border border-info-subtle",
    };

  const minutesToStart = (startAt.getTime() - now.getTime()) / 60000;
  if (minutesToStart > 15) {
    return {
      key: "queued",
      label: "Chờ dạy",
      badgeClass: "bg-info-subtle text-info border border-info-subtle",
    };
  }
  if (minutesToStart > 0) {
    return {
      key: "soon",
      label: "Sắp bắt đầu",
      badgeClass:
        "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
    };
  }
  if (now <= endAt) {
    return {
      key: "ongoing",
      label: "Đang học",
      badgeClass: "bg-success-subtle text-success border border-success-subtle",
    };
  }
  return {
    key: "done",
    label: "Đã kết thúc",
    badgeClass: "bg-light text-secondary border",
  };
};

export const buildDemoRosterForClassV2 = (classId, expectedSize) => {
  const count = Math.max(8, Math.min(28, expectedSize || 18));
  const seedBase = hashSeed(classId);
  const joinedAt = toInputDate(startOfWeek(new Date()));

  return Array.from({ length: count }, (_, index) => {
    const nameIndex = (seedBase + index) % DEMO_STUDENT_NAMES.length;
    const fullName = DEMO_STUDENT_NAMES[nameIndex];
    const studentId = `demo-student-${seedBase}-${index}`;
    const userId = `demo-user-${seedBase}-${index}`;
    return {
      studentId,
      userId,
      fullName,
      email: `hs${String(nameIndex + 1).padStart(2, "0")}@demo.edu.vn`,
      joinedAt,
      active: true,
    };
  });
};

export const buildDemoUniverse = (now = new Date()) => {
  const courses = DEMO_COURSE_NAMES.map((name, index) => ({
    id: `demo-course-${index}`,
    name,
    description: "Dữ liệu mẫu trực quan",
    basePrice: 0,
    active: true,
  }));

  const teachers = DEMO_TEACHER_NAMES.map((name, index) => ({
    id: `demo-teacher-${index}`,
    name,
  }));

  const baseDate = startOfDay(now);
  const classTemplates = [
    {
      offsetStart: -15,
      offsetEnd: 45,
      courseIndex: 0,
      teacherIndex: 0,
      name: "IELTS-55-01",
    },
    {
      offsetStart: -3,
      offsetEnd: 28,
      courseIndex: 1,
      teacherIndex: 1,
      name: "IELTS-65-02",
    },
    {
      offsetStart: 3,
      offsetEnd: 60,
      courseIndex: 2,
      teacherIndex: 2,
      name: "TOEIC-450-A",
    },
    {
      offsetStart: 7,
      offsetEnd: 75,
      courseIndex: 3,
      teacherIndex: 3,
      name: "TOEIC-650-B",
    },
    {
      offsetStart: -40,
      offsetEnd: -5,
      courseIndex: 4,
      teacherIndex: 4,
      name: "A2-K12-MonWed",
    },
    {
      offsetStart: -20,
      offsetEnd: 10,
      courseIndex: 5,
      teacherIndex: 5,
      name: "Speaking-Club-03",
    },
    {
      offsetStart: 14,
      offsetEnd: 90,
      courseIndex: 0,
      teacherIndex: 1,
      name: "IELTS-55-04",
    },
    {
      offsetStart: -8,
      offsetEnd: 20,
      courseIndex: 4,
      teacherIndex: 2,
      name: "A2-Weekend-01",
    },
    {
      offsetStart: -12,
      offsetEnd: 35,
      courseIndex: 1,
      teacherIndex: 6,
      name: "IELTS-Foundation-02",
    },
    {
      offsetStart: 5,
      offsetEnd: 55,
      courseIndex: 2,
      teacherIndex: 7,
      name: "TOEIC-Bridge-01",
    },
    {
      offsetStart: -6,
      offsetEnd: 42,
      courseIndex: 3,
      teacherIndex: 8,
      name: "TOEIC-Intensive-03",
    },
    {
      offsetStart: 10,
      offsetEnd: 70,
      courseIndex: 5,
      teacherIndex: 9,
      name: "Speaking-Pro-02",
    },
  ];

  const classes = classTemplates.map((item, index) => {
    const id = `demo-class-${index}`;
    const currentSize = Math.max(
      10,
      Math.round(seededNumber(`${id}-size`, 12, 28, 0)),
    );
    const capacity = Math.max(
      currentSize + 2,
      Math.round(seededNumber(`${id}-cap`, 20, 32, 0)),
    );
    return {
      id,
      name: item.name,
      startDate: toInputDate(addDays(baseDate, item.offsetStart)),
      endDate: toInputDate(addDays(baseDate, item.offsetEnd)),
      currentSize,
      capacity,
      active: true,
      courses: [courses[item.courseIndex]],
      teachers: [teachers[item.teacherIndex]],
    };
  });

  const studentsByClass = {};
  classes.forEach((cls) => {
    studentsByClass[cls.id] = buildDemoRosterForClassV2(
      cls.id,
      cls.currentSize,
    );
  });

  const classSizes = classes.map((cls) => ({
    className: cls.name,
    studentCount: cls.currentSize,
    capacity: cls.capacity,
  }));

  return {
    courses,
    classes,
    studentsByClass,
    report: {
      totalStudents: 1286,
      totalTeachers: teachers.length,
      totalClasses: classes.length,
      totalCourses: courses.length,
      attendanceRate: {
        present: 9240,
        late: 820,
        absent: 420,
        excused: 180,
        total: 10660,
      },
      scoreDistribution: {
        under5: 42,
        from5To7: 318,
        from7To85: 592,
        above85: 334,
        total: 1286,
        averageScore: 7.8,
      },
      classSizes,
    },
  };
};

export const buildDemoTodaySchedule = (classes, today = new Date()) => {
  const rooms = ["P205", "P401", "P201", "P304", "P101", "P402"];
  const slots = [
    { start: 7, end: 8 },
    { start: 11, end: 12 },
    { start: 1, end: 2 },
    { start: 3, end: 4 },
  ];

  return classes.slice(0, 6).map((cls, index) => {
    const slot = slots[index % slots.length];
    const startTime = SCHEDULE_SLOTS[slot.start]?.start;
    const endTime = SCHEDULE_SLOTS[slot.end]?.end;
    return {
      id: `demo-session-${cls.id}-${index}`,
      className: cls.name,
      courseName: cls.courses?.[0]?.name || "Chưa gán khóa",
      teacherName: cls.teachers?.[0]?.name || "Chưa phân công",
      room: rooms[index % rooms.length],
      startAt: parseClock(today, startTime),
      endAt: parseClock(today, endTime),
      timeLabel: `${startTime || "--:--"} - ${endTime || "--:--"}`,
    };
  });
};
