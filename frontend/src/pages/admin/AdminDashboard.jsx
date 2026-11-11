import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import { useAuth } from "../../context/AuthContext";
import NotificationPanel from "../../components/NotificationPanel";
import BaseApi from "../../api/BaseApi";
import { p0Api } from "../../api/p0Api";
import "../../styles/notification-badge.css";
import {
  DATE_PRESETS,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  toInputDate,
  buildRangeFromPreset,
  parseApiDate,
  formatDateVN,
  formatPercent,
  unwrapApiData,
  SCHEDULE_SLOTS,
  parseClock,
  computeSessionStatus,
  getClassStatus,
  doesOverlapRange,
  wrapChartAxisLabel,
  buildGroupedBarOptions,
  buildFocusedGroupedBarOptions,
  buildContinuousBins,
  buildIntegerBins,
} from "../../utils/statsUtils";
import { SourceBadge } from "../../components/SharedComponents";
import { onNewNotification } from '../../components/RealtimeNotifications';

ChartJS.register(...registerables);

const TAB_ITEMS = [
  { id: "teachers", label: "Thống kê giảng viên", icon: "bi-mortarboard-fill" },
  { id: "classes", label: "Thống kê lớp học", icon: "bi-bar-chart-line-fill" },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("teachers");
  const [expandedTeacherId, setExpandedTeacherId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [coreLoading, setCoreLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [dateRange, setDateRange] = useState(buildRangeFromPreset("thisMonth"));
  const [selectedScorePoint, setSelectedScorePoint] = useState(2);
  const [selectedAbsencePoint, setSelectedAbsencePoint] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [classesData, setClassesData] = useState([]);
  const [coursesData, setCoursesData] = useState([]);
  const [studentsByClass, setStudentsByClass] = useState({});
  const [studentPerformanceData, setStudentPerformanceData] = useState(null);
  const [teacherDashboardData, setTeacherDashboardData] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [todayScheduleLoading, setTodayScheduleLoading] = useState(false);
  const [dataSources, setDataSources] = useState({
    overview: "real",
    schedule: "real",
    attendance: "real",
    studentPerformance: "real",
    classAnalytics: "real",
  });

  // Thong bao moi (realtime) -> cap nhat so chua doc tren chuong ngay.
  useEffect(() => onNewNotification(() => fetchUnreadCount()), []);

  const fetchUnreadCount = async () => {
    try {
      const res = await BaseApi.get("Notification/unread-count");
      const resData = res?.data ?? res;
      let count = 0;

      if (typeof resData === "number") {
        count = resData;
      } else if (typeof resData?.data === "number") {
        count = resData.data;
      } else if (typeof resData?.value === "number") {
        count = resData.value;
      }

      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  };

  // Helper inline: ẩn toàn bộ tick labels ở trục X của biểu đồ (user yêu cầu bỏ chữ trục X phần thống kê học sinh)
  // Usage: options={hideXAxis(buildFocusedGroupedBarOptions(a,b,c))}
  const hideXAxis = (baseOpts = {}) => ({
    ...baseOpts,
    scales: {
      ...(baseOpts.scales || {}),
      x: {
        ...((baseOpts.scales || {}).x || {}),
        ticks: {
          ...(((baseOpts.scales || {}).x || {}).ticks || {}),
          display: false,
        },
      },
    },
  });

  const ENGLISH_CLASS_NAMES = {
    "LH_ENSEED_01": "Basic English Communication A1.1",
    "LH_ENSEED_02": "Basic English Communication A1.2",
    "LH_ENSEED_03": "Elementary English A2.1",
    "LH_ENSEED_04": "Pre-Intermediate English A2.2",
    "LH_ENSEED_05": "Intermediate English B1.1",
    "LH_ENSEED_06": "Upper-Intermediate English B1.2",
    "LH_ENSEED_07": "IELTS 4-Skills Foundation 5.5",
    "LH_ENSEED_08": "IELTS 4-Skills Target 6.0",
    "LH_ENSEED_09": "IELTS 4-Skills Advanced 6.5",
    "LH_ENSEED_10": "IELTS 4-Skills Master 7.0",
    "LH_ENSEED_11": "IELTS Speaking Intensive 6.0",
    "LH_ENSEED_12": "IELTS Speaking Intensive 7.0",
    "LH_ENSEED_13": "TOEIC Listening & Reading 450+",
    "LH_ENSEED_14": "TOEIC Listening & Reading 550+",
    "LH_ENSEED_15": "TOEIC Listening & Reading 700+",
    "LH_ENSEED_16": "TOEIC Speaking & Writing 120+",
    "LH_ENSEED_17": "TOEIC Speaking & Writing 150+",
    "LH_ENSEED_18": "Business English Starter",
    "LH_ENSEED_19": "Business English Pre-Intermediate",
    "LH_ENSEED_20": "Business English Intermediate",
    "LH_ENSEED_21": "English for Kids Starter 1",
    "LH_ENSEED_22": "English for Kids Starter 2",
    "LH_ENSEED_23": "Active Listening Practice Basic",
    "LH_ENSEED_24": "Active Listening Practice Advanced",
  };

  const ENGLISH_COURSE_NAMES = {
    "KH_ENSEED_01": "Basic English Communication",
    "KH_ENSEED_02": "Advanced English Communication",
    "KH_ENSEED_03": "IELTS 4 Skills Preparation",
    "KH_ENSEED_04": "IELTS Speaking Intensive",
    "KH_ENSEED_05": "TOEIC Listening & Reading",
    "KH_ENSEED_06": "TOEIC Speaking & Writing",
    "KH_ENSEED_07": "Business English Professional",
    "KH_ENSEED_08": "English for Kids",
    "KH_ENSEED_09": "Active Listening Practice",
    "KH_ENSEED_10": "Cambridge B1-B2 Preliminary (PET/FCE)",
  };

  const resolveClassDisplayName = (name) => {
    if (!name) return name;
    const baseKey = name.startsWith("LH_ENSEED_")
      ? name.split("_").slice(0, 3).join("_")
      : null;
    if (baseKey && ENGLISH_CLASS_NAMES[baseKey]) return ENGLISH_CLASS_NAMES[baseKey];
    return name;
  };

  const resolveCourseDisplayNames = (courses) => {
    if (!courses || !Array.isArray(courses) || courses.length === 0) return "Chưa gán khóa học";
    return courses
      .map((course) => {
        if (course?.code && ENGLISH_COURSE_NAMES[course.code]) return ENGLISH_COURSE_NAMES[course.code];
        if (course?.name && course.name.startsWith("KH_ENSEED_")) {
          const key = course.name.split(" ").shift();
          if (ENGLISH_COURSE_NAMES[key]) return ENGLISH_COURSE_NAMES[key];
        }
        return course?.name || "Chưa gán khóa học";
      })
      .join(", ");
  };

  const handleNotificationPanelOpen = (isOpen) => {
    setShowNotifications(isOpen);
    if (!isOpen) {
      fetchUnreadCount();
    }
  };

  const loadCoreDashboard = async ({ silent = false } = {}) => {
    if (!silent) {
      setCoreLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const [reportResult, classesResult, coursesResult, studentPerfResult, teacherDashResult] =
        await Promise.allSettled([
          p0Api.reports.adminOverview(),
          p0Api.classes.list(),
          p0Api.courses.list(),
          p0Api.reports.adminStudentPerformance(),
          p0Api.reports.adminTeacherDashboard(),
        ]);

      const nextWarnings = [];
      const nextSources = {
        overview: reportResult.status === "fulfilled" ? "real" : "error",
        schedule: dataSources.schedule,
        attendance: dataSources.attendance,
        studentPerformance:
          studentPerfResult.status === "fulfilled" ? "real" : "error",
        teacherDashboard:
          teacherDashResult.status === "fulfilled" ? "real" : "error",
        classAnalytics:
          studentPerfResult.status === "fulfilled" ? "real" : "error",
      };

      const nextReport =
        reportResult.status === "fulfilled" ? reportResult.value : null;
      const nextClasses =
        classesResult.status === "fulfilled" ? classesResult.value || [] : [];
      const nextCourses =
        coursesResult.status === "fulfilled" ? coursesResult.value || [] : [];
      const nextStudentPerf =
        studentPerfResult.status === "fulfilled" ? studentPerfResult.value : null;
      const nextTeacherDash =
        teacherDashResult.status === "fulfilled" ? teacherDashResult.value : null;

      if (reportResult.status !== "fulfilled") {
        nextWarnings.push(
          "Khối tổng quan đang dùng dữ liệu lớp học thực tế để bù cho báo cáo tổng hợp chưa tải được.",
        );
      }

      if (classesResult.status !== "fulfilled") {
        nextWarnings.push(
          "Không tải được danh sách lớp học, một số bảng chi tiết có thể rỗng.",
        );
      }

      if (studentPerfResult.status !== "fulfilled") {
        nextWarnings.push(
          "Không tải được thống kê điểm và chuyên cần theo học sinh, biểu đồ của từng lớp sẽ để trống.",
        );
      }

      if (teacherDashResult.status !== "fulfilled") {
        nextWarnings.push(
          "Không tải được thống kê giảng viên, danh sách giảng viên đang tổng hợp từ danh sách lớp học.",
        );
      }

      // Danh sách học viên thật của từng lớp; lớp chưa có học viên thì để rỗng.
      const studentEntries = {};
      nextClasses.forEach((cls) => {
        studentEntries[cls.id] = Array.isArray(cls.students)
          ? cls.students.map((st) => ({
              id: st.studentId,
              studentId: st.studentId,
              userId: st.userId,
              name: st.fullName,
              fullName: st.fullName,
              email: st.email,
              joinedAt: st.joinedAt,
              active: st.active,
            }))
          : [];
      });

      setReportData(nextReport);
      setClassesData(nextClasses);
      setCoursesData(nextCourses);
      setStudentsByClass(studentEntries);
      setStudentPerformanceData(nextStudentPerf);
      setTeacherDashboardData(nextTeacherDash);
      setWarnings(nextWarnings);
      setDataSources((current) => ({
        ...current,
        ...nextSources,
      }));
    } catch (loadError) {
      setError(loadError.message || "Không thể tải dashboard admin.");
    } finally {
      setCoreLoading(false);
      setRefreshing(false);
    }
  };

  const loadAttendance = async () => {
    if (!dateRange.from || !dateRange.to) {
      setAttendanceRows([]);
      return;
    }

    setAttendanceLoading(true);
    try {
      const result = await BaseApi.get(
        `admin/attendance?fromDate=${dateRange.from}&toDate=${dateRange.to}`,
      );
      const rows = unwrapApiData(result);
      const normalizedRows = Array.isArray(rows)
        ? rows.map((row) => ({
            id: row.id,
            classCode: row.classCode,
            courseName: row.courseName,
            teacher: row.teacher,
            date: row.date,
            time: row.time,
            present: row.present,
            total: row.total,
            status: row.status,
          }))
        : [];

      setAttendanceRows(normalizedRows.slice(0, 10));
      setDataSources((current) => ({
        ...current,
        attendance: "real",
      }));
    } catch {
      setAttendanceRows([]);
      setDataSources((current) => ({
        ...current,
        attendance: "error",
      }));
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadTodaySchedule = async () => {
    setTodayScheduleLoading(true);
    try {
      const now = new Date();
      const weekStart = startOfWeek(now).toISOString();
      const result = await BaseApi.get(
        `Schedule/admin-board?weekStart=${encodeURIComponent(weekStart)}`,
      );
      const schedules = result?.schedules ?? result?.Schedules ?? [];

      const classLookup = new Map(
        classesData.map((item) => [String(item.id), item]),
      );
      const todayKey = toInputDate(now);
      const rows = (Array.isArray(schedules) ? schedules : [])
        .filter(
          (item) =>
            toInputDate(parseApiDate(item.ngayHoc ?? item.NgayHoc)) ===
            todayKey,
        )
        .map((item) => {
          const classId = String(item.maLopHoc ?? item.MaLopHoc ?? "");
          const classRow = classLookup.get(classId);
          const courseName =
            classRow?.courses?.map((course) => course.name).join(", ") ||
            item.courseName ||
            item.Subject ||
            "Chưa gán khóa";

          const slotStart = Number(item.slotId ?? item.SlotId);
          const slotEnd = Number(item.slotEndId ?? item.SlotEndId);
          const startLabel = SCHEDULE_SLOTS[slotStart]?.start;
          const endLabel =
            SCHEDULE_SLOTS[slotEnd]?.end ?? SCHEDULE_SLOTS[slotStart]?.end;
          const startAt = parseClock(now, startLabel);
          const endAt = parseClock(now, endLabel);
          const status = computeSessionStatus({ startAt, endAt }, now);

          return {
            id:
              item.id ??
              item.Id ??
              item.maBuoiHoc ??
              item.MaBuoiHoc ??
              `${classId}-${slotStart}`,
            className:
              item.classCode ?? item.className ?? classRow?.name ?? "Lớp học",
            courseName,
            teacherName:
              item.teacher ??
              item.Teacher ??
              classRow?.teachers?.[0]?.name ??
              "Chưa phân công",
            room: item.room ?? item.Room ?? "Chưa gán phòng",
            startAt,
            endAt,
            timeLabel:
              startLabel && endLabel ? `${startLabel} - ${endLabel}` : "--:--",
            status,
          };
        })
        .sort(
          (left, right) =>
            (left.startAt?.getTime() || 0) - (right.startAt?.getTime() || 0),
        );

      setTodaySchedule(rows);
      setDataSources((current) => ({ ...current, schedule: "real" }));
    } catch {
      setTodaySchedule([]);
      setDataSources((current) => ({ ...current, schedule: "error" }));
    } finally {
      setTodayScheduleLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    loadCoreDashboard();
    loadTodaySchedule();
  }, []);

  useEffect(() => {
    if (classesData.length > 0) {
      loadTodaySchedule();
    }
  }, [classesData]);

  useEffect(() => {
    loadAttendance();
  }, [dateRange.from, dateRange.to, classesData]);

  const rangeStart = useMemo(
    () => parseApiDate(dateRange.from),
    [dateRange.from],
  );
  const rangeEnd = useMemo(() => parseApiDate(dateRange.to), [dateRange.to]);
  const today = useMemo(() => new Date(), []);

  const classRows = useMemo(
    () =>
      classesData.map((item) => {
        const status = getClassStatus(item.startDate, item.endDate, today);
        const courseLabel =
          resolveCourseDisplayNames(item.courses);
        const teacherLabel =
          item.teachers?.map((teacher) => teacher.name).join(", ") ||
          "Chưa phân công";
        const displayName = resolveClassDisplayName(item.name);
        return {
          ...item,
          courseLabel,
          teacherLabel,
          status,
          displayName,
          startDateParsed: parseApiDate(item.startDate),
          endDateParsed: parseApiDate(item.endDate),
        };
      }),
    [classesData, today],
  );

  const filteredClasses = useMemo(
    () =>
      classRows
        .filter((item) =>
          doesOverlapRange(
            item.startDateParsed,
            item.endDateParsed,
            rangeStart,
            rangeEnd,
          ),
        )
        .sort((left, right) => {
          const leftTime = left.startDateParsed?.getTime() || 0;
          const rightTime = right.startDateParsed?.getTime() || 0;
          return leftTime - rightTime;
        }),
    [classRows, rangeStart, rangeEnd],
  );

  const overviewStats = useMemo(() => {
    const uniqueStudents = new Set();
    const uniqueTeachers = new Set();
    const uniqueCourses = new Set();

    classRows.forEach((cls) => {
      (studentsByClass[cls.id] || []).forEach((student) => {
        uniqueStudents.add(student.studentId);
      });
      (cls.teachers || []).forEach((teacher) => uniqueTeachers.add(teacher.id));
      (cls.courses || []).forEach((course) => uniqueCourses.add(course.id));
    });

    const upcomingInRange = classRows.filter((cls) => {
      const start = cls.startDateParsed;
      return (
        cls.status.key === "upcoming" &&
        start &&
        (!rangeStart || startOfDay(start) >= startOfDay(rangeStart)) &&
        (!rangeEnd || startOfDay(start) <= endOfDay(rangeEnd))
      );
    }).length;

    const ongoingInRange = filteredClasses.filter(
      (cls) => cls.status.key === "ongoing",
    ).length;
    const endedInRange = filteredClasses.filter(
      (cls) => cls.status.key === "ended",
    ).length;

    return {
      totalStudents: reportData?.totalStudents ?? uniqueStudents.size,
      totalTeachers: reportData?.totalTeachers ?? uniqueTeachers.size,
      totalClasses: reportData?.totalClasses ?? classRows.length,
      totalCourses:
        reportData?.totalCourses ?? coursesData.length ?? uniqueCourses.size,
      ongoingInRange,
      upcomingInRange,
      endedInRange,
    };
  }, [
    classRows,
    coursesData.length,
    filteredClasses,
    rangeEnd,
    rangeStart,
    reportData,
    studentsByClass,
  ]);

  const overviewCharts = useMemo(() => {
    const studentParticipationMap = new Map();

    classRows.forEach((cls) => {
      (studentsByClass[cls.id] || []).forEach((student) => {
        const studentId = student.studentId ?? student.id;
        if (studentId == null) return;
        const currentCount = studentParticipationMap.get(studentId) || 0;
        studentParticipationMap.set(studentId, currentCount + 1);
      });
    });

    const totalTrackedStudents = studentParticipationMap.size;
    const classSizeBuckets = [
      { label: "Tham gia 1 lớp", count: 0, color: "#3b82f6" },
      { label: "Tham gia 2-3 lớp", count: 0, color: "#65d26e" },
      { label: "Tham gia >3 lớp", count: 0, color: "#f2c94c" },
    ];

    Array.from(studentParticipationMap.values()).forEach((classCount) => {
      if (classCount <= 1) {
        classSizeBuckets[0].count += 1;
      } else if (classCount <= 3) {
        classSizeBuckets[1].count += 1;
      } else {
        classSizeBuckets[2].count += 1;
      }
    });

    const classSizeSummary = classSizeBuckets.map((item) => ({
      ...item,
      percent: totalTrackedStudents
        ? Number(((item.count / totalTrackedStudents) * 100).toFixed(1))
        : 0,
    }));

    const attendanceReal = reportData?.attendanceRate || {};
    const attendanceBars = [
      { label: "Có mặt", count: Number(attendanceReal.present) || 0, color: "#42c6b8" },
      { label: "Đi muộn", count: Number(attendanceReal.late) || 0, color: "#ffb347" },
      { label: "Vắng mặt", count: Number(attendanceReal.absent) || 0, color: "#ef476f" },
      { label: "Vắng có phép", count: Number(attendanceReal.excused) || 0, color: "#9b5de5" },
    ];
    const attendanceTotal = attendanceBars.reduce(
      (sum, item) => sum + item.count,
      0,
    );
    const attendancePercent = (count) =>
      attendanceTotal > 0
        ? Number(((count / attendanceTotal) * 100).toFixed(1))
        : 0;

    const classRangeBars = [
      { label: "Lớp sĩ số <10", count: 0, color: "#4ea8de" },
      { label: "Lớp sĩ số 10-20", count: 0, color: "#44c06a" },
      { label: "Lớp sĩ số >20", count: 0, color: "#f0b429" },
    ];

    filteredClasses.forEach((cls) => {
      const currentSize = Number(cls.currentSize) || 0;
      if (currentSize < 10) {
        classRangeBars[0].count += 1;
      } else if (currentSize <= 20) {
        classRangeBars[1].count += 1;
      } else {
        classRangeBars[2].count += 1;
      }
    });

    const classRangeTotal = classRangeBars.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    return {
      classSize: {
        data: {
          labels: classSizeSummary.map((item) => item.label),
          datasets: [
            {
              label: "Số học sinh",
              data: classSizeSummary.map((item) => item.count),
              backgroundColor: classSizeSummary.map((item) => item.color),
              borderRadius: 12,
              maxBarThickness: 72,
              categoryPercentage: 0.62,
              barPercentage: 0.82,
              yAxisID: "y",
            },
            {
              label: "Tỷ lệ (%)",
              data: classSizeSummary.map((item) => item.percent),
              backgroundColor: classSizeSummary.map(
                (item) => `${item.color}26`,
              ),
              borderColor: classSizeSummary.map((item) => item.color),
              borderWidth: 2,
              borderRadius: 12,
              maxBarThickness: 72,
              categoryPercentage: 0.62,
              barPercentage: 0.82,
              yAxisID: "y1",
            },
          ],
        },
        summary: classSizeSummary,
        totalTrackedStudents,
        totalStudentsInSystem:
          reportData?.totalStudents ?? totalTrackedStudents,
        hasData: totalTrackedStudents > 0,
      },
      attendance: {
        data: {
          labels: attendanceBars.map((item) => item.label),
          datasets: [
            {
              label: "Số lượt (số thô)",
              data: attendanceBars.map((item) => item.count),
              backgroundColor: attendanceBars.map((item) => item.color),
              borderRadius: 12,
              yAxisID: "y",
            },
            {
              label: "Tỷ lệ (%) trên tổng điểm danh",
              data: attendanceBars.map((item) => attendancePercent(item.count)),
              backgroundColor: attendanceBars.map((item) => `${item.color}22`),
              borderColor: attendanceBars.map((item) => item.color),
              borderWidth: 2,
              borderRadius: 12,
              yAxisID: "y1",
            },
          ],
        },
        summary: attendanceBars.map((item) => ({
          label: item.label,
          count: item.count,
          percent: attendancePercent(item.count),
        })),
        hasData: attendanceTotal > 0,
      },
      classRange: {
        data: {
          labels: classRangeBars.map((item) => item.label),
          datasets: [
            {
              label: "Số lớp",
              data: classRangeBars.map((item) => item.count),
              backgroundColor: classRangeBars.map((item) => item.color),
              borderRadius: 12,
              maxBarThickness: 72,
              categoryPercentage: 0.62,
              barPercentage: 0.82,
              yAxisID: "y",
            },
            {
              label: "Tỷ lệ (%)",
              data: classRangeBars.map((item) =>
                Number(
                  ((item.count / Math.max(classRangeTotal, 1)) * 100).toFixed(
                    1,
                  ),
                ),
              ),
              backgroundColor: classRangeBars.map((item) => `${item.color}22`),
              borderColor: classRangeBars.map((item) => item.color),
              borderWidth: 2,
              borderRadius: 12,
              maxBarThickness: 72,
              categoryPercentage: 0.62,
              barPercentage: 0.82,
              yAxisID: "y1",
            },
          ],
        },
        total: classRangeTotal,
        summary: classRangeBars.map((item) => ({
          ...item,
          percent: Number(
            ((item.count / Math.max(classRangeTotal, 1)) * 100).toFixed(1),
          ),
        })),
        hasData: classRangeTotal > 0,
      },
    };
  }, [classRows, filteredClasses, reportData, studentsByClass]);

  const teacherStats = useMemo(() => {
    const resolveStatusInfo = (statusKey) => {
      const defaults = {
        ongoing: {
          key: "ongoing",
          label: "Đang học",
          badgeClass: "bg-success text-white",
        },
        upcoming: {
          key: "upcoming",
          label: "Sắp mở",
          badgeClass: "bg-info text-dark",
        },
        ended: {
          key: "ended",
          label: "Đã kết thúc",
          badgeClass: "bg-secondary text-white",
        },
      };
      return defaults[statusKey] || defaults.ongoing;
    };

    if (
      teacherDashboardData &&
      Array.isArray(teacherDashboardData.teachers)
    ) {
      return teacherDashboardData.teachers
        .map((gv) => {
          const classes = (gv.classes || []).map((cls) => ({
            id: cls.classId,
            name: resolveClassDisplayName(cls.className) || cls.className,
            courseLabel: cls.courseLabel || "Chưa gán khóa học",
            currentSize: cls.currentSize || 0,
            startDate: parseApiDate(cls.startDate),
            endDate: parseApiDate(cls.endDate),
            status: resolveStatusInfo(cls.status),
          }));
          return {
            id: gv.teacherId,
            name: gv.name,
            email: gv.email || "",
            phone: gv.phone || "",
            degree: gv.degree || "",
            specialization: gv.specialization || "",
            avgAttendanceRate: gv.avgAttendanceRate,
            avgScore: gv.avgScore,
            classes,
            totalStudents: gv.totalStudents ?? classes.reduce((sum, c) => sum + (c.currentSize || 0), 0),
            ongoing: gv.ongoingClasses ?? classes.filter((c) => c.status.key === "ongoing").length,
            upcoming: gv.upcomingClasses ?? classes.filter((c) => c.status.key === "upcoming").length,
            ended: gv.endedClasses ?? classes.filter((c) => c.status.key === "ended").length,
            usesFallback: !!teacherDashboardData.usesFallback,
          };
        })
        .sort(
          (left, right) =>
            right.classes.length - left.classes.length ||
            (left.name || "").localeCompare(right.name || ""),
        );
    }

    const teacherMap = new Map();
    classRows.forEach((cls) => {
      const teachers = cls.teachers?.length
        ? cls.teachers
        : [{ id: `unassigned-${cls.id}`, name: "Chưa phân công" }];
      teachers.forEach((teacher) => {
        if (!teacherMap.has(teacher.id)) {
          teacherMap.set(teacher.id, {
            id: teacher.id,
            name: teacher.name,
            email: "",
            classes: [],
            totalStudents: 0,
            ongoing: 0,
            upcoming: 0,
            ended: 0,
          });
        }

        const teacherEntry = teacherMap.get(teacher.id);
        teacherEntry.classes.push({
          id: cls.id,
          name: cls.displayName || cls.name,
          courseLabel: cls.courseLabel,
          currentSize: cls.currentSize || 0,
          startDate: cls.startDateParsed,
          endDate: cls.endDateParsed,
          status: cls.status,
        });
        teacherEntry.totalStudents += cls.currentSize || 0;
        if (cls.status.key === "ongoing") teacherEntry.ongoing += 1;
        if (cls.status.key === "upcoming") teacherEntry.upcoming += 1;
        if (cls.status.key === "ended") teacherEntry.ended += 1;
      });
    });

    return Array.from(teacherMap.values()).sort(
      (left, right) =>
        right.classes.length - left.classes.length ||
        (left.name || "").localeCompare(right.name || ""),
    );
  }, [classRows, teacherDashboardData]);

  const studentAnalytics = useMemo(() => {
    const studentMap = new Map();
    const performanceRows = [];
    const toNumberOrNull = (value) =>
      value != null && Number.isFinite(Number(value)) ? Number(value) : null;

    // Số liệu thật theo từng học sinh trong lớp từ BE (score/absenceRate có thể null = chưa có dữ liệu)
    const bePerfRows = Array.isArray(studentPerformanceData?.performanceRows)
      ? studentPerformanceData.performanceRows
      : [];
    const bePerfLookup = new Map(); // key: `${classId}-${studentId}` → value
    bePerfRows.forEach((row) => {
      if (row.classId != null && row.studentId != null) {
        bePerfLookup.set(`${row.classId}-${row.studentId}`, row);
      }
    });
    const beTopLearners = Array.isArray(studentPerformanceData?.topLearners)
      ? studentPerformanceData.topLearners
      : null;

    classRows.forEach((cls) => {
      // Roster HS thật của lớp; nếu danh sách lớp không kèm học viên thì lấy theo báo cáo BE.
      const classRoster = studentsByClass[cls.id] || [];
      const roster =
        classRoster.length > 0
          ? classRoster
          : bePerfRows
              .filter((row) => String(row.classId) === String(cls.id))
              .map((row) => ({
                studentId: row.studentId,
                fullName: row.studentName,
                email: row.email,
              }));

      const rawRows = roster.map((student) => {
        const studentId = student.studentId ?? student.id;
        const beRow = bePerfLookup.get(`${cls.id}-${studentId}`);

        const score = toNumberOrNull(beRow?.score);
        const totalSessions = toNumberOrNull(beRow?.totalSessions);
        const absenceCount = toNumberOrNull(beRow?.absenceCount);
        const absenceRate =
          toNumberOrNull(beRow?.absenceRate) ??
          (absenceCount != null && totalSessions > 0
            ? Number(((absenceCount / totalSessions) * 100).toFixed(1))
            : null);

        return {
          student: {
            studentId,
            fullName: student.name ?? student.fullName ?? beRow?.studentName ?? "Học sinh",
            email: student.email ?? beRow?.email ?? "",
          },
          score,
          absenceCount,
          totalSessions,
          absenceRate,
          classSize: beRow?.classSize ?? cls.currentSize ?? roster.length,
          _rankBe: toNumberOrNull(beRow?.rank),
        };
      });

      // Chỉ xếp hạng học sinh có điểm thật; học sinh chưa có điểm không có hạng.
      const scoredRows = rawRows
        .filter((row) => row.score != null)
        .sort((left, right) => {
          if (left._rankBe != null && right._rankBe != null) return left._rankBe - right._rankBe;
          return (
            right.score - left.score ||
            (left.student?.fullName || "").localeCompare(right.student?.fullName || "")
          );
        })
        .map((row, index) => ({
          ...row,
          rank: row._rankBe ?? index + 1,
        }));
      const unscoredRows = rawRows
        .filter((row) => row.score == null)
        .map((row) => ({ ...row, rank: null }));

      // displayName / courseLabel tiếng Anh đã resolve sẵn trong classRows
      const classDisplayName = cls.displayName || cls.name || "Lớp học";
      const classCourseLabel = cls.courseLabel || "Chưa gán khóa học";

      [...scoredRows, ...unscoredRows].forEach((row) => {
        if (!studentMap.has(row.student.studentId)) {
          studentMap.set(row.student.studentId, {
            studentId: row.student.studentId,
            fullName: row.student.fullName,
            email: row.student.email,
            classCount: 0,
            scoredClassCount: 0,
            scoreSum: 0,
            courseNames: new Set(),
            classResults: [],
          });
        }

        const studentEntry = studentMap.get(row.student.studentId);
        studentEntry.classCount += 1;
        if (row.score != null) {
          studentEntry.scoredClassCount += 1;
          studentEntry.scoreSum += row.score;
        }
        if (classCourseLabel && classCourseLabel !== "Chưa gán khóa học") {
          studentEntry.courseNames.add(classCourseLabel);
        }
        studentEntry.classResults.push({
          classId: cls.id,
          className: classDisplayName,
          courseLabel: classCourseLabel,
          score: row.score,
          rank: row.rank,
          classSize: row.classSize,
          absenceCount: row.absenceCount,
          absenceRate: row.absenceRate,
        });

        performanceRows.push({
          classId: cls.id,
          className: classDisplayName,
          studentId: row.student.studentId,
          studentName: row.student.fullName,
          score: row.score,
          rank: row.rank,
          classSize: row.classSize,
          absenceCount: row.absenceCount,
          absenceRate: row.absenceRate,
        });
      });
    });

    // Danh sách học sinh tổng hợp; điểm TB chỉ tính trên các lớp đã có điểm thật.
    const students = Array.from(studentMap.values())
      .map((student) => ({
        ...student,
        averageScore:
          student.scoredClassCount > 0
            ? Number((student.scoreSum / student.scoredClassCount).toFixed(1))
            : null,
        courseCount: student.courseNames.size,
        courses: Array.from(student.courseNames),
      }))
      .sort(
        (left, right) =>
          (right.averageScore ?? -1) - (left.averageScore ?? -1) ||
          right.classCount - left.classCount ||
          (left.fullName || "").localeCompare(right.fullName || ""),
      )
      .map((student, index) => ({
        ...student,
        globalRank: student.averageScore != null ? index + 1 : null,
      }));

    // BE trả topLearners thật (chỉ gồm học sinh đã có điểm) thì dùng trực tiếp.
    const topLearners = beTopLearners
      ? beTopLearners.map((tl) => ({
          studentId: tl.studentId,
          fullName: tl.fullName,
          email: tl.email,
          classCount: tl.classCount,
          courseCount: tl.courseCount,
          courses: tl.courses ?? [],
          classResults: [],
          averageScore: toNumberOrNull(tl.averageScore),
          globalRank: tl.globalRank,
        }))
      : students.filter((student) => student.averageScore != null).slice(0, 8);

    return {
      students,
      topLearners,
      performanceRows,
    };
  }, [classRows, studentsByClass, studentPerformanceData]);

  const topLearnersChart = useMemo(
    () => ({
      data: {
        labels: studentAnalytics.topLearners.map((item) => item.fullName),
        datasets: [
          {
            label: "Điểm trung bình",
            data: studentAnalytics.topLearners.map((item) => item.averageScore),
            backgroundColor: [
              "#4dabf7",
              "#40c057",
              "#845ef7",
              "#fab005",
              "#ff922b",
              "#20c997",
              "#f06595",
              "#339af0",
            ],
            borderRadius: 12,
          },
        ],
      },
      options: hideXAxis({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
          },
        },
      }),
    }),
    [studentAnalytics.topLearners],
  );

  const classStatsRows = classRows;

  const selectedClassPerformanceRows = useMemo(() => {
    if (!selectedClassId) {
      return [];
    }
    return studentAnalytics.performanceRows.filter(
      (item) => item.classId === selectedClassId,
    );
  }, [selectedClassId, studentAnalytics.performanceRows]);

  const classAnalytics = useMemo(() => {
    // Chỉ tính học sinh đã có số liệu thật (null = chưa có điểm / chưa điểm danh).
    const isRealNumber = (value) =>
      value != null && Number.isFinite(Number(value));
    const scoreValues = selectedClassPerformanceRows
      .map((item) => item.score)
      .filter(isRealNumber);
    const absenceRateValues = selectedClassPerformanceRows
      .map((item) => item.absenceRate)
      .filter(isRealNumber);

    const scoreTotal = scoreValues.length || 1;
    const scoreBins = [
      { label: "0-<5 (Không đạt)", color: "#ef476f", count: 0 },
      { label: "5-<6.5 (TB)", color: "#f0b429", count: 0 },
      { label: "6.5-<8 (Khá)", color: "#228be6", count: 0 },
      { label: "8-10 (Giỏi)", color: "#2f9e44", count: 0 },
    ];

    scoreValues.forEach((raw) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      if (value < 5) scoreBins[0].count += 1;
      else if (value < 6.5) scoreBins[1].count += 1;
      else if (value < 8) scoreBins[2].count += 1;
      else scoreBins[3].count += 1;
    });

    scoreBins.forEach((bin) => {
      bin.percent = Number(((bin.count / scoreTotal) * 100).toFixed(1));
    });

    const absenceTotal = absenceRateValues.length || 1;
    const absenceBins = [
      { label: "Nghỉ <20%", color: "#ffd43b", count: 0 },
      { label: "Nghỉ 20-50%", color: "#ff922b", count: 0 },
      { label: "Nghỉ >50%", color: "#f76707", count: 0 },
    ];

    absenceRateValues.forEach((raw) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      if (value < 20) absenceBins[0].count += 1;
      else if (value <= 50) absenceBins[1].count += 1;
      else absenceBins[2].count += 1;
    });

    absenceBins.forEach((bin) => {
      bin.percent = Number(((bin.count / absenceTotal) * 100).toFixed(1));
    });
    const scoreFocusIndex = Math.min(
      Math.max(Number(selectedScorePoint) || 0, 0),
      Math.max(scoreBins.length - 1, 0),
    );
    const absenceFocusIndex = Math.min(
      Math.max(Number(selectedAbsencePoint) || 0, 0),
      Math.max(absenceBins.length - 1, 0),
    );
    const scoreActiveBin = scoreBins[scoreFocusIndex] || null;
    const absenceActiveBin = absenceBins[absenceFocusIndex] || null;

    return {
      hasScoreData: scoreValues.length > 0,
      hasAbsenceData: absenceRateValues.length > 0,
      scoreBins,
      absenceBins,
      scoreFocusIndex,
      absenceFocusIndex,
      scoreActiveBin,
      absenceActiveBin,
      scoreChartData: {
        labels: scoreBins.map((item) => item.label),
        datasets: [
          {
            label: "Số học sinh",
            data: scoreBins.map((item, index) =>
              index === scoreFocusIndex ? item.count : null,
            ),
            backgroundColor: scoreBins.map((item) => item.color),
            borderColor: scoreBins.map((item) => item.color),
            borderWidth: 1,
            maxBarThickness: 56,
            categoryPercentage: 0.6,
            barPercentage: 0.85,
            borderRadius: 12,
            yAxisID: "y",
          },
          {
            label: "Tỷ lệ (%)",
            data: scoreBins.map((item, index) =>
              index === scoreFocusIndex ? item.percent : null,
            ),
            backgroundColor: scoreBins.map((item) => `${item.color}26`),
            borderColor: scoreBins.map((item) => item.color),
            borderWidth: 2,
            maxBarThickness: 56,
            categoryPercentage: 0.6,
            barPercentage: 0.85,
            borderRadius: 12,
            yAxisID: "y1",
          },
        ],
      },
      absenceChartData: {
        labels: absenceBins.map((item) => item.label),
        datasets: [
          {
            label: "Số học sinh",
            data: absenceBins.map((item, index) =>
              index === absenceFocusIndex ? item.count : null,
            ),
            backgroundColor: absenceBins.map((item) => item.color),
            borderColor: absenceBins.map((item) => item.color),
            borderWidth: 1,
            maxBarThickness: 56,
            categoryPercentage: 0.6,
            barPercentage: 0.85,
            borderRadius: 12,
            yAxisID: "y",
          },
          {
            label: "Tỷ lệ (%)",
            data: absenceBins.map((item, index) =>
              index === absenceFocusIndex ? item.percent : null,
            ),
            backgroundColor: absenceBins.map((item) => `${item.color}26`),
            borderColor: absenceBins.map((item) => item.color),
            borderWidth: 2,
            maxBarThickness: 56,
            categoryPercentage: 0.6,
            barPercentage: 0.85,
            borderRadius: 12,
            yAxisID: "y1",
          },
        ],
      },
    };
  }, [selectedAbsencePoint, selectedClassPerformanceRows, selectedScorePoint]);

  useEffect(() => {
    if (
      selectedClassId &&
      !classStatsRows.some((cls) => cls.id === selectedClassId)
    ) {
      setSelectedClassId(null);
    }
  }, [classStatsRows, selectedClassId]);

  useEffect(() => {
    if (!classAnalytics.scoreBins.length) {
      return;
    }
    setSelectedScorePoint((current) =>
      Math.min(
        Math.max(Number(current) || 0, 0),
        classAnalytics.scoreBins.length - 1,
      ),
    );
  }, [classAnalytics.scoreBins.length]);

  useEffect(() => {
    if (!classAnalytics.absenceBins.length) {
      return;
    }
    setSelectedAbsencePoint((current) =>
      Math.min(
        Math.max(Number(current) || 0, 0),
        classAnalytics.absenceBins.length - 1,
      ),
    );
  }, [classAnalytics.absenceBins.length]);

  const attendanceSummary = useMemo(() => {
    if (!attendanceRows.length) {
      return {
        totalSessions: 0,
        markedSessions: 0,
        avgPresentRate: 0,
      };
    }

    const markedSessions = attendanceRows.filter(
      (row) => row.status === "Đã điểm danh",
    ).length;
    const avgPresentRate = Number(
      (
        attendanceRows.reduce(
          (sum, row) =>
            sum + (row.total > 0 ? row.present / row.total : 0) * 100,
          0,
        ) / attendanceRows.length
      ).toFixed(1),
    );

    return {
      totalSessions: attendanceRows.length,
      markedSessions,
      avgPresentRate,
    };
  }, [attendanceRows]);

  const todayScheduleSummary = useMemo(() => {
    const summary = {
      ongoing: 0,
      soon: 0,
      queued: 0,
      done: 0,
    };

    todaySchedule.forEach((row) => {
      if (row.status?.key === "ongoing") summary.ongoing += 1;
      else if (row.status?.key === "soon") summary.soon += 1;
      else if (row.status?.key === "done") summary.done += 1;
      else summary.queued += 1;
    });

    return summary;
  }, [todaySchedule]);

  const overviewCards = [
    {
      title: "Tổng học viên",
      value: overviewStats.totalStudents,
      icon: "bi-people-fill",
      color: "linear-gradient(135deg, #0061ff 0%, #60efff 100%)",
    },
    {
      title: "Tổng lớp học",
      value: overviewStats.totalClasses,
      icon: "bi-building-fill",
      color: "linear-gradient(135deg, #0f9b0f 0%, #7be495 100%)",
    },
    {
      title: "Tổng lớp kết thúc",
      value: overviewStats.totalCourses,
      icon: "bi-book-half",
      color: "linear-gradient(135deg, #ff8a00 0%, #ffd447 100%)",
    },
    {
      title: "Lớp đang học",
      value: overviewStats.ongoingInRange,
      icon: "bi-play-circle-fill",
      color: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    },
    {
      title: "Lớp sắp khai giảng",
      value: overviewStats.upcomingInRange,
      icon: "bi-megaphone-fill",
      color: "linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)",
    },
  ];

  if (coreLoading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center p-5"
        style={{ minHeight: "60vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <div className="fw-semibold text-muted">
            Đang tải dữ liệu dashboard admin...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate__animated animate__fadeIn">
      <div className="mb-4 d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <h2 className="fw-bold text-dark mb-1 text-uppercase">
            Bảng điều khiển quản trị
          </h2>
          <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
            <span>Chào mừng trở lại,</span>
            <span className="fw-bold text-primary">
              {user?.hoTen || "Quản trị viên"}
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap justify-content-end">
          <div className="bg-white p-2 px-3 rounded-4 shadow-sm border d-flex align-items-center">
            <div className="bg-primary-subtle p-2 rounded-3 me-3">
              <i className="bi bi-calendar-check text-primary"></i>
            </div>
            <div className="text-start">
              <span
                className="small text-muted d-block fw-bold"
                style={{ fontSize: "9px", letterSpacing: "1px" }}
              >
                HỌC KỲ
              </span>
              <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>
                HK1 <span className="text-primary">2026</span>
              </span>
            </div>
          </div>

          <div
            className="position-relative hover-up bg-white shadow-sm border rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: "45px", height: "45px", cursor: "pointer" }}
            onClick={() => handleNotificationPanelOpen(!showNotifications)}
            title="Thông báo"
          >
            <i className="bi bi-bell-fill text-secondary fs-5"></i>
            {unreadCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light notification-badge"
                style={{ fontSize: "10px" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <NotificationPanel
            isOpen={showNotifications}
            onClose={() => handleNotificationPanelOpen(false)}
            onMarkAsRead={fetchUnreadCount}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card border-0 shadow-sm rounded-5 p-3 mb-4 bg-warning-subtle">
          <div className="d-flex align-items-start gap-3">
            <div
              className="bg-white rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: "40px", height: "40px", flexShrink: 0 }}
            >
              <i className="bi bi-info-circle-fill text-warning fs-5"></i>
            </div>
            <div>
              <div className="fw-bold text-dark mb-1">
                Nguồn dữ liệu hiện tại
              </div>
              {warnings.map((warning) => (
                <div key={warning} className="small text-secondary">
                  {warning}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-5 p-4 mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div className="d-flex align-items-start gap-3">
            <div className="bg-primary-subtle p-3 rounded-4">
              <i className="bi bi-funnel-fill text-primary fs-5"></i>
            </div>
            <div>
              <div
                className="fw-bold text-primary text-uppercase"
                style={{ letterSpacing: "0.5px" }}
              >
                Bộ lọc thời gian
              </div>
              <div className="text-muted small">
                Chọn nhanh khoảng thời gian hoặc tự chọn ngày để lọc lớp đang
                diễn ra + lớp sắp khai giảng.
              </div>
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <span className="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3 py-2">
              <i className="bi bi-info-circle me-2"></i>
              {overviewStats.ongoingInRange} lớp đang học •{" "}
              {overviewStats.upcomingInRange} lớp khai giảng trong khoảng
            </span>

            <button
              type="button"
              className="btn btn-light border rounded-pill fw-semibold shadow-sm px-3"
              onClick={() => {
                loadCoreDashboard({ silent: true });
                loadAttendance();
                loadTodaySchedule();
                fetchUnreadCount();
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang làm mới
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Làm mới dữ liệu
                </>
              )}
            </button>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mt-3">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${dateRange.preset === preset.id ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setDateRange(buildRangeFromPreset(preset.id))}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label small text-muted fw-semibold">
              Từ ngày
            </label>
            <input
              type="date"
              className="form-control rounded-4"
              value={dateRange.from}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  from: event.target.value,
                  preset: "custom",
                }))
              }
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-muted fw-semibold">
              Đến ngày
            </label>
            <input
              type="date"
              className="form-control rounded-4"
              value={dateRange.to}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  to: event.target.value,
                  preset: "custom",
                }))
              }
            />
          </div>
          <div className="col-md-4">
            <div className="d-flex flex-wrap gap-2 justify-content-md-end">
              <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
                {overviewStats.ongoingInRange} lớp đang học
              </span>
              <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2">
                {overviewStats.upcomingInRange} lớp sắp khai giảng
              </span>
              <span className="badge rounded-pill bg-light text-secondary border px-3 py-2">
                {overviewStats.endedInRange} lớp đã kết thúc
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-5 p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-calendar2-week-fill text-primary"></i>
            <div className="fw-bold text-dark">
              Lịch học hôm nay · {toInputDate(new Date())}
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
              {todayScheduleSummary.ongoing} Đang học
            </span>
            <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2">
              {todayScheduleSummary.soon} Sắp bắt đầu
            </span>
            <span className="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3 py-2">
              {todayScheduleSummary.queued} Chờ dạy
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr className="small text-uppercase text-muted">
                <th className="border-0 rounded-start-4 ps-3">Lớp học</th>
                <th className="border-0">Môn / Khóa</th>
                <th className="border-0">Giảng viên</th>
                <th className="border-0">Phòng</th>
                <th className="border-0">Giờ</th>
                <th className="border-0 rounded-end-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {todayScheduleLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    Đang tải lịch học hôm nay...
                  </td>
                </tr>
              ) : todaySchedule.length > 0 ? (
                todaySchedule.slice(0, 10).map((row) => (
                  <tr key={row.id}>
                    <td className="ps-3">
                      <div className="fw-bold text-dark">{row.className}</div>
                    </td>
                    <td className="small fw-semibold text-primary">
                      {row.courseName}
                    </td>
                    <td className="small">{row.teacherName}</td>
                    <td>
                      <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                        {row.room}
                      </span>
                    </td>
                    <td className="small text-muted">{row.timeLabel}</td>
                    <td>
                      <span
                        className={`badge rounded-pill px-3 py-2 ${row.status?.badgeClass || "bg-light text-muted border"}`}
                      >
                        {row.status?.label || "Chờ dạy"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    Chưa có lịch học cho hôm nay.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {dataSources.schedule === "error" && (
          <div className="mt-2 text-muted small">
            <i className="bi bi-exclamation-circle me-2"></i>
            Không tải được lịch học hôm nay.
          </div>
        )}
      </div>

      <div className="row g-4 mb-4">
        {overviewCards.map((item) => (
          <div className="col-12 col-sm-6 col-xl" key={item.title}>
            <div
              className="card border-0 shadow-sm rounded-5 p-4 text-white h-100 shadow-hover"
              style={{ background: item.color }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="mb-1 fw-medium opacity-75 small text-uppercase">
                    {item.title}
                  </p>
                  <h2 className="fw-bold mb-0">{item.value}</h2>
                </div>
                <div className="bg-white bg-opacity-25 rounded-4 p-2">
                  <i className={`bi ${item.icon} fs-3 text-white`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-5 p-4 h-100">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
              <div>
                <h5 className="fw-bold mb-1 text-dark">
                  <i className="bi bi-bar-chart-fill me-2 text-primary"></i>
                  Phân nhóm học sinh theo số lớp tham gia
                </h5>
                <p className="text-muted mb-0 small">
                  Tổng số học sinh trong hệ thống được chia thành 3 nhóm: tham
                  gia 1 lớp, tham gia từ 2-3 lớp và tham gia trên 3 lớp.
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                  Tổng hệ thống:{" "}
                  {overviewCharts.classSize.totalStudentsInSystem.toLocaleString(
                    "vi-VN",
                  )}{" "}
                  HS
                </span>
                <span className="badge rounded-pill text-bg-light border px-3 py-2">
                  Có dữ liệu phân nhóm:{" "}
                  {overviewCharts.classSize.totalTrackedStudents.toLocaleString(
                    "vi-VN",
                  )}{" "}
                  HS
                </span>
              </div>
            </div>

            <div style={{ height: "320px" }}>
              {overviewCharts.classSize.hasData ? (
              <Bar
                data={overviewCharts.classSize.data}
                options={hideXAxis({
                  ...buildGroupedBarOptions("Số học sinh", "Tỷ lệ (%)"),
                  plugins: {
                    ...buildGroupedBarOptions("Số học sinh", "Tỷ lệ (%)")
                      .plugins,
                    legend: {
                      ...buildGroupedBarOptions("Số học sinh", "Tỷ lệ (%)")
                        .plugins.legend,
                      labels: {
                        boxWidth: 26,
                        boxHeight: 12,
                        useBorderRadius: true,
                        borderRadius: 6,
                        padding: 16,
                      },
                    },
                  },
                  scales: {
                    ...buildGroupedBarOptions("Số học sinh", "Tỷ lệ (%)")
                      .scales,
                    x: {
                      ...buildGroupedBarOptions("Số học sinh", "Tỷ lệ (%)")
                        .scales.x,
                      ticks: {
                        ...buildGroupedBarOptions("Số học sinh", "Tỷ lệ (%)")
                          .scales.x.ticks,
                        font: {
                          size: 12,
                          weight: "600",
                          lineHeight: 1.15,
                        },
                      },
                    },
                    y: {
                      ...buildGroupedBarOptions("Số học sinh", "Tỷ lệ (%)")
                        .scales.y,
                      suggestedMax:
                        overviewCharts.classSize.totalStudentsInSystem >=
                        1000
                          ? 600
                          : undefined,
                      ticks: {
                        callback(value) {
                          return Number(value).toLocaleString("vi-VN");
                        },
                      },
                    },
                  },
                })}
              />
              ) : (
                <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                  Chưa có dữ liệu.
                </div>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3">
              {overviewCharts.classSize.hasData &&
                overviewCharts.classSize.summary.map((item) => (
                <span
                  key={item.label}
                  className="badge rounded-pill text-bg-light border px-3 py-2"
                >
                  {item.label}: {item.count} HS ({formatPercent(item.percent)})
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-5 p-4 h-100">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
              <div>
                <h5 className="fw-bold mb-1 text-dark">
                  <i className="bi bi-bar-chart-steps me-2 text-success"></i>
                  Biểu đồ cột Tỉ lệ chuyên cần chung
                </h5>
                <p className="text-muted mb-0 small">
                  So sánh đồng thời số lượt chuyên cần và phần trăm trên tổng để
                  dễ đánh giá toàn cục.
                </p>
              </div>
            </div>

            <div style={{ height: "340px" }}>
              {overviewCharts.attendance.hasData ? (
                <Bar
                  data={overviewCharts.attendance.data}
                  options={buildGroupedBarOptions(
                    "Số lượt (tối)",
                    "Tỷ lệ % trên tổng",
                  )}
                />
              ) : (
                <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                  Chưa có dữ liệu điểm danh.
                </div>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3">
              {overviewCharts.attendance.hasData &&
                overviewCharts.attendance.summary.map((item) => (
                <span
                  key={item.label}
                  className="badge rounded-pill text-bg-light border px-3 py-2"
                >
                  {item.label}: {item.count.toLocaleString("vi-VN")} (
                  {formatPercent(item.percent)})
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-5 p-4 h-100">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
              <div>
                <h5 className="fw-bold mb-1 text-dark">
                  <i className="bi bi-bar-chart-line-fill me-2 text-info"></i>
                  Biểu đồ số học sinh từng lớp
                </h5>
                <p className="text-muted mb-0 small">
                  Khi đổi ngày bắt đầu và kết thúc, biểu đồ sẽ cập nhật số lớp
                  theo 3 nhóm sĩ số: dưới 10, từ 10-20 và trên 20 học sinh.
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge rounded-pill bg-info-subtle text-info-emphasis border border-info-subtle px-3 py-2">
                  Từ {rangeStart ? formatDateVN(rangeStart) : "--/--/----"}
                </span>
                <span className="badge rounded-pill bg-info-subtle text-info-emphasis border border-info-subtle px-3 py-2">
                  Đến {rangeEnd ? formatDateVN(rangeEnd) : "--/--/----"}
                </span>
              </div>
            </div>

            <div style={{ height: "360px" }}>
              {overviewCharts.classRange.hasData ? (
                <Bar
                  data={overviewCharts.classRange.data}
                  options={buildGroupedBarOptions("Số lớp", "Tỷ lệ (%)")}
                />
              ) : (
                <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                  Chưa có lớp học trong khoảng thời gian này.
                </div>
              )}
            </div>

            <div className="small text-muted mt-2">
              Trong khoảng chọn có{" "}
              <span className="fw-bold text-dark">
                {overviewCharts.classRange.total.toLocaleString("vi-VN")}
              </span>{" "}
              lớp giao cắt với thời gian đang lọc.
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3">
              {overviewCharts.classRange.summary.map((item) => (
                <span
                  key={item.label}
                  className="badge rounded-pill text-bg-light border px-3 py-2"
                >
                  {item.label}: {item.count} lớp ({formatPercent(item.percent)})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-5 p-4 mb-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
          <div>
            <h5 className="fw-bold mb-1 text-dark">
              <i className="bi bi-clock-history me-2 text-primary"></i>
              Lịch buổi học theo bộ lọc
            </h5>
            <p className="text-muted mb-0 small">
              Theo dõi số buổi đã điểm danh trong khoảng thời gian, kèm sĩ số
              hiện diện trên từng buổi.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <SourceBadge
              mode={dataSources.attendance}
              label={
                dataSources.attendance === "real"
                  ? "Chuyên cần: thật"
                  : "Chuyên cần: không tải được"
              }
            />
            <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
              {attendanceSummary.markedSessions}/
              {attendanceSummary.totalSessions} buổi đã điểm danh
            </span>
            <span className="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3 py-2">
              TB hiện diện {formatPercent(attendanceSummary.avgPresentRate)}
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead className="table-light">
              <tr className="small text-uppercase text-muted">
                <th className="border-0 rounded-start-4 ps-3">Lớp học</th>
                <th className="border-0">Khóa học</th>
                <th className="border-0">Giảng viên</th>
                <th className="border-0">Ngày / giờ</th>
                <th className="border-0">Hiện diện</th>
                <th className="border-0 rounded-end-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {attendanceLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    Đang tải dữ liệu buổi học...
                  </td>
                </tr>
              ) : attendanceRows.length > 0 ? (
                attendanceRows.slice(0, 10).map((row) => {
                  const percent =
                    row.total > 0
                      ? Number(((row.present / row.total) * 100).toFixed(1))
                      : 0;
                  return (
                    <tr key={row.id}>
                      <td className="ps-3">
                        <div className="fw-bold text-dark">{row.classCode}</div>
                      </td>
                      <td className="small fw-semibold text-primary">
                        {row.courseName}
                      </td>
                      <td className="small">{row.teacher}</td>
                      <td className="small text-muted">
                        <div>{row.date}</div>
                        <div>{row.time}</div>
                      </td>
                      <td>
                        <div className="fw-bold">
                          {row.present}/{row.total}
                        </div>
                        <div className="small text-muted">
                          {formatPercent(percent)}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge rounded-pill px-3 py-2 ${row.status === "Đã điểm danh" ? "bg-success-subtle text-success border border-success-subtle" : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    Chưa có buổi học nào trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
        <div className="border-bottom bg-white px-4 pt-3">
          <div className="nav nav-tabs border-0 d-flex justify-content-between flex-wrap align-items-start gap-2">
            <div className="d-flex flex-wrap align-items-center">
              {TAB_ITEMS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`nav-link border-0 rounded-top-4 fw-semibold px-4 py-3 ${activeTab === tab.id ? "active text-primary bg-white shadow-sm" : "text-secondary"}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={`bi ${tab.icon} me-2`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary rounded-4 px-4 py-2 fw-semibold shadow-sm mb-1 hover-up"
              onClick={() => navigate("/admin/student-stats")}
            >
              <i className="bi bi-people-fill me-2"></i>
              Thống kê học sinh
              <i className="bi bi-arrow-up-right ms-2"></i>
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === "teachers" && (
            <div>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
                <div>
                  <h5 className="fw-bold text-dark mb-1">
                    Trạng thái lớp của từng giảng viên
                  </h5>
                  <p className="text-muted small mb-0">
                    Nhấn vào từng giảng viên để xem chi tiết lớp người đó đang
                    dạy.
                  </p>
                </div>
              </div>

              <div className="row g-3">
                {teacherStats.map((teacher) => (
                  <div className="col-12" key={teacher.id}>
                    <div className="border rounded-5 p-4 bg-light-subtle">
                      <button
                        type="button"
                        className="btn w-100 text-start p-0 border-0 bg-transparent shadow-none"
                        onClick={() =>
                          setExpandedTeacherId((current) =>
                            current === teacher.id ? null : teacher.id,
                          )
                        }
                      >
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                          <div className="d-flex align-items-center gap-3">
                            <div className="teacher-avatar">
                              {(teacher.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-bold text-dark d-flex align-items-center gap-2 flex-wrap">
                                {teacher.name}
                                {teacher.degree && (
                                  <span className="badge rounded-pill bg-gradient text-white px-2 py-1 small" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                                    {teacher.degree}
                                  </span>
                                )}
                              </div>
                              <div className="small text-muted">
                                {teacher.email || "Chưa có email"}
                                {teacher.phone && <span className="ms-2">· {teacher.phone}</span>}
                              </div>
                              <div className="small text-muted d-flex align-items-center gap-2 flex-wrap">
                                <span>{teacher.classes.length} lớp phụ trách</span>
                                {teacher.specialization && (
                                  <>
                                    <span>·</span>
                                    <span className="text-primary fw-medium">{teacher.specialization}</span>
                                  </>
                                )}
                              </div>
                              {(teacher.avgAttendanceRate != null || teacher.avgScore != null) && (
                                <div className="small mt-1 d-flex align-items-center gap-3 flex-wrap">
                                  {teacher.avgAttendanceRate != null && (
                                    <span className="badge rounded-pill bg-teal-subtle text-teal border px-2 py-1" style={{ backgroundColor: "#ccfbf1", color: "#0f766e", borderColor: "#5eead4" }}>
                                      <i className="bi bi-calendar2-check me-1"></i>
                                      CC TB {Number(teacher.avgAttendanceRate).toFixed(1)}%
                                    </span>
                                  )}
                                  {teacher.avgScore != null && (
                                    <span className="badge rounded-pill bg-amber-subtle text-amber border px-2 py-1" style={{ backgroundColor: "#fef3c7", color: "#b45309", borderColor: "#fbbf24" }}>
                                      <i className="bi bi-star-fill me-1"></i>
                                      Điểm TB {Number(teacher.avgScore).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="d-flex align-items-start gap-3 flex-wrap justify-content-end">
                            <div className="d-flex flex-wrap gap-2 justify-content-end">
                              <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                                {teacher.classes.length} lớp
                              </span>
                              <span className="badge rounded-pill text-bg-light border px-3 py-2">
                                {teacher.totalStudents} HS
                              </span>
                              <span className="badge rounded-pill bg-success px-3 py-2">
                                {teacher.ongoing} đang học
                              </span>
                              <span className="badge rounded-pill bg-info text-dark px-3 py-2">
                                {teacher.upcoming} sắp mở
                              </span>
                              <span className="badge rounded-pill bg-secondary px-3 py-2">
                                {teacher.ended} đã kết thúc
                              </span>
                            </div>
                            <div className="teacher-toggle-icon">
                              <i
                                className={`bi ${expandedTeacherId === teacher.id ? "bi-chevron-up" : "bi-chevron-down"}`}
                              ></i>
                            </div>
                          </div>
                        </div>
                      </button>

                      {expandedTeacherId === teacher.id && (
                        <div className="mt-4 pt-3 border-top">
                          <div className="table-responsive">
                            <table className="table align-middle mb-0">
                              <thead>
                                <tr className="small text-uppercase text-muted">
                                  <th className="border-0">Tên lớp</th>
                                  <th className="border-0">Khóa học</th>
                                  <th className="border-0">Sĩ số</th>
                                  <th className="border-0">Ngày khai giảng</th>
                                  <th className="border-0">Ngày kết thúc</th>
                                  <th className="border-0">Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody>
                                {teacher.classes.map((cls) => (
                                  <tr key={`${teacher.id}-${cls.id}`}>
                                    <td className="fw-semibold">{cls.name}</td>
                                    <td>{cls.courseLabel}</td>
                                    <td>
                                      <span className="badge rounded-pill text-bg-light border px-3 py-2">
                                        {cls.currentSize} HS
                                      </span>
                                    </td>
                                    <td>{formatDateVN(cls.startDate)}</td>
                                    <td>{formatDateVN(cls.endDate)}</td>
                                    <td>
                                      <span
                                        className={`badge rounded-pill px-3 py-2 ${cls.status.badgeClass}`}
                                      >
                                        {cls.status.label}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {teacherStats.length === 0 && (
                  <div className="text-center text-muted py-5">
                    Chưa có giảng viên hoặc lớp học để thống kê.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "classes" && (
            <div>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
                <div>
                  <h5 className="fw-bold text-dark mb-1">
                    Thống kê lớp học theo phổ điểm và tỷ lệ nghỉ học
                  </h5>
                  <p className="text-muted small mb-0">
                    Nhấn vào một lớp trong danh sách bên dưới để mở biểu đồ
                    thống kê riêng cho lớp đó.
                  </p>
                </div>
              </div>

              <div className="d-flex flex-column gap-3">
                {classStatsRows.length > 0 ? (
                  classStatsRows.slice(0, 12).map((cls) => {
                    const isExpanded = selectedClassId === cls.id;
                    return (
                      <div
                        key={cls.id}
                        className={`border rounded-5 overflow-hidden ${isExpanded ? "class-accordion-active" : "bg-white"}`}
                      >
                        <button
                          type="button"
                          className="btn w-100 text-start p-4 border-0 bg-transparent shadow-none"
                          onClick={() =>
                            setSelectedClassId((current) =>
                              current === cls.id ? null : cls.id,
                            )
                          }
                        >
                          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                            <div className="d-flex align-items-start gap-3">
                              <div className="teacher-avatar">
                                {(cls.displayName || cls.name).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-bold text-dark fs-5">
                                  {cls.displayName || cls.name}
                                </div>
                                <div className="small text-muted">
                                  {cls.courseLabel}
                                </div>
                                <div className="small text-muted">
                                  Sĩ số {cls.currentSize || 0}/
                                  {cls.capacity || "Không giới hạn"} | Giảng
                                  viên: {cls.teacherLabel}
                                </div>
                              </div>
                            </div>

                            <div className="d-flex align-items-start gap-3 flex-wrap justify-content-end">
                              <div className="d-flex flex-wrap gap-2 justify-content-end">
                                <span
                                  className={`badge rounded-pill px-3 py-2 ${cls.status.badgeClass}`}
                                >
                                  {cls.status.label}
                                </span>
                                <span className="badge rounded-pill text-bg-light border px-3 py-2">
                                  {cls.currentSize || 0} học viên
                                </span>
                              </div>
                              <div className="teacher-toggle-icon">
                                <i
                                  className={`bi ${isExpanded ? "bi-chevron-up" : "bi-chevron-down"}`}
                                ></i>
                              </div>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-top px-4 pb-4 pt-3 bg-light-subtle">
                            <div className="row g-4">
                              <div className="col-12 col-lg-6">
                                <div className="border rounded-5 p-4 h-100 bg-white">
                                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                    <div>
                                      <div className="fw-bold text-dark">
                                        Tỷ lệ điểm của lớp (4 ngưỡng)
                                      </div>
                                      <div className="small text-muted">
                                        0-&lt;5 (Không đạt), 5-&lt;6.5 (TB),
                                        6.5-&lt;8 (Khá), 8-10 (Giỏi).
                                      </div>
                                    </div>
                                    <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                                      {classAnalytics.scoreActiveBin
                                        ? `Mốc ${classAnalytics.scoreActiveBin.label}`
                                        : "Chưa có mốc điểm"}
                                    </span>
                                  </div>

                                  <div className="mb-3 px-1">
                                    <input
                                      type="range"
                                      className="form-range"
                                      min="0"
                                      max={Math.max(
                                        classAnalytics.scoreBins.length - 1,
                                        0,
                                      )}
                                      step="1"
                                      value={classAnalytics.scoreFocusIndex}
                                      onChange={(event) =>
                                        setSelectedScorePoint(
                                          Number(event.target.value),
                                        )
                                      }
                                    />
                                    <div className="d-flex justify-content-between align-items-center small text-muted gap-2">
                                      <span>
                                        {classAnalytics.scoreBins[0]?.label ||
                                          "0-1"}
                                      </span>
                                      <span className="fw-semibold text-primary">
                                        {classAnalytics.scoreActiveBin?.label ||
                                          "--"}
                                      </span>
                                      <span>
                                        {classAnalytics.scoreBins[
                                          classAnalytics.scoreBins.length - 1
                                        ]?.label || "9-10"}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ height: "280px" }}>
                                    {classAnalytics.hasScoreData ? (
                                      <Bar
                                        data={classAnalytics.scoreChartData}
                                        options={hideXAxis(
                                          buildFocusedGroupedBarOptions(
                                            "Số học sinh",
                                            "Tỷ lệ (%)",
                                            classAnalytics.scoreFocusIndex,
                                          ),
                                        )}
                                      />
                                    ) : (
                                      <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                                        Chưa có dữ liệu phân phối điểm cho lớp
                                        này.
                                      </div>
                                    )}
                                  </div>

                                  <div className="d-flex flex-wrap gap-2 mt-3">
                                    {classAnalytics.scoreBins.map(
                                      (bin, index) => (
                                        <span
                                          key={bin.label}
                                          className="badge rounded-pill px-3 py-2"
                                          style={{
                                            background:
                                              index ===
                                              classAnalytics.scoreFocusIndex
                                                ? `${bin.color}26`
                                                : "transparent",
                                            color: bin.color,
                                            border: `1px solid ${
                                              index ===
                                              classAnalytics.scoreFocusIndex
                                                ? `${bin.color}55`
                                                : "#e9ecef"
                                            }`,
                                            fontWeight:
                                              index ===
                                              classAnalytics.scoreFocusIndex
                                                ? 700
                                                : 600,
                                          }}
                                        >
                                          {bin.label}: {bin.count} HS (
                                          {formatPercent(bin.percent)})
                                        </span>
                                      ),
                                    )}
                                    {classAnalytics.scoreBins.length === 0 && (
                                      <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                                        Chưa có dữ liệu.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="col-12 col-lg-6">
                                <div className="border rounded-5 p-4 h-100 bg-white">
                                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                    <div>
                                      <div className="fw-bold text-dark">
                                        Tỷ lệ nghỉ học của lớp (3 ngưỡng)
                                      </div>
                                      <div className="small text-muted">
                                        Nghỉ &lt;20%, Nghỉ 20-50%, Nghỉ &gt;50%
                                        (tính theo % số buổi học của từng học
                                        sinh).
                                      </div>
                                    </div>
                                    <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2">
                                      {classAnalytics.absenceActiveBin
                                        ? `Mốc ${classAnalytics.absenceActiveBin.label}`
                                        : "Chưa có mốc nghỉ"}
                                    </span>
                                  </div>

                                  <div className="mb-3 px-1">
                                    <input
                                      type="range"
                                      className="form-range"
                                      min="0"
                                      max={Math.max(
                                        classAnalytics.absenceBins.length - 1,
                                        0,
                                      )}
                                      step="1"
                                      value={classAnalytics.absenceFocusIndex}
                                      onChange={(event) =>
                                        setSelectedAbsencePoint(
                                          Number(event.target.value),
                                        )
                                      }
                                    />
                                    <div className="d-flex justify-content-between align-items-center small text-muted gap-2">
                                      <span>
                                        {classAnalytics.absenceBins[0]?.label ||
                                          "0-0 buổi"}
                                      </span>
                                      <span className="fw-semibold text-warning-emphasis">
                                        {classAnalytics.absenceActiveBin
                                          ?.label || "--"}
                                      </span>
                                      <span>
                                        {classAnalytics.absenceBins[
                                          classAnalytics.absenceBins.length - 1
                                        ]?.label || "0-0 buổi"}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ height: "280px" }}>
                                    {classAnalytics.hasAbsenceData ? (
                                      <Bar
                                        data={classAnalytics.absenceChartData}
                                        options={hideXAxis(
                                          buildFocusedGroupedBarOptions(
                                            "Số học sinh",
                                            "Tỷ lệ (%)",
                                            classAnalytics.absenceFocusIndex,
                                          ),
                                        )}
                                      />
                                    ) : (
                                      <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                                        Chưa có dữ liệu nghỉ học cho lớp này.
                                      </div>
                                    )}
                                  </div>

                                  <div className="d-flex flex-wrap gap-2 mt-3">
                                    {classAnalytics.absenceBins.map(
                                      (bin, index) => (
                                        <span
                                          key={bin.label}
                                          className="badge rounded-pill px-3 py-2"
                                          style={{
                                            background:
                                              index ===
                                              classAnalytics.absenceFocusIndex
                                                ? `${bin.color}26`
                                                : "transparent",
                                            color: bin.color,
                                            border: `1px solid ${
                                              index ===
                                              classAnalytics.absenceFocusIndex
                                                ? `${bin.color}55`
                                                : "#e9ecef"
                                            }`,
                                            fontWeight:
                                              index ===
                                              classAnalytics.absenceFocusIndex
                                                ? 700
                                                : 600,
                                          }}
                                        >
                                          {bin.label}: {bin.count} HS (
                                          {formatPercent(bin.percent)})
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-5 text-muted border rounded-5 bg-white">
                    Chưa có lớp học để thống kê.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
                .shadow-hover:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
                }
                .hover-up:hover {
                    transform: scale(1.05);
                    transition: 0.2s;
                    cursor: pointer;
                }
                .teacher-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                    color: #1d4ed8;
                    font-weight: 700;
                    font-size: 1rem;
                    flex-shrink: 0;
                }
                .teacher-toggle-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: #eff6ff;
                    color: #2563eb;
                    border: 1px solid #bfdbfe;
                    flex-shrink: 0;
                    font-size: 1rem;
                }
                .class-accordion-active {
                    border-color: #bfdbfe !important;
                    background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
                    box-shadow: 0 12px 30px rgba(37, 99, 235, 0.08);
                }
                table tr:hover {
                    background-color: #f8fbff;
                }
                .nav-tabs .nav-link.active {
                    border-bottom: 3px solid #0d6efd !important;
                }
            `}</style>
    </div>
  );
};

export default AdminDashboard;
