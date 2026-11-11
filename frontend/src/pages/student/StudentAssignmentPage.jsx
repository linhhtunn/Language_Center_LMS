import React, { useCallback, useEffect, useState } from "react";
import { useTest } from "../../context/TestContext";
import AssignmentList from "../../components/student/AssignmentList";
import AssignmentDetails from "../../components/student/AssignmentDetails";
import TestHeader from "../../components/student/TestHeader";
import QuestionNavigator from "../../components/student/QuestionNavigator";
import QuestionTypes from "../../components/student/question-types/QuestionTypes";
import SubmissionConfirm from "../../components/student/SubmissionConfirm";
import ResultsPage from "../../components/student/ResultsPage";
import { dinhDangHanNop, dinhDangHanNopNgan } from "../../utils/thoiHan";
import {
  getStudentAssignments,
  getStudentAssignmentDetails,
  getStudentAssignmentResult,
  submitStudentAssignment,
} from "../../api/studentAssignmentService";
import toast from "react-hot-toast";

// Trạng thái do backend tính từ hạn nộp admin đặt khi giao bài và số lần đã nộp.
const STUDENT_STATUS_META = {
  OPEN: { label: "Đang mở", bg: "#DBEAFE", fg: "#1D4ED8" },
  PENDING: { label: "Chưa tới giờ", bg: "#FEF3C7", fg: "#B45309" },
  SUBMITTED: { label: "Đã nộp", bg: "#D1FAE5", fg: "#065F46" },
  CLOSED: { label: "Đã hết hạn", bg: "#F3F4F6", fg: "#4B5563" },
};

const StudentAssignmentPage = () => {
  const { setIsTestActive } = useTest();
  const [view, setView] = useState("list");
  
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [showSubmissionConfirm, setShowSubmissionConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // Kết quả chấm do backend trả về sau khi nộp.
  const [submitResult, setSubmitResult] = useState(null);
  
  const [loading, setLoading] = useState(false);

  /**
   * Tải danh sách bài tập từ backend.
   *
   * Tách thành hàm riêng vì sau khi nộp bài phải gọi lại: nếu không, danh sách
   * vẫn giữ trạng thái cũ nên học sinh bấm vào làm tiếp được, rồi mới bị chặn
   * ở bước nộp — phải F5 mới thấy đúng.
   */
  const taiDanhSachBaiTap = useCallback(async ({ hienLoading = true } = {}) => {
    if (hienLoading) setLoading(true);
    try {
      const res = await getStudentAssignments();
      if (res.success) {
        // Map backend DTO to component props
        const mapped = res.data.map((a) => {
          const meta = STUDENT_STATUS_META[a.trangThai] || STUDENT_STATUS_META.OPEN;
          return {
            id: a.maBaiTap,
            title: a.tenBaiTap,
            subtitle: a.code ? `${a.loaiBaiTap} · ${a.code}` : a.loaiBaiTap,
            questions: a.soLuongCauHoi,
            duration: a.thoiGianLamBai ? `${a.thoiGianLamBai} phút` : "Không giới hạn",
            // Trạng thái thật theo hạn nộp admin đặt lúc giao bài.
            status: meta.label,
            statusColor: meta.bg,
            statusTextColor: meta.fg,
            canStart: a.coTheLamBai !== false,
            deadline: dinhDangHanNop(a.hanNop),
            // Giữ bản ISO để tính "sắp hết hạn"; chuỗi đã định dạng vi-VN
            // không parse lại được bằng new Date().
            rawDeadline: a.hanNop || null,
            daNop: Boolean(a.daNop),
            soLanDaNop: Number(a.soLanDaNop || 0),
            soLanConLai: Number(a.soLanConLai || 0),
            soLanLamToiDa: Number(a.soLanLamToiDa || 1),
            diemGanNhat: a.diemGanNhat,
            dangChoCham: Boolean(a.dangChoCham),
            // Dùng cho màn hình chi tiết. Ưu tiên lời nhắn admin gửi kèm lúc
            // giao bài, không có thì lấy mô tả của chính bài tập.
            description: a.ghiChuGiaoBai || a.moTa || "",
            loaiBaiTap: a.loaiBaiTap || "",
            kyNang: a.kyNang || "",
            mucDo: a.mucDo || "",
            trinhDo: a.trinhDo || "",
            maxScore: a.diemToiDa,
            classInfo: [
              a.tenLop,
              a.hanNop ? `Hạn nộp ${dinhDangHanNopNgan(a.hanNop)}` : null,
              a.daNop
                ? `Đã nộp ${a.soLanDaNop} lần · ${a.dangChoCham ? "chờ chấm" : `${a.diemGanNhat ?? 0} điểm`}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Chưa phân lớp",
          };
        });
        setAssignments(mapped);
        return mapped;
      } else {
        toast.error(res.message || "Lỗi tải danh sách bài tập");
      }
    } catch (error) {
      toast.error("Lỗi kết nối server");
    } finally {
      if (hienLoading) setLoading(false);
    }

    return null;
  }, []);

  useEffect(() => {
    taiDanhSachBaiTap();
  }, [taiDanhSachBaiTap]);

  const getQuestionIndexMap = (cauHoiList) => {
    if (!cauHoiList) return [];
    const map = [];
    cauHoiList.forEach((q, idx) => {
      // In the new BE structure, reading passages are not grouped by default.
      // For now, we treat every question independently.
      map.push({ dataIndex: idx, type: q.noiDung?.loai || "multiple-choice", subIndex: null });
    });
    return map;
  };

  const getTotalQuestions = () => {
    if (!selectedAssignment || !selectedAssignment.cauHoi) return 0;
    return getQuestionIndexMap(selectedAssignment.cauHoi).length;
  };

  const getCurrentQuestionData = () => {
    if (!selectedAssignment || !selectedAssignment.cauHoi) return null;
    const map = getQuestionIndexMap(selectedAssignment.cauHoi);
    if (currentQuestion >= map.length) return null;
    const mapEntry = map[currentQuestion];
    
    // Convert BE model to props for QuestionTypes
    const qData = selectedAssignment.cauHoi[mapEntry.dataIndex];
    return {
      ...qData.noiDung, 
      id: qData.maCauHoiDe,
      diemCuaCau: qData.diemCuaCau,
      currentSubIndex: mapEntry.subIndex,
      type: mapEntry.type,
    };
  };

  useEffect(() => {
    let timer;
    if (view === "test" && timeLeft > 0 && !showResults) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, timeLeft, showResults]);

  useEffect(() => {
    setIsTestActive(view === "test" && !showResults);
  }, [view, setIsTestActive, showResults]);

  useEffect(() => () => setIsTestActive(false), [setIsTestActive]);

  useEffect(() => {
    if (view === "test" && !showResults) {
      const requestFullscreen = async () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      };
      requestFullscreen();
    } else {
      const exitFullscreen = async () => {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
          } else if (document.msExitFullscreen) {
            await document.msExitFullscreen();
          }
        }
      };
      exitFullscreen();
    }
  }, [view, showResults]);

  const getQuestionStatus = (index) => {
    if (markedForReview[index]) return "marked";
    if (answers[index] !== undefined && answers[index] !== null && answers[index] !== "") return "answered";
    return "unanswered";
  };

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  const toggleMarkForReview = (index) => {
    setMarkedForReview((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  /**
   * Nộp bài lên backend. `answers` được đánh chỉ số theo THỨ TỰ CÂU trên màn
   * hình, còn backend cần mã câu hỏi, nên phải ánh xạ lại qua bảng chỉ số.
   */
  const handleSubmitAssignment = async () => {
    const map = getQuestionIndexMap(selectedAssignment?.cauHoi);
    const cauTraLoi = map
      .map((entry, index) => {
        const question = selectedAssignment.cauHoi[entry.dataIndex];
        if (!question) {
          return null;
        }
        return {
          maCauHoiDe: question.maCauHoiDe,
          dapAn: answers[index] ?? null,
          danhDauXemLai: Boolean(markedForReview[index]),
        };
      })
      .filter(Boolean);

    const durationSeconds = (selectedAssignment?.thoiGianLamBai || 60) * 60;

    setLoading(true);
    try {
      const res = await submitStudentAssignment(selectedAssignment.id, {
        thoiGianThucTeGiay: Math.max(0, durationSeconds - timeLeft),
        cauTraLoi,
      });

      if (!res.success) {
        toast.error(res.message || "Không thể nộp bài.");
        return;
      }

      setSubmitResult(res.data);
      setShowResults(true);
      toast.success("Đã nộp bài.");

      // Nộp xong phải lấy lại trạng thái từ backend ngay. Nếu chỉ hiện kết quả
      // rồi giữ nguyên danh sách cũ thì bài vẫn mang trạng thái "Đang mở",
      // học sinh bấm vào làm lại được và chỉ bị chặn khi nộp lần nữa.
      const danhSachMoi = await taiDanhSachBaiTap({ hienLoading: false });
      const baiVuaNop = danhSachMoi?.find((x) => x.id === selectedAssignment.id);
      if (baiVuaNop) {
        setSelectedAssignment((prev) => (prev ? { ...prev, ...baiVuaNop } : prev));
      }
    } catch (error) {
      toast.error("Lỗi kết nối khi nộp bài.");
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    if (!selectedAssignment || !selectedAssignment.id) return;

    // Chưa tới giờ, đã hết hạn, hoặc đã dùng hết lượt nộp thì không cho vào làm.
    if (selectedAssignment.canStart === false) {
      const lyDo = {
        "Đã hết hạn": "Bài này đã quá hạn nộp.",
        "Đã nộp": "Bạn đã dùng hết số lần nộp cho bài này.",
        "Chưa tới giờ": "Bài này chưa tới giờ làm.",
      };
      toast.error(lyDo[selectedAssignment.status] || "Bài này hiện không làm được.");
      return;
    }

    setLoading(true);
    try {
      const res = await getStudentAssignmentDetails(selectedAssignment.id);
      if (res.success) {
        setSelectedAssignment({ ...selectedAssignment, ...res.data });
        setView("test");
        setCurrentQuestion(0);
        setAnswers({});
        setMarkedForReview({});
        setTimeLeft(res.data.thoiGianLamBai ? res.data.thoiGianLamBai * 60 : 60 * 60);
        setShowResults(false);
      } else {
        toast.error(res.message || "Lỗi tải chi tiết bài tập");
      }
    } catch (error) {
      toast.error("Lỗi tải đề thi");
    } finally {
      setLoading(false);
    }
  };

  const goToDetails = (assignment) => {
    setSelectedAssignment(assignment);
    setView("details");
  };

  /**
   * Xem lại kết quả của lần nộp gần nhất.
   *
   * Trước đây màn kết quả chỉ xuất hiện ngay sau khi bấm nộp; rời đi là không
   * còn đường quay lại, nên đáp án và giải thích giáo viên đã bật cho xem trở
   * thành không xem được.
   */
  const xemKetQua = async () => {
    if (!selectedAssignment?.id) return;

    setLoading(true);
    try {
      const res = await getStudentAssignmentResult(selectedAssignment.id);
      if (!res.success || !res.data) {
        toast.error(res.message || "Chưa có kết quả cho bài này.");
        return;
      }
      setSubmitResult(res.data);
      setShowResults(true);
      setView("test");
    } catch (error) {
      toast.error("Lỗi tải kết quả bài làm.");
    } finally {
      setLoading(false);
    }
  };

  const goToList = () => {
    setView("list");
    setSelectedAssignment(null);
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < getTotalQuestions() - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  if (view === "list") {
    return (
      <AssignmentList
        assignments={assignments}
        onViewDetails={goToDetails}
      />
    );
  }

  if (view === "details" && selectedAssignment) {
    return (
      <AssignmentDetails
        assignment={selectedAssignment}
        onBack={goToList}
        onStartTest={startTest}
        onViewResult={xemKetQua}
      />
    );
  }

  if (view === "test" && selectedAssignment) {
    const totalQuestions = getTotalQuestions();
    const currentQData = getCurrentQuestionData();

    if (showResults) {
      return (
        <ResultsPage
          assignment={selectedAssignment}
          result={submitResult}
          onBackToList={() => {
            setShowResults(false);
            setSubmitResult(null);
            goToList();
          }}
        />
      );
    }

    return (
      <div style={{ fontFamily: "'Montserrat', sans-serif", backgroundColor: "#F3F4F6", minHeight: "100vh" }}>
        <TestHeader
          title={selectedAssignment?.title || "PRACTICE TEST"}
          timeLeft={timeLeft}
          onSubmitClick={() => setShowSubmissionConfirm(true)}
        />

        <div className="d-flex" style={{ minHeight: "calc(100vh - 80px)" }}>
          <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              flex: 1
            }}>
              {currentQData && (
                <QuestionTypes
                  question={currentQData}
                  assignment={selectedAssignment}
                  currentQuestion={currentQuestion}
                  currentSubIndex={currentQData.currentSubIndex}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                />
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", backgroundColor: "#FFFFFF", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentQuestion === 0}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "2px solid #E5E7EB",
                    backgroundColor: "#FFFFFF",
                    color: "#374151",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: currentQuestion === 0 ? "not-allowed" : "pointer",
                    opacity: currentQuestion === 0 ? 0.5 : 1
                  }}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Câu trước
                </button>
                <button
                  onClick={() => toggleMarkForReview(currentQuestion)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: `2px solid ${markedForReview[currentQuestion] ? "#F59E0B" : "#E5E7EB"}`,
                    backgroundColor: markedForReview[currentQuestion] ? "#FEF3C7" : "#FFFFFF",
                    color: markedForReview[currentQuestion] ? "#92400E" : "#374151",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <i className={`bi ${markedForReview[currentQuestion] ? "bi-bookmark-check-fill" : "bi-bookmark"} me-2`}></i>
                  {markedForReview[currentQuestion] ? "Đã đánh dấu" : "Đánh dấu xem lại"}
                </button>
              </div>
              <button
                onClick={handleNextQuestion}
                disabled={currentQuestion === totalQuestions - 1}
                style={{
                  padding: "10px 32px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: currentQuestion === totalQuestions - 1 ? "not-allowed" : "pointer",
                  opacity: currentQuestion === totalQuestions - 1 ? 0.5 : 1
                }}
              >
                Câu sau
                <i className="bi bi-arrow-right ms-2"></i>
              </button>
            </div>

            <div style={{ backgroundColor: "#FFFFFF", padding: "16px 24px", borderRadius: "12px", marginTop: "16px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                Ghi chú: khi học viên chọn đáp án, đã chọn đáp án đổi nền xanh nhạt, số câu bên phải chuyển sang trạng thái đã làm và bài tự động lưu.
              </p>
            </div>
          </div>

          <QuestionNavigator
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            onQuestionClick={setCurrentQuestion}
            getQuestionStatus={getQuestionStatus}
            markedForReview={markedForReview}
            onToggleMarkForReview={toggleMarkForReview}
          />
        </div>

        <SubmissionConfirm
          show={showSubmissionConfirm}
          onClose={() => setShowSubmissionConfirm(false)}
          onConfirm={() => {
            setShowSubmissionConfirm(false);
            handleSubmitAssignment();
          }}
          totalQuestions={totalQuestions}
          answers={answers}
          markedForReview={markedForReview}
        />
      </div>
    );
  }

  return null;
};

export default StudentAssignmentPage;
