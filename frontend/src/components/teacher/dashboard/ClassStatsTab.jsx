import React, { useMemo, useState, useEffect } from "react";
import GradeBandPie from "./GradeBandPie";
import ScoreHistogramBars from "./ScoreHistogramBars";
import GradeBandGroupedBar from "./GradeBandGroupedBar";
import {
  buildScoreHistogram,
  getHistogramFooterStats,
  buildGradeBandSeries,
} from "../../../utils/teacherDashboardStats";

// Tab "Thống kê theo lớp": chọn 1 lớp trước, sau đó chọn xem theo 1 bài kiểm tra
// (biểu đồ tròn + phổ điểm) hay xem tổng hợp nhiều bài kiểm tra (nhóm cột theo mức điểm).
const ClassStatsTab = ({ classes, exams, initialClassId }) => {
  const [selectedClassId, setSelectedClassId] = useState(
    initialClassId || classes[0]?.id,
  );
  const [subView, setSubView] = useState("single"); // 'single' | 'multi'
  const [selectedExamId, setSelectedExamId] = useState(null);

  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    }
  }, [initialClassId]);

  const classExams = useMemo(
    () => exams.filter((exam) => exam.classId === selectedClassId),
    [exams, selectedClassId],
  );

  useEffect(() => {
    setSelectedExamId(classExams[0]?.id || null);
  }, [classExams]);

  const selectedExam = classExams.find((exam) => exam.id === selectedExamId);

  const histogramBins = useMemo(
    () => buildScoreHistogram(selectedExam?.scores || []),
    [selectedExam],
  );
  const footerStats = useMemo(
    () => getHistogramFooterStats(selectedExam?.scores || []),
    [selectedExam],
  );
  const multiExamSeries = useMemo(
    () =>
      buildGradeBandSeries(
        classExams,
        (exam) => exam.scores,
        (exam) => exam.name,
      ),
    [classExams],
  );

  return (
    <div className="animate__animated animate__fadeIn">
      {/* Chọn lớp */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {classes.map((cls) => (
          <button
            key={cls.id}
            type="button"
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${
              selectedClassId === cls.id ? "btn-primary" : "btn-outline-secondary"
            }`}
            onClick={() => setSelectedClassId(cls.id)}
          >
            {cls.name}
          </button>
        ))}
      </div>

      {classExams.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-5 p-5 bg-white text-center text-muted">
          <i className="bi bi-inbox fs-1 mb-2 opacity-50"></i>
          Lớp này chưa có bài kiểm tra nào.
        </div>
      ) : (
        <>
          {/* Chọn kiểu xem */}
          <div className="btn-group mb-3" role="group">
            <button
              type="button"
              className={`btn btn-sm px-3 ${subView === "single" ? "btn-dark" : "btn-outline-dark"}`}
              onClick={() => setSubView("single")}
            >
              Theo từng bài kiểm tra
            </button>
            <button
              type="button"
              className={`btn btn-sm px-3 ${subView === "multi" ? "btn-dark" : "btn-outline-dark"}`}
              onClick={() => setSubView("multi")}
            >
              Trên nhiều bài kiểm tra
            </button>
          </div>

          {subView === "single" ? (
            <>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {classExams.map((exam) => (
                  <button
                    key={exam.id}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 ${
                      selectedExamId === exam.id
                        ? "btn-secondary"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => setSelectedExamId(exam.id)}
                  >
                    {exam.name}
                  </button>
                ))}
              </div>
              <div className="row g-4">
                <div className="col-lg-5">
                  <GradeBandPie scores={selectedExam?.scores || []} />
                </div>
                <div className="col-lg-7">
                  <ScoreHistogramBars
                    bins={histogramBins}
                    average={footerStats.average}
                    modeLabel={footerStats.modeLabel}
                  />
                </div>
              </div>
            </>
          ) : (
            <GradeBandGroupedBar
              series={multiExamSeries}
              title={`So sánh các bài kiểm tra — lớp ${
                classes.find((c) => c.id === selectedClassId)?.name || ""
              }`}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ClassStatsTab;
