import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import { p0Api } from "../../api/p0Api";

import {
  hashSeed,
  seededNumber,
  formatPercent,
  buildDemoRosterForClass,
  normalizeClass,
  getScoreBucket,
  buildGroupedBarOptions,
  summarizeScoreBuckets,
} from "../../utils/statsSeeder";
import {
  DEMO_COURSE_NAMES,
  DEMO_STUDENT_NAMES,
} from "../../constants/statsConstants";

ChartJS.register(...registerables);



const AdminStudentStats = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classesData, setClassesData] = useState([]);
  const [studentsByClass, setStudentsByClass] = useState({});
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showDemoBadge, setShowDemoBadge] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const classRows = (await p0Api.classes.list()) || [];
      const isDemo = classRows.length === 0;
      setShowDemoBadge(isDemo);

      const normalizedClasses =
        classRows.length > 0
          ? classRows.map(normalizeClass)
          : Array.from({ length: 12 }, (_, index) => ({
              id: `demo-class-${index + 1}`,
              name: `Lớp demo ${index + 1}`,
              courses: [
                { name: DEMO_COURSE_NAMES[index % DEMO_COURSE_NAMES.length] },
              ],
              teachers: [
                { id: `demo-teacher-${index % 6}`, name: "Giảng viên demo" },
              ],
              currentSize: seededNumber(`demo-class-${index + 1}`, 14, 30, 0),
            })).map(normalizeClass);

      const rosterResults =
        classRows.length > 0
          ? await Promise.allSettled(
              normalizedClasses.map((cls) => p0Api.classes.students(cls.id)),
            )
          : [];

      const nextRoster = {};
      if (classRows.length > 0) {
        rosterResults.forEach((result, index) => {
          const cls = normalizedClasses[index];
          if (result.status === "fulfilled") {
            const rows =
              Array.isArray(result.value) && result.value.length > 0
                ? result.value
                : buildDemoRosterForClass(cls.id, cls.currentSize);
            nextRoster[cls.id] = rows;
            if (
              (!Array.isArray(result.value) || result.value.length === 0) &&
              !showDemoBadge
            ) {
              setShowDemoBadge(true);
            }
          } else {
            nextRoster[cls.id] = buildDemoRosterForClass(
              cls.id,
              cls.currentSize,
            );
            setShowDemoBadge(true);
          }
        });
      } else {
        normalizedClasses.forEach((cls) => {
          nextRoster[cls.id] = buildDemoRosterForClass(cls.id, cls.currentSize);
        });
      }

      setClassesData(normalizedClasses);
      setStudentsByClass(nextRoster);
    } catch (err) {
      setError(err.message || "Không tải được dữ liệu thống kê học sinh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const classRankings = useMemo(() => {
    const byClass = {};
    classesData.forEach((cls) => {
      const roster =
        (studentsByClass[cls.id] || []).length > 0
          ? studentsByClass[cls.id]
          : buildDemoRosterForClass(cls.id, cls.currentSize);

      const scoredRows = roster
        .map((student) => {
          const sid =
            student.studentId ??
            student.id ??
            `student-${hashSeed(student.email || student.fullName)}`;
          const score = seededNumber(`${sid}-${cls.id}-score`, 4.2, 9.8, 1);
          const bucket = getScoreBucket(score);
          return {
            studentId: sid,
            fullName:
              student.fullName ?? student.hoTen ?? student.name ?? "Học viên",
            email: student.email ?? student.Email ?? "",
            score,
            scoreLabel: bucket.label,
            scoreColor: bucket.color,
          };
        })
        .sort(
          (left, right) =>
            right.score - left.score ||
            left.fullName.localeCompare(right.fullName),
        )
        .map((row, index, list) => ({
          ...row,
          rank: index + 1,
          classSize: list.length || 1,
          rankPercentile: Number(
            (((list.length - index) / (list.length || 1)) * 100).toFixed(1),
          ),
        }));

      const bucketSummary = summarizeScoreBuckets(scoredRows, "score").map(
        (bucket) => ({
          ...bucket,
          label: bucket.rangeLabel,
          min: bucket.min,
          max: bucket.max,
          percent: Number(bucket.percent),
        }),
      );

      const topScore = scoredRows.length > 0 ? scoredRows[0].score : 0;
      const avgScore =
        scoredRows.length > 0
          ? Number(
              (
                scoredRows.reduce((s, r) => s + r.score, 0) / scoredRows.length
              ).toFixed(1),
            )
          : 0;

      byClass[cls.id] = {
        class: cls,
        rows: scoredRows,
        bucketSummary,
        topScore,
        avgScore,
        totalStudents: scoredRows.length,
      };
    });
    return byClass;
  }, [classesData, studentsByClass]);

  const filteredClasses = useMemo(() => {
    const keyword = classSearch.trim().toLowerCase();
    const list = classesData
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!keyword) return list;
    return list.filter((cls) =>
      [cls.name, cls.courseLabel, cls.teacherLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [classesData, classSearch]);

  useEffect(() => {
    if (!selectedClassId && classesData.length > 0) {
      const sorted = classesData
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
      setSelectedClassId(sorted[0].id);
    }
  }, [classesData, selectedClassId]);

  const currentRanking = useMemo(() => {
    if (!selectedClassId) return null;
    return classRankings[selectedClassId] || null;
  }, [classRankings, selectedClassId]);

  const filteredRankedRows = useMemo(() => {
    if (!currentRanking) return [];
    const keyword = studentSearch.trim().toLowerCase();
    if (!keyword) return currentRanking.rows;
    return currentRanking.rows.filter((row) =>
      [row.fullName, row.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [currentRanking, studentSearch]);

  useEffect(() => {
    if (currentRanking?.rows.length > 0) {
      const exist = currentRanking.rows.some(
        (r) => r.studentId === selectedStudentId,
      );
      if (!exist) {
        setSelectedStudentId(currentRanking.rows[0].studentId);
      }
    } else {
      setSelectedStudentId(null);
    }
  }, [currentRanking, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    if (!currentRanking || !selectedStudentId) return null;
    return (
      currentRanking.rows.find((r) => r.studentId === selectedStudentId) || null
    );
  }, [currentRanking, selectedStudentId]);

  const classRankChart = useMemo(() => {
    if (!currentRanking || currentRanking.rows.length === 0) return null;
    const top10 = currentRanking.rows.slice(0, 10);
    return {
      data: {
        labels: top10.map((row, idx) => `#${idx + 1} ${row.fullName}`),
        datasets: [
          {
            label: "Điểm",
            data: top10.map((row) => row.score),
            backgroundColor: "#228be6",
            borderRadius: 12,
            yAxisID: "y",
          },
          {
            label: "Top (%)",
            data: top10.map((row) => row.rankPercentile),
            backgroundColor: "rgba(34, 139, 230, 0.22)",
            borderColor: "#228be6",
            borderWidth: 2,
            borderRadius: 12,
            yAxisID: "y1",
          },
        ],
      },
      options: buildGroupedBarOptions("Điểm (0-10)", "Top (%)", {
        leftMax: 10,
      }),
      top10,
    };
  }, [currentRanking]);

  const distributionChart = useMemo(() => {
    if (!currentRanking) return null;
    const summary = currentRanking.bucketSummary;
    return {
      data: {
        labels: summary.map((s) => s.label),
        datasets: [
          {
            label: "Số học sinh",
            data: summary.map((s) => s.count),
            backgroundColor: summary.map((s) => s.color),
            borderRadius: 12,
            yAxisID: "y",
          },
          {
            label: "Tỷ lệ (%)",
            data: summary.map((s) => Number(s.percent)),
            backgroundColor: summary.map((s) => `${s.color}40`),
            borderColor: summary.map((s) => s.color),
            borderWidth: 2,
            borderRadius: 12,
            yAxisID: "y1",
          },
        ],
      },
      options: buildGroupedBarOptions("Số học sinh", "Tỷ lệ (%)", {
        leftMax: Math.max(10, ...summary.map((s) => s.count)),
      }),
    };
  }, [currentRanking]);

  const selectedStudentChart = useMemo(() => {
    if (!selectedStudent || !currentRanking) return null;
    return {
      data: {
        labels: [selectedStudent.fullName],
        datasets: [
          {
            label: "Điểm",
            data: [selectedStudent.score],
            backgroundColor: selectedStudent.scoreColor,
            borderRadius: 12,
            yAxisID: "y",
          },
          {
            label: "Top (%)",
            data: [selectedStudent.rankPercentile],
            backgroundColor: `${selectedStudent.scoreColor}40`,
            borderColor: selectedStudent.scoreColor,
            borderWidth: 2,
            borderRadius: 12,
            yAxisID: "y1",
          },
        ],
      },
      options: buildGroupedBarOptions("Điểm (0-10)", "Top (%)", {
        leftMax: 10,
      }),
    };
  }, [selectedStudent, currentRanking]);

  if (loading) {
    return (
      <div className="p-4 animate__animated animate__fadeIn">
        <div className="card border-0 shadow-sm rounded-5 p-5 text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div className="fw-semibold text-muted">
            Đang tải thống kê học sinh...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div>
            <h2 className="fw-bold text-dark mb-1 text-uppercase d-flex align-items-center gap-2">
              Thống kê học sinh
              {showDemoBadge && (
                <span className="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle fs-6 px-3 py-1">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i> Dữ
                  liệu mẫu
                </span>
              )}
            </h2>
            <div className="small text-muted">
              Chọn lớp bên trái để xem bảng xếp hạng chi tiết của lớp đó (điểm,
              hạng, tỷ lệ %).
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap justify-content-end">
          <button
            type="button"
            className="btn btn-light border rounded-4 px-3"
            onClick={() => navigate("/admin")}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Về Trang chủ
          </button>
          <button
            type="button"
            className="btn btn-primary rounded-4 px-3"
            onClick={loadData}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      <div className="row g-4">
        {/* CỘT TRÁI: Danh sách lớp */}
        <div className="col-12 col-xl-3 col-lg-4">
          <div className="card border-0 shadow-sm rounded-5 p-4 h-100">
            <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-3">
              <div className="fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-collection-fill text-primary"></i>
                Danh sách lớp
              </div>
              <span className="badge rounded-pill text-bg-light border px-3 py-2">
                {filteredClasses.length.toLocaleString("vi-VN")} lớp
              </span>
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text bg-white border-end-0 rounded-start-4">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                value={classSearch}
                onChange={(event) => setClassSearch(event.target.value)}
                className="form-control border-start-0 rounded-end-4"
                placeholder="Tìm lớp, khóa, GV..."
              />
            </div>

            <div
              className="d-flex flex-column gap-2"
              style={{ maxHeight: "72vh", overflowY: "auto" }}
            >
              {filteredClasses.map((cls) => {
                const active = cls.id === selectedClassId;
                const rank = classRankings[cls.id];
                return (
                  <button
                    key={cls.id}
                    type="button"
                    className={`btn text-start border rounded-4 px-3 py-3 ${active ? "btn-primary text-white border-primary shadow-sm" : "bg-white"} `}
                    onClick={() => setSelectedClassId(cls.id)}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div style={{ minWidth: 0 }}>
                        <div
                          className={`fw-bold ${active ? "text-white" : "text-dark"}`}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {cls.name}
                        </div>
                        <div
                          className={`small ${active ? "text-white-50" : "text-muted"}`}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {cls.courseLabel}
                        </div>
                        <div
                          className={`small mt-1 ${active ? "text-white-50" : "text-muted"}`}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <i
                            className={`bi bi-person-badge me-1 ${active ? "text-white-50" : "text-primary"}`}
                          ></i>
                          {cls.teacherLabel}
                        </div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div
                          className={`badge rounded-pill px-3 py-2 ${active ? "bg-white text-primary" : "bg-primary-subtle text-primary border border-primary-subtle"}`}
                        >
                          {rank?.totalStudents ?? 0} HS
                        </div>
                        <div
                          className={`small mt-1 fw-semibold ${active ? "text-white" : "text-dark"}`}
                        >
                          TB {rank?.avgScore ?? 0}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredClasses.length === 0 && (
                <div className="text-center py-5 text-muted">
                  Không tìm thấy lớp phù hợp.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Bảng xếp hạng lớp đã chọn */}
        <div className="col-12 col-xl-9 col-lg-8">
          {!currentRanking ? (
            <div className="card border-0 shadow-sm rounded-5 p-5 text-center text-muted">
              Chọn một lớp bên trái để xem bảng xếp hạng.
            </div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {/* Thông tin lớp + Thống kê nhanh */}
              <div className="card border-0 shadow-sm rounded-5 p-4">
                <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <h4 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-trophy-fill text-warning"></i>
                        Bảng xếp hạng: {currentRanking.class.name}
                      </h4>
                    </div>
                    <div className="small text-muted d-flex flex-wrap align-items-center gap-3">
                      <span>
                        <i className="bi bi-bookmark-fill me-1 text-primary"></i>
                        Khóa:{" "}
                        <strong>{currentRanking.class.courseLabel}</strong>
                      </span>
                      <span>
                        <i className="bi bi-person-badge-fill me-1 text-primary"></i>
                        GV: <strong>{currentRanking.class.teacherLabel}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6 col-md-3">
                    <div className="border rounded-4 p-3 bg-light-subtle text-center">
                      <div className="small text-muted text-uppercase fw-bold mb-1">
                        Sĩ số
                      </div>
                      <div className="fw-bold text-dark fs-4">
                        {currentRanking.totalStudents}
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="border rounded-4 p-3 bg-primary-subtle text-center">
                      <div className="small text-primary text-uppercase fw-bold mb-1">
                        Điểm TB
                      </div>
                      <div className="fw-bold text-primary fs-4">
                        {currentRanking.avgScore}/10
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="border rounded-4 p-3 bg-success-subtle text-center">
                      <div className="small text-success text-uppercase fw-bold mb-1">
                        Điểm cao nhất
                      </div>
                      <div className="fw-bold text-success fs-4">
                        {currentRanking.topScore}/10
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="border rounded-4 p-3 bg-warning-subtle text-center">
                      <div className="small text-warning-emphasis text-uppercase fw-bold mb-1">
                        Tỷ lệ đạt
                      </div>
                      <div className="fw-bold text-warning-emphasis fs-4">
                        {currentRanking.rows.length > 0
                          ? formatPercent(
                              (currentRanking.rows.filter((r) => r.score >= 5)
                                .length /
                                currentRanking.rows.length) *
                                100,
                            )
                          : "0%"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Biểu đồ Top 10 + Phân bố điểm */}
              <div className="row g-4">
                <div className="col-12 col-lg-7">
                  <div className="card border-0 shadow-sm rounded-5 p-4 h-100">
                    <div className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-bar-chart-line-fill text-primary"></i>
                      Top 10 học sinh cao điểm nhất
                    </div>
                    {classRankChart ? (
                      <>
                        <div style={{ height: 340 }}>
                          <Bar
                            data={classRankChart.data}
                            options={classRankChart.options}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-5 text-muted">
                        Chưa có dữ liệu.
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-12 col-lg-5">
                  <div className="card border-0 shadow-sm rounded-5 p-4 h-100">
                    <div className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-pie-chart-fill text-primary"></i>
                      Phân bố theo thang điểm
                    </div>
                    {distributionChart ? (
                      <>
                        <div style={{ height: 340 }}>
                          <Bar
                            data={distributionChart.data}
                            options={distributionChart.options}
                          />
                        </div>
                        <div className="d-flex flex-wrap gap-2 mt-3">
                          {currentRanking.bucketSummary.map((b) => (
                            <span
                              key={b.label}
                              className="badge rounded-pill border px-3 py-2"
                              style={{
                                backgroundColor: `${b.color}20`,
                                color: b.color,
                                borderColor: `${b.color}55`,
                              }}
                            >
                              {b.label}: {b.count} HS (
                              {formatPercent(b.percent)})
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-5 text-muted">
                        Chưa có dữ liệu.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bảng xếp hạng chi tiết */}
              <div className="card border-0 shadow-sm rounded-5 p-4">
                <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                  <div>
                    <div className="fw-bold text-dark d-flex align-items-center gap-2">
                      <i className="bi bi-list-ol text-primary"></i>
                      Bảng xếp hạng chi tiết ({filteredRankedRows.length}/
                      {currentRanking.totalStudents})
                    </div>
                    <div className="small text-muted">
                      Nhấn vào một học sinh để xem chi tiết điểm & hạng.
                    </div>
                  </div>
                  <div className="input-group" style={{ maxWidth: 280 }}>
                    <span className="input-group-text bg-white border-end-0 rounded-start-4">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      className="form-control border-start-0 rounded-end-4"
                      placeholder="Tìm tên học sinh..."
                    />
                  </div>
                </div>

                <div
                  className="table-responsive"
                  style={{ maxHeight: 520, overflowY: "auto" }}
                >
                  <table className="table align-middle mb-0 table-hover">
                    <thead className="table-light sticky-top">
                      <tr className="small text-uppercase text-muted">
                        <th className="border-0 rounded-start-4 ps-3">Hạng</th>
                        <th className="border-0">Học sinh</th>
                        <th className="border-0">Email</th>
                        <th className="border-0">Nhóm điểm</th>
                        <th className="border-0">Điểm</th>
                        <th className="border-0 rounded-end-4">Top</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRankedRows.map((row) => {
                        const active = row.studentId === selectedStudentId;
                        return (
                          <tr
                            key={row.studentId}
                            role="button"
                            className={
                              active ? "table-primary fw-semibold" : ""
                            }
                            onClick={() => setSelectedStudentId(row.studentId)}
                          >
                            <td className="ps-3">
                              <span
                                className="badge rounded-pill px-3 py-2"
                                style={{
                                  backgroundColor:
                                    row.rank === 1
                                      ? "#fab005"
                                      : row.rank === 2
                                        ? "#adb5bd"
                                        : row.rank === 3
                                          ? "#d9480f"
                                          : "#e9ecef",
                                  color: row.rank <= 3 ? "#fff" : "#495057",
                                  fontWeight: 700,
                                }}
                              >
                                {row.rank === 1
                                  ? "🥇"
                                  : row.rank === 2
                                    ? "🥈"
                                    : row.rank === 3
                                      ? "🥉"
                                      : `#${row.rank}`}
                                <span className="ms-1 opacity-75">
                                  /{row.classSize}
                                </span>
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                  style={{
                                    width: 36,
                                    height: 36,
                                    backgroundColor: `${row.scoreColor}22`,
                                    color: row.scoreColor,
                                    fontSize: 13,
                                  }}
                                >
                                  {row.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    className="fw-semibold text-dark"
                                    style={{
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {row.fullName}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td
                              className="small text-muted"
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 200,
                              }}
                            >
                              {row.email || "—"}
                            </td>
                            <td>
                              <span
                                className="badge rounded-pill border px-3 py-2"
                                style={{
                                  backgroundColor: `${row.scoreColor}20`,
                                  color: row.scoreColor,
                                  borderColor: `${row.scoreColor}55`,
                                }}
                              >
                                {row.scoreLabel}
                              </span>
                            </td>
                            <td>
                              <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                                {row.score}/10
                              </span>
                            </td>
                            <td>
                              <span className="badge rounded-pill text-bg-light border px-3 py-2">
                                Top {formatPercent(row.rankPercentile)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredRankedRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-5 text-muted"
                          >
                            Không tìm thấy học sinh phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chi tiết học sinh đã chọn */}
              {selectedStudent && (
                <div className="card border-0 shadow-sm rounded-5 p-4">
                  <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                        style={{
                          width: 56,
                          height: 56,
                          background:
                            "linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)",
                          color: "#1d4ed8",
                          fontSize: 22,
                        }}
                      >
                        {selectedStudent.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="fw-bold text-dark fs-5">
                          {selectedStudent.fullName}
                        </div>
                        <div className="small text-muted">
                          {selectedStudent.email || "Chưa có email"}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 justify-content-end">
                      <span
                        className="badge rounded-pill px-3 py-2"
                        style={{
                          backgroundColor: `${selectedStudent.scoreColor}20`,
                          color: selectedStudent.scoreColor,
                          border: `1px solid ${selectedStudent.scoreColor}55`,
                        }}
                      >
                        {selectedStudent.scoreLabel}
                      </span>
                      <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                        Điểm: {selectedStudent.score}/10
                      </span>
                      <span className="badge rounded-pill text-bg-light border px-3 py-2">
                        Hạng: {selectedStudent.rank}/{selectedStudent.classSize}
                      </span>
                      <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
                        Top {formatPercent(selectedStudent.rankPercentile)} lớp
                      </span>
                    </div>
                  </div>

                  <div className="row g-4 mt-2">
                    <div className="col-12 col-lg-5">
                      <div className="card border-0 bg-light-subtle rounded-5 p-4 h-100">
                        <div className="fw-bold text-dark mb-3">
                          Biểu đồ điểm & xếp hạng
                        </div>
                        {selectedStudentChart ? (
                          <div style={{ height: 260 }}>
                            <Bar
                              data={selectedStudentChart.data}
                              options={selectedStudentChart.options}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-5 text-muted">
                            Chưa có dữ liệu.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-12 col-lg-7">
                      <div className="card border-0 bg-light-subtle rounded-5 p-4 h-100">
                        <div className="fw-bold text-dark mb-3">
                          Thông tin chi tiết trong lớp{" "}
                          {currentRanking.class.name}
                        </div>
                        <div className="row g-3">
                          <div className="col-6">
                            <div className="border rounded-4 p-3 bg-white text-center">
                              <div className="small text-muted text-uppercase fw-bold mb-1">
                                Xếp hạng
                              </div>
                              <div className="fw-bold text-dark fs-4">
                                #{selectedStudent.rank}
                                <small className="text-muted fw-normal">
                                  /{selectedStudent.classSize}
                                </small>
                              </div>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="border rounded-4 p-3 bg-white text-center">
                              <div className="small text-muted text-uppercase fw-bold mb-1">
                                Vượt qua
                              </div>
                              <div className="fw-bold text-primary fs-4">
                                {formatPercent(selectedStudent.rankPercentile)}
                              </div>
                              <div className="small text-muted">
                                học sinh trong lớp
                              </div>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="border rounded-4 p-3 bg-white text-center">
                              <div className="small text-muted text-uppercase fw-bold mb-1">
                                Điểm đạt
                              </div>
                              <div
                                className="fw-bold fs-4"
                                style={{ color: selectedStudent.scoreColor }}
                              >
                                {selectedStudent.score >= 5
                                  ? "✅ Đạt"
                                  : "❌ Chưa đạt"}
                              </div>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="border rounded-4 p-3 bg-white text-center">
                              <div className="small text-muted text-uppercase fw-bold mb-1">
                                Khóa học
                              </div>
                              <div
                                className="fw-bold text-dark"
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {currentRanking.class.courseLabel}
                              </div>
                              <div
                                className="small text-muted"
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                GV: {currentRanking.class.teacherLabel}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentStats;
