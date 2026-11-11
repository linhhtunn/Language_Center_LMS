import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  CheckCircle,
  Clock3,
  Save,
  Search,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';

const DIFFICULTY_META = {
  EASY: { label: 'Dễ', tone: 'success', weight: 1 },
  MEDIUM: { label: 'Trung bình', tone: 'warning', weight: 1.25 },
  HARD: { label: 'Khó', tone: 'danger', weight: 1.5 },
};

const QUESTION_TYPE_META = {
  TRAC_NGHIEM: { label: 'Trắc nghiệm', tone: 'primary' },
  DIEN_KHUYET: { label: 'Điền khuyết', tone: 'info' },
  DOC_HIEU: { label: 'Đọc hiểu', tone: 'secondary' },
  MATCHING: { label: 'Nối/Ghép', tone: 'success' },
  TRANSFORMATION: { label: 'Viết lại câu', tone: 'dark' },
  TU_LUAN: { label: 'Tự luận', tone: 'danger' },
  TU_LUAN_NGAN: { label: 'Tự luận ngắn', tone: 'warning' },
};

const SCORE_MODE_LABELS = {
  AUTO_EQUAL: 'Chia đều',
  AUTO_BY_DIFFICULTY: 'Theo mức độ',
  MANUAL: 'Nhập tay',
};

const createLegacyAssignment = ({ maBaiTap = 'EX-01', tenBaiTap = 'Đề thi' }) => ({
  id: maBaiTap,
  code: maBaiTap,
  title: tenBaiTap,
  description: '',
  courseId: '',
  courseName: '',
  assignmentKind: 'HOMEWORK',
  selectedClassIds: [],
  selectedQuestions: [],
  publishMode: 'DRAFT',
  durationMinutes: 0,
  totalScore: 10,
  maxAttempts: 1,
  openAt: '',
  dueAt: '',
  allowLateSubmission: false,
  showScoreWhenDone: false,
  showAnswerAfterDeadline: false,
  shuffleQuestions: true,
  shuffleAnswers: true,
  autoGradeObjective: true,
  requireManualReview: true,
  accessCode: '',
  scoreMode: 'AUTO_BY_DIFFICULTY',
  submissionStats: { totalStudents: 0, submitted: 0, lateSubmitted: 0, needsGrading: 0 },
  updatedAt: new Date().toISOString(),
});

const roundScoreDistribution = (questions, totalScore, getWeight) => {
  if (!questions.length) {
    return [];
  }

  const safeTotal = Number(totalScore) || 0;
  const weights = questions.map((question) => getWeight(question));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const rawScores = weights.map((weight) => (safeTotal * weight) / totalWeight);
  const floorScores = rawScores.map((value) => Math.floor(value * 100) / 100);
  const baseSum = floorScores.reduce((sum, value) => sum + value, 0);
  let remainingCents = Math.round((safeTotal - baseSum) * 100);

  const rankedFractions = rawScores
    .map((value, index) => ({ index, fraction: value - floorScores[index] }))
    .sort((first, second) => second.fraction - first.fraction);

  const adjustedScores = [...floorScores];
  let cursor = 0;
  while (remainingCents > 0 && rankedFractions.length) {
    const target = rankedFractions[cursor % rankedFractions.length];
    adjustedScores[target.index] = Number((adjustedScores[target.index] + 0.01).toFixed(2));
    remainingCents -= 1;
    cursor += 1;
  }

  return adjustedScores;
};

const normalizeQuestionSet = (questions, totalScore, scoreMode) => {
  if (scoreMode === 'MANUAL') {
    return questions.map((question, index) => ({
      ...question,
      order: index + 1,
      score: Number(question.score || 0),
    }));
  }

  const distributedScores = roundScoreDistribution(questions, totalScore, (question) => {
    if (scoreMode === 'AUTO_BY_DIFFICULTY') {
      const difficultyWeight = DIFFICULTY_META[question.difficulty]?.weight || 1;
      const essayWeight = question.objective ? 0 : 0.35;
      return difficultyWeight + essayWeight;
    }
    return 1;
  });

  return questions.map((question, index) => ({
    ...question,
    order: index + 1,
    score: distributedScores[index],
  }));
};

const cloneAssignment = (assignment) => ({
  ...assignment,
  selectedClassIds: [...(assignment.selectedClassIds || [])],
  selectedQuestions: (assignment.selectedQuestions || []).map((item) => ({ ...item })),
  submissionStats: { ...(assignment.submissionStats || {}) },
});

const formatDateTime = (value) => {
  if (!value) {
    return 'Chưa đặt lịch';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const calculateClosingTime = (openAt, durationMinutes) => {
  if (!openAt || !durationMinutes) return '';
  const openDate = new Date(openAt);
  const closingDate = new Date(openDate.getTime() + durationMinutes * 60000);
  return closingDate.toISOString().slice(0, 16);
};

const buildPayloadPreview = (draft) => {
  const closingTime = draft.assignmentKind !== 'HOMEWORK' ? calculateClosingTime(draft.openAt, draft.durationMinutes) : '';
  
  return {
    baitap: {
      MaBaiTap: draft.id,
      MaKhoaHoc: draft.courseId,
      TenBaiTap: draft.title,
      MoTa: draft.description,
      LoaiBaiTap: draft.assignmentKind,
    ThoiGianLamBai: draft.assignmentKind !== 'HOMEWORK' ? draft.durationMinutes : 0,
      DiemToiDa: draft.totalScore,
      TrangThai: true,
    },
    baitapcauhoi: draft.selectedQuestions.map((question) => ({
      MaBaiTap: draft.id,
      MaCauHoi: question.id,
      ThuTu: question.order,
      DiemCuaCau: Number(question.score || 0),
    })),
    sukienlophoc: draft.selectedClassIds.map((classId) => ({
      MaLopHoc: classId,
      MaBaiTap: draft.id,
      DangSuKien: draft.assignmentKind === 'EXAM' ? 'TO_CHUC_THI' : 'GIAO_BAI',
      HanNop: draft.assignmentKind === 'HOMEWORK' ? draft.dueAt : closingTime,
      MaTrangThai: draft.publishMode,
    })),
    azotaConfig: {
      scoreMode: draft.scoreMode,
      shuffleQuestions: draft.shuffleQuestions,
      shuffleAnswers: draft.shuffleAnswers,
      autoGradeObjective: draft.autoGradeObjective,
      requireManualReview: draft.requireManualReview,
      showScoreWhenDone: draft.showScoreWhenDone,
      showAnswerAfterDeadline: draft.showAnswerAfterDeadline,
      allowLateSubmission: draft.allowLateSubmission,
      accessCode: draft.accessCode,
    },
  };
};

const validateDraft = (draft) => {
  const errors = [];
  const warnings = [];
  const manualTotal = draft.selectedQuestions.reduce((sum, question) => sum + Number(question.score || 0), 0);

  if (!draft.title.trim()) {
    errors.push('Chưa có tên đầu bài.');
  }

  if (!draft.courseId) {
    errors.push('Chưa gán khóa học cho đầu bài.');
  }

  if (!draft.selectedQuestions.length) {
    errors.push('Cần chọn ít nhất 1 câu hỏi trong ngân hàng.');
  }

  if (!draft.selectedClassIds.length) {
    errors.push('Cần chọn ít nhất 1 lớp học để giao bài.');
  }

  if (!draft.openAt) {
    errors.push('Cần đặt giờ mở bài.');
  }

  if (draft.assignmentKind !== 'HOMEWORK') {
    if (!draft.durationMinutes || draft.durationMinutes <= 0) {
      errors.push('Thời gian làm bài phải lớn hơn 0.');
    }
  } else {
    if (!draft.dueAt) {
      errors.push('Cần đặt hạn nộp cho bài tập.');
    }
    if (draft.openAt && draft.dueAt && new Date(draft.dueAt) <= new Date(draft.openAt)) {
      errors.push('Hạn nộp phải sau giờ mở bài.');
    }
  }

  if (draft.scoreMode === 'MANUAL' && Math.abs(manualTotal - Number(draft.totalScore || 0)) > 0.01) {
    errors.push('Tổng điểm từng câu chưa bằng tổng điểm của đề.');
  }

  if (draft.assignmentKind === 'EXAM' && draft.maxAttempts > 1) {
    warnings.push('Đề thi thường chỉ nên cho phép 1 lần nộp để tránh sai nghiệp vụ.');
  }

  if (draft.assignmentKind === 'EXAM' && draft.showScoreWhenDone) {
    warnings.push('Đề thi đang bật xem điểm ngay sau nộp, điều này khác thực tế Azota cho kỳ thi cần bảo mật.');
  }

  if (!draft.selectedQuestions.some((question) => !question.objective) && draft.requireManualReview) {
    warnings.push('Tất cả câu hỏi hiện tại đều chấm tự động, có thể tắt chấm tay để đơn giản hóa quy trình.');
  }

  return { errors, warnings, manualTotal };
};

const AssignAssignmentContentModern = ({
  assignment,
  courses = [],
  classes = [],
  questionBank = [],
  onBack,
  onSave,
  maBaiTap,
  tenBaiTap,
}) => {
  const baseAssignment = assignment || createLegacyAssignment({ maBaiTap, tenBaiTap });
  const [draft, setDraft] = useState(cloneAssignment(baseAssignment));
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [saveState, setSaveState] = useState({ saving: false, success: false, message: '' });

  useEffect(() => {
    console.log('DEBUG: draft.assignmentKind =', draft.assignmentKind);
  }, [draft.assignmentKind]);

  const availableQuestions = useMemo(() => {
    const selectedIds = new Set(draft.selectedQuestions.map((question) => question.id));
    return questionBank
      .filter((question) => !selectedIds.has(question.id))
      .filter((question) => !draft.courseId || question.courseId === draft.courseId)
      .filter((question) => difficultyFilter === 'ALL' || question.difficulty === difficultyFilter)
      .filter((question) => typeFilter === 'ALL' || question.questionType === typeFilter)
      .filter((question) => question.content.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [difficultyFilter, draft.courseId, draft.selectedQuestions, questionBank, searchTerm, typeFilter]);

  const relevantClasses = useMemo(
    () => classes.filter((item) => !draft.courseId || item.courseId === draft.courseId),
    [classes, draft.courseId],
  );

  const matrix = useMemo(() => {
    return draft.selectedQuestions.reduce(
      (summary, question) => {
        summary.totalQuestions += 1;
        summary.totalMinutes += Number(question.estimatedMinutes || 0);
        summary.totalScore += Number(question.score || 0);
        summary.difficulty[question.difficulty] = (summary.difficulty[question.difficulty] || 0) + 1;
        summary.type[question.questionType] = (summary.type[question.questionType] || 0) + 1;
        return summary;
      },
      {
        totalQuestions: 0,
        totalMinutes: 0,
        totalScore: 0,
        difficulty: { EASY: 0, MEDIUM: 0, HARD: 0 },
        type: {},
      },
    );
  }, [draft.selectedQuestions]);

  const review = useMemo(() => validateDraft(draft), [draft]);
  const payloadPreview = useMemo(() => buildPayloadPreview(draft), [draft]);

  const handleQuestionUpdate = (nextQuestions, scoreMode = draft.scoreMode, totalScore = draft.totalScore) => {
    setDraft((prev) => ({
      ...prev,
      selectedQuestions: normalizeQuestionSet(nextQuestions, totalScore, scoreMode),
    }));
  };

  const addQuestion = (question) => {
    handleQuestionUpdate([...draft.selectedQuestions, { ...question }]);
  };

  const removeQuestion = (questionId) => {
    handleQuestionUpdate(draft.selectedQuestions.filter((question) => question.id !== questionId));
  };

  const moveQuestion = (index, direction) => {
    const nextQuestions = [...draft.selectedQuestions];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= nextQuestions.length) {
      return;
    }
    [nextQuestions[index], nextQuestions[targetIndex]] = [nextQuestions[targetIndex], nextQuestions[index]];
    handleQuestionUpdate(nextQuestions);
  };

  const updateManualScore = (questionId, value) => {
    const nextQuestions = draft.selectedQuestions.map((question) =>
      question.id === questionId ? { ...question, score: Number(value) } : question,
    );
    setDraft((prev) => ({
      ...prev,
      selectedQuestions: normalizeQuestionSet(nextQuestions, prev.totalScore, 'MANUAL'),
    }));
  };

  const toggleClass = (classId) => {
    setDraft((prev) => {
      const nextClassIds = prev.selectedClassIds.includes(classId)
        ? prev.selectedClassIds.filter((item) => item !== classId)
        : [...prev.selectedClassIds, classId];
      return { ...prev, selectedClassIds: nextClassIds };
    });
  };

  const handleScoreModeChange = (scoreMode) => {
    setDraft((prev) => ({
      ...prev,
      scoreMode,
      selectedQuestions: normalizeQuestionSet(prev.selectedQuestions, prev.totalScore, scoreMode),
    }));
  };

  const handleSave = () => {
    if (review.errors.length) {
      setSaveState({ saving: false, success: false, message: 'Cần xử lý hết các lỗi nghiệp vụ trước khi lưu.' });
      return;
    }

    const normalized = {
      ...draft,
      selectedQuestions: normalizeQuestionSet(draft.selectedQuestions, draft.totalScore, draft.scoreMode),
      submissionStats: {
        ...draft.submissionStats,
        totalStudents: relevantClasses
          .filter((item) => draft.selectedClassIds.includes(item.id))
          .reduce((sum, item) => sum + item.students, 0),
      },
      updatedAt: new Date().toISOString(),
    };

    setSaveState({ saving: true, success: false, message: '' });
    window.setTimeout(() => {
      onSave?.(normalized);
      setDraft(normalized);
      setSaveState({ saving: false, success: true, message: 'Đã lưu cấu hình đề và payload giao bài.' });
    }, 500);
  };

  return (
    <div className="container-fluid p-4 bg-light min-vh-100">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <button className="btn btn-light border mb-3" onClick={onBack}>
            <ArrowLeft size={16} className="me-2" />
            Quay lại danh sách
          </button>
          <div className="small text-uppercase text-primary fw-semibold mb-2">Exam Builder</div>
          <h3 className="fw-bold mb-1">{draft.title || draft.code}</h3>
          <div className="text-muted">
            {draft.courseName || 'Chưa gán khóa học'} · {draft.assignmentKind} · Quy tắc điểm: {SCORE_MODE_LABELS[draft.scoreMode]}
          </div>
        </div>

        <div className="text-end">
          <button className="btn btn-primary px-4" onClick={handleSave}>
            <Save size={16} className="me-2" />
            {saveState.saving ? 'Đang lưu...' : 'Lưu cấu hình đề'}
          </button>
          {saveState.message && (
            <div className={`small mt-2 ${saveState.success ? 'text-success' : 'text-danger'}`}>
              {saveState.message}
            </div>
          )}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Tổng câu</div><div className="display-6 fw-bold">{matrix.totalQuestions}</div></div></div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Tổng điểm</div><div className="display-6 fw-bold text-danger">{matrix.totalScore.toFixed(2)}</div></div></div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Ước tính thời gian câu hỏi</div><div className="display-6 fw-bold text-primary">{matrix.totalMinutes}'</div></div></div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Lớp nhận bài</div><div className="display-6 fw-bold text-success">{draft.selectedClassIds.length}</div></div></div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="fw-bold mb-3">Ngân hàng câu hỏi</h5>
              <div className="row g-2">
                <div className="col-12">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0"><Search size={16} /></span>
                    <input className="form-control border-start-0" placeholder="Tìm nội dung câu hỏi..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                  </div>
                </div>
                <div className="col-6">
                  <select className="form-select" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
                    <option value="ALL">Tất cả mức độ</option>
                    <option value="EASY">Dễ</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HARD">Khó</option>
                  </select>
                </div>
                <div className="col-6">
                  <select className="form-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="ALL">Tất cả loại</option>
                    {Object.keys(QUESTION_TYPE_META).map((type) => (
                      <option key={type} value={type}>{QUESTION_TYPE_META[type].label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="card-body bg-light">
              <div className="small text-muted mb-3">Có {availableQuestions.length} câu hỏi phù hợp khóa học và bộ lọc hiện tại.</div>
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                {availableQuestions.map((question) => {
                  const difficultyMeta = DIFFICULTY_META[question.difficulty];
                  const typeMeta = QUESTION_TYPE_META[question.questionType];
                  return (
                    <div key={question.id} className="bg-white border rounded-3 p-3 shadow-sm">
                      <div className="d-flex justify-content-between gap-3">
                        <div>
                          <div className="d-flex flex-wrap gap-2 mb-2">
                            <span className={`badge bg-${typeMeta.tone}-subtle text-${typeMeta.tone}`}>{typeMeta.label}</span>
                            <span className={`badge bg-${difficultyMeta.tone}-subtle text-${difficultyMeta.tone}`}>{difficultyMeta.label}</span>
                            <span className="badge bg-light text-dark border">{question.topic}</span>
                          </div>
                          <div className="fw-medium">{question.content}</div>
                          <div className="small text-muted mt-2">{question.id} · {question.source} · {question.estimatedMinutes} phut</div>
                        </div>
                        <button className="btn btn-outline-primary align-self-start" onClick={() => addQuestion(question)}>Thêm</button>
                      </div>
                    </div>
                  );
                })}

                {availableQuestions.length === 0 && (
                  <div className="text-center py-5 text-muted">Không còn câu hỏi nào phù hợp để bổ sung.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-1">Cấu trúc đề đang chọn</h5>
                <div className="small text-muted">Kéo theo workflow Azota: xếp thứ tự, tính điểm, chấm tự động và chấm tay.</div>
              </div>
              <select className="form-select" style={{ width: '220px' }} value={draft.scoreMode} onChange={(event) => handleScoreModeChange(event.target.value)}>
                {Object.entries(SCORE_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted">
                    <th className="text-center">STT</th>
                    <th>Câu hỏi</th>
                    <th className="text-center">Điểm</th>
                    <th className="text-center">Điều chỉnh</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.selectedQuestions.map((question, index) => {
                    const difficultyMeta = DIFFICULTY_META[question.difficulty];
                    const typeMeta = QUESTION_TYPE_META[question.questionType];
                    return (
                      <tr key={question.id}>
                        <td className="text-center fw-bold">{question.order}</td>
                        <td>
                          <div className="fw-medium">{question.content}</div>
                          <div className="small text-muted mt-1">
                            <span className={`badge bg-${typeMeta.tone}-subtle text-${typeMeta.tone} me-2`}>{typeMeta.label}</span>
                            <span className={`badge bg-${difficultyMeta.tone}-subtle text-${difficultyMeta.tone}`}>{difficultyMeta.label}</span>
                          </div>
                        </td>
                        <td className="text-center" style={{ minWidth: '120px' }}>
                          {draft.scoreMode === 'MANUAL' ? (
                            <input type="number" className="form-control text-center" value={question.score} onChange={(event) => updateManualScore(question.id, event.target.value)} />
                          ) : (
                            <span className="fw-semibold text-danger">{Number(question.score || 0).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="btn-group">
                            <button className="btn btn-sm btn-light border" onClick={() => moveQuestion(index, -1)}><ArrowUp size={14} /></button>
                            <button className="btn btn-sm btn-light border" onClick={() => moveQuestion(index, 1)}><ArrowDown size={14} /></button>
                            <button className="btn btn-sm btn-light border text-danger" onClick={() => removeQuestion(question.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {draft.selectedQuestions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">Chưa có câu hỏi nào trong đề.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row g-4 mt-1">
            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0"><h6 className="fw-bold mb-0"><Settings2 size={16} className="me-2" />Cài đặt phát hành</h6></div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Loại</label>
                    <select className="form-select" value={draft.assignmentKind} onChange={(event) => setDraft((prev) => ({ ...prev, assignmentKind: event.target.value }))}>
                      <option value="EXAM">Đề thi</option>
                      <option value="QUIZ">Kiểm tra nhanh</option>
                      <option value="HOMEWORK">Bài tập</option>
                    </select>
                  </div>
                  {draft.assignmentKind !== 'HOMEWORK' && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Thời gian làm bài (phút)</label>
                      <input type="number" className="form-control" value={draft.durationMinutes} onChange={(event) => setDraft((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))} />
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Tổng điểm</label>
                    <input
                      type="number"
                      className="form-control"
                      value={draft.totalScore}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          totalScore: Number(event.target.value),
                          selectedQuestions:
                            prev.scoreMode === 'MANUAL'
                              ? prev.selectedQuestions
                              : normalizeQuestionSet(prev.selectedQuestions, Number(event.target.value), prev.scoreMode),
                        }))
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Giờ mở bài</label>
                    <input type="datetime-local" className="form-control" value={draft.openAt} onChange={(event) => setDraft((prev) => ({ ...prev, openAt: event.target.value }))} />
                  </div>
                  {draft.assignmentKind !== 'ASSIGNMENT' && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Giờ đóng bài (tính tự động)</label>
                      <input 
                        type="datetime-local" 
                        className="form-control bg-light" 
                        value={calculateClosingTime(draft.openAt, draft.durationMinutes)} 
                        disabled 
                      />
                    </div>
                  )}
                  {draft.assignmentKind === 'HOMEWORK' && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Hạn nộp</label>
                      <input type="datetime-local" className="form-control" value={draft.dueAt} onChange={(event) => setDraft((prev) => ({ ...prev, dueAt: event.target.value }))} />
                    </div>
                  )}
                  <div className="small text-muted">
                    {draft.assignmentKind === 'HOMEWORK' 
                      ? `Mở bài: ${formatDateTime(draft.openAt)} · Hạn nộp: ${formatDateTime(draft.dueAt)}`
                      : `Mở bài: ${formatDateTime(draft.openAt)} · Đóng bài: ${formatDateTime(calculateClosingTime(draft.openAt, draft.durationMinutes))}`
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0"><h6 className="fw-bold mb-0"><Users size={16} className="me-2" />Gán lớp nhận bài</h6></div>
                <div className="card-body">
                  <div className="d-flex flex-column gap-2">
                    {relevantClasses.map((item) => (
                      <label key={item.id} className="border rounded-3 p-3 bg-light d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-medium">{item.name}</div>
                          <div className="small text-muted">{item.teacher} · {item.students} học viên</div>
                        </div>
                        <input type="checkbox" className="form-check-input fs-5" checked={draft.selectedClassIds.includes(item.id)} onChange={() => toggleClass(item.id)} />
                      </label>
                    ))}
                    {relevantClasses.length === 0 && <div className="text-muted">Không có lớp học nào thuộc khóa học hiện tại.</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0"><h6 className="fw-bold mb-0"><BarChart3 size={16} className="me-2" />Ma trận đề</h6></div>
                <div className="card-body">
                  <div className="row g-3 mb-3">
                    {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
                      <div key={key} className="col-4">
                        <div className={`rounded-3 p-3 bg-${meta.tone}-subtle text-center`}>
                          <div className={`small text-${meta.tone}`}>{meta.label}</div>
                          <div className="fw-bold fs-4">{matrix.difficulty[key]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="small text-muted">
                    Tổng điểm hiện tại: <b>{matrix.totalScore.toFixed(2)}</b> / {draft.totalScore}. Tổng thời gian ước tính của các câu: <b>{matrix.totalMinutes}</b> phút.
                  </div>
                  {draft.scoreMode === 'MANUAL' && (
                    <div className="small text-muted mt-2">Tổng điểm manual hiện tại: <b>{review.manualTotal.toFixed(2)}</b>.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0"><h6 className="fw-bold mb-0"><AlertTriangle size={16} className="me-2" />Kiểm tra nghiệp vụ</h6></div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="small fw-semibold text-danger mb-2">Lỗi cần xử lý</div>
                    {review.errors.length ? (
                      <ul className="small text-danger mb-0 ps-3">
                        {review.errors.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <div className="small text-success">Không có lỗi chặn lưu đề.</div>
                    )}
                  </div>
                  <div>
                    <div className="small fw-semibold text-warning mb-2">Cảnh báo</div>
                    {review.warnings.length ? (
                      <ul className="small text-warning-emphasis mb-0 ps-3">
                        {review.warnings.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <div className="small text-muted">Cấu hình hiện tại khá sát nghiệp vụ thực tế.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0"><h6 className="fw-bold mb-0"><Clock3 size={16} className="me-2" />Preview payload backend</h6></div>
                <div className="card-body">
                  <div className="small text-muted mb-2">Payload này đã được định dạng theo các bảng `baitap`, `baitapcauhoi`, `sukienlophoc` để sau này nối API thật.</div>
                  <pre className="bg-dark text-light rounded-3 p-3 mb-0" style={{ maxHeight: '320px', overflow: 'auto', fontSize: '12px' }}>
                    {JSON.stringify(payloadPreview, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignAssignmentContentModern;
