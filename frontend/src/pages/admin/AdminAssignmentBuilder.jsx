import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Clock3,
  Save,
  Search,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';

const DEFAULT_SCORE_MODE_LABELS = {
  AUTO_EQUAL: 'Chia deu',
  AUTO_BY_DIFFICULTY: 'Theo muc do',
  MANUAL: 'Nhap tay',
};

const buildFallbackDifficultyMeta = (code) => ({
  label: code || 'Khac',
  tone: 'secondary',
  weight: 1,
});

const buildFallbackQuestionTypeMeta = (code) => ({
  label: code || 'Khac',
  tone: 'secondary',
});

const cloneAssignment = (assignment) => ({
  ...assignment,
  selectedClassIds: [...(assignment.selectedClassIds || [])],
  selectedQuestions: (assignment.selectedQuestions || []).map((item) => ({ ...item })),
  submissionStats: { ...(assignment.submissionStats || {}) },
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

const normalizeQuestionSet = (questions, totalScore, scoreMode, difficultyMeta) => {
  if (scoreMode === 'MANUAL') {
    return questions.map((question, index) => ({
      ...question,
      order: index + 1,
      score: Number(question.score || 0),
    }));
  }

  const distributedScores = roundScoreDistribution(questions, totalScore, (question) => {
    if (scoreMode === 'AUTO_BY_DIFFICULTY') {
      const difficultyWeight = difficultyMeta[question.difficulty]?.weight || 1;
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

const formatDateTime = (value) => {
  if (!value) {
    return 'Chua dat lich';
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
  if (!openAt || !durationMinutes) {
    return '';
  }

  const openDate = new Date(openAt);
  const closingDate = new Date(openDate.getTime() + Number(durationMinutes || 0) * 60000);
  const year = closingDate.getFullYear();
  const month = String(closingDate.getMonth() + 1).padStart(2, '0');
  const day = String(closingDate.getDate()).padStart(2, '0');
  const hour = String(closingDate.getHours()).padStart(2, '0');
  const minute = String(closingDate.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const buildPayloadPreview = (draft) => ({
  Code: draft.code,
  TenBaiTap: draft.title,
  MoTa: draft.description,
  MaKhoaHoc: draft.courseId,
  LoaiBaiTapCode: draft.assignmentKind,
  PublishMode: draft.publishMode,
  ThoiGianLamBai: draft.assignmentKind === 'HOMEWORK' ? 0 : Number(draft.durationMinutes || 0),
  DiemToiDa: Number(draft.totalScore || 0),
  MaxAttempts: Number(draft.maxAttempts || 1),
  OpenAt: draft.openAt || null,
  DueAt: draft.assignmentKind === 'HOMEWORK' ? draft.dueAt || null : null,
  AllowLateSubmission: Boolean(draft.allowLateSubmission),
  ShowScoreWhenDone: Boolean(draft.showScoreWhenDone),
  ShowAnswerAfterDeadline: Boolean(draft.showAnswerAfterDeadline),
  ShuffleQuestions: Boolean(draft.shuffleQuestions),
  ShuffleAnswers: Boolean(draft.shuffleAnswers),
  AutoGradeObjective: Boolean(draft.autoGradeObjective),
  RequireManualReview: Boolean(draft.requireManualReview),
  AccessCode: draft.accessCode || null,
  ScoreMode: draft.scoreMode,
  SelectedClassIds: draft.selectedClassIds,
  SelectedQuestions: draft.selectedQuestions.map((question) => ({
    MaCauHoi: question.id,
    ThuTu: question.order,
    DiemCuaCau: Number(question.score || 0),
  })),
});

const validateDraft = (draft) => {
  const errors = [];
  const warnings = [];
  const manualTotal = draft.selectedQuestions.reduce((sum, question) => sum + Number(question.score || 0), 0);

  if (!draft.title.trim()) {
    errors.push('Chua co ten bai tap/de thi.');
  }

  if (!draft.courseId) {
    errors.push('Chua gan khoa hoc.');
  }

  if (!draft.selectedQuestions.length) {
    errors.push('Can chon it nhat 1 cau hoi tu ngan hang.');
  }

  if (!draft.selectedClassIds.length) {
    errors.push('Can chon it nhat 1 lop hoc de giao bai.');
  }

  if (!draft.openAt) {
    errors.push('Can dat gio mo bai.');
  }

  if (draft.assignmentKind !== 'HOMEWORK' && (!Number(draft.durationMinutes) || Number(draft.durationMinutes) <= 0)) {
    errors.push('Thoi gian lam bai phai lon hon 0.');
  }

  if (draft.assignmentKind === 'HOMEWORK') {
    if (!draft.dueAt) {
      errors.push('Can dat han nop cho bai tap.');
    }

    if (draft.openAt && draft.dueAt && new Date(draft.dueAt) <= new Date(draft.openAt)) {
      errors.push('Han nop phai sau gio mo bai.');
    }
  }

  if (!Number(draft.totalScore) || Number(draft.totalScore) <= 0) {
    errors.push('Tong diem phai lon hon 0.');
  }

  if (draft.scoreMode === 'MANUAL' && Math.abs(manualTotal - Number(draft.totalScore || 0)) > 0.01) {
    errors.push('Tong diem tung cau chua khop voi tong diem cua de.');
  }

  if (draft.assignmentKind === 'EXAM' && Number(draft.maxAttempts || 1) > 1) {
    warnings.push('De thi thuong chi nen cho 1 lan nop.');
  }

  if (!draft.selectedQuestions.some((question) => !question.objective) && draft.requireManualReview) {
    warnings.push('Tat ca cau hoi hien tai deu co the cham tu dong, co the tat cham tay neu muon.');
  }

  return { errors, warnings, manualTotal };
};

const AdminAssignmentBuilder = ({
  assignment,
  courses = [],
  classes = [],
  questionBank = [],
  onBack,
  onSave,
  questionTypeMeta = {},
  difficultyMeta = {},
  assignmentTypeOptions = [],
  publishModeOptions = [],
}) => {
  const [draft, setDraft] = useState(cloneAssignment(assignment));
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [saveState, setSaveState] = useState({ saving: false, success: false, message: '' });

  useEffect(() => {
    setDraft(cloneAssignment(assignment));
    setSaveState({ saving: false, success: false, message: '' });
  }, [assignment]);

  const courseLookup = useMemo(
    () => Object.fromEntries(courses.map((course) => [course.id, course])),
    [courses]
  );

  const resolvedDifficultyMeta = useMemo(() => {
    const fallback = {};
    questionBank.forEach((question) => {
      if (!fallback[question.difficulty]) {
        fallback[question.difficulty] = buildFallbackDifficultyMeta(question.difficulty);
      }
    });

    return { ...fallback, ...difficultyMeta };
  }, [difficultyMeta, questionBank]);

  const resolvedQuestionTypeMeta = useMemo(() => {
    const fallback = {};
    questionBank.forEach((question) => {
      if (!fallback[question.questionType]) {
        fallback[question.questionType] = buildFallbackQuestionTypeMeta(question.questionType);
      }
    });

    return { ...fallback, ...questionTypeMeta };
  }, [questionBank, questionTypeMeta]);

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
    [classes, draft.courseId]
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
        difficulty: Object.keys(resolvedDifficultyMeta).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
        type: {},
      }
    );
  }, [draft.selectedQuestions, resolvedDifficultyMeta]);

  const review = useMemo(() => validateDraft(draft), [draft]);
  const payloadPreview = useMemo(() => buildPayloadPreview(draft), [draft]);

  const handleQuestionUpdate = (nextQuestions, scoreMode = draft.scoreMode, totalScore = draft.totalScore) => {
    setDraft((prev) => ({
      ...prev,
      selectedQuestions: normalizeQuestionSet(nextQuestions, totalScore, scoreMode, resolvedDifficultyMeta),
    }));
  };

  const handleCourseChange = (courseId) => {
    const matchedCourse = courseLookup[courseId];

    setDraft((prev) => ({
      ...prev,
      courseId,
      courseName: matchedCourse?.name || '',
      selectedClassIds: prev.selectedClassIds.filter((classId) =>
        classes.some((item) => item.id === classId && item.courseId === courseId)
      ),
      selectedQuestions: normalizeQuestionSet(
        prev.selectedQuestions.filter((question) => !courseId || question.courseId === courseId),
        prev.totalScore,
        prev.scoreMode,
        resolvedDifficultyMeta
      ),
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
      question.id === questionId ? { ...question, score: Number(value) } : question
    );

    setDraft((prev) => ({
      ...prev,
      selectedQuestions: normalizeQuestionSet(nextQuestions, prev.totalScore, 'MANUAL', resolvedDifficultyMeta),
    }));
  };

  const toggleClass = (classId) => {
    setDraft((prev) => ({
      ...prev,
      selectedClassIds: prev.selectedClassIds.includes(classId)
        ? prev.selectedClassIds.filter((item) => item !== classId)
        : [...prev.selectedClassIds, classId],
    }));
  };

  const handleScoreModeChange = (scoreMode) => {
    setDraft((prev) => ({
      ...prev,
      scoreMode,
      selectedQuestions: normalizeQuestionSet(prev.selectedQuestions, prev.totalScore, scoreMode, resolvedDifficultyMeta),
    }));
  };

  const handleSave = async () => {
    if (review.errors.length) {
      setSaveState({ saving: false, success: false, message: 'Can xu ly het cac loi nghiep vu truoc khi luu.' });
      return;
    }

    const normalized = {
      ...draft,
      selectedQuestions: normalizeQuestionSet(draft.selectedQuestions, draft.totalScore, draft.scoreMode, resolvedDifficultyMeta),
      submissionStats: {
        ...draft.submissionStats,
        totalStudents: relevantClasses
          .filter((item) => draft.selectedClassIds.includes(item.id))
          .reduce((sum, item) => sum + Number(item.students || 0), 0),
      },
      updatedAt: new Date().toISOString(),
    };

    setSaveState({ saving: true, success: false, message: '' });

    try {
      const result = await Promise.resolve(onSave?.(normalized));
      setDraft(cloneAssignment(result || normalized));
      setSaveState({ saving: false, success: true, message: 'Da luu cau hinh bai tap/de thi.' });
    } catch (error) {
      setSaveState({
        saving: false,
        success: false,
        message: error?.message || 'Khong the luu cau hinh bai tap/de thi.',
      });
    }
  };

  return (
    <div className="container-fluid p-4 bg-light min-vh-100">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <button className="btn btn-light border mb-3" onClick={onBack}>
            <ArrowLeft size={16} className="me-2" />
            Quay lai danh sach
          </button>
          <div className="small text-uppercase text-primary fw-semibold mb-2">Admin Assignment Builder</div>
          <h3 className="fw-bold mb-1">{draft.title || draft.code || 'Cau hinh bai tap/de thi'}</h3>
          <div className="text-muted">
            {draft.courseName || 'Chua gan khoa hoc'} · {draft.assignmentKind} · Quy tac diem:{' '}
            {DEFAULT_SCORE_MODE_LABELS[draft.scoreMode] || draft.scoreMode}
          </div>
        </div>

        <div className="text-end">
          <button className="btn btn-primary px-4" onClick={handleSave} disabled={saveState.saving}>
            <Save size={16} className="me-2" />
            {saveState.saving ? 'Dang luu...' : 'Luu cau hinh'}
          </button>
          {saveState.message && (
            <div className={`small mt-2 ${saveState.success ? 'text-success' : 'text-danger'}`}>
              {saveState.message}
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-0">
          <h5 className="fw-bold mb-0">Thong tin co ban</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-lg-5">
              <label className="form-label fw-semibold">Ten bai tap/de thi</label>
              <input
                className="form-control"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Nhap ten de bai"
              />
            </div>
            <div className="col-lg-2">
              <label className="form-label fw-semibold">Ma</label>
              <input className="form-control bg-light" value={draft.code || ''} readOnly />
            </div>
            <div className="col-lg-2">
              <label className="form-label fw-semibold">Loai</label>
              <select
                className="form-select"
                value={draft.assignmentKind}
                onChange={(event) => setDraft((prev) => ({ ...prev, assignmentKind: event.target.value }))}
              >
                {assignmentTypeOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-3">
              <label className="form-label fw-semibold">Khoa hoc</label>
              <select className="form-select" value={draft.courseId} onChange={(event) => handleCourseChange(event.target.value)}>
                <option value="">Chon khoa hoc</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Mo ta</label>
              <textarea
                className="form-control"
                rows="3"
                value={draft.description || ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Mo ta muc tieu, huong dan giao bai, cach cham..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="small text-muted">Tong cau</div>
              <div className="display-6 fw-bold">{matrix.totalQuestions}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="small text-muted">Tong diem</div>
              <div className="display-6 fw-bold text-danger">{matrix.totalScore.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="small text-muted">Uoc tinh thoi gian</div>
              <div className="display-6 fw-bold text-primary">{matrix.totalMinutes}'</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="small text-muted">Lop nhan bai</div>
              <div className="display-6 fw-bold text-success">{draft.selectedClassIds.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="fw-bold mb-3">Ngan hang cau hoi</h5>
              <div className="row g-2">
                <div className="col-12">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Search size={16} />
                    </span>
                    <input
                      className="form-control border-start-0"
                      placeholder="Tim noi dung cau hoi..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <select className="form-select" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
                    <option value="ALL">Tat ca muc do</option>
                    {Object.entries(resolvedDifficultyMeta).map(([code, meta]) => (
                      <option key={code} value={code}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <select className="form-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="ALL">Tat ca loai</option>
                    {Object.entries(resolvedQuestionTypeMeta).map(([code, meta]) => (
                      <option key={code} value={code}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="card-body bg-light">
              <div className="small text-muted mb-3">Co {availableQuestions.length} cau hoi phu hop bo loc hien tai.</div>
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '700px', overflowY: 'auto' }}>
                {availableQuestions.map((question) => {
                  const difficulty = resolvedDifficultyMeta[question.difficulty] || buildFallbackDifficultyMeta(question.difficulty);
                  const questionType = resolvedQuestionTypeMeta[question.questionType] || buildFallbackQuestionTypeMeta(question.questionType);

                  return (
                    <div key={question.id} className="bg-white border rounded-3 p-3 shadow-sm">
                      <div className="d-flex justify-content-between gap-3">
                        <div>
                          <div className="d-flex flex-wrap gap-2 mb-2">
                            <span className={`badge bg-${questionType.tone}-subtle text-${questionType.tone}`}>{questionType.label}</span>
                            <span className={`badge bg-${difficulty.tone}-subtle text-${difficulty.tone}`}>{difficulty.label}</span>
                            <span className="badge bg-light text-dark border">{question.courseName || question.topic || 'Ngan hang cau hoi'}</span>
                          </div>
                          <div className="fw-medium">{question.content}</div>
                          <div className="small text-muted mt-2">
                            {question.id} · {question.source || 'Ngan hang cau hoi'} · {question.estimatedMinutes || 0} phut
                          </div>
                        </div>
                        <button className="btn btn-outline-primary align-self-start" onClick={() => addQuestion(question)}>
                          Them
                        </button>
                      </div>
                    </div>
                  );
                })}

                {availableQuestions.length === 0 && (
                  <div className="text-center py-5 text-muted">Khong con cau hoi nao phu hop de bo sung.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-1">Cau truc de dang chon</h5>
                <div className="small text-muted">Sap xep thu tu, tinh diem va kiem tra logic truoc khi giao bai.</div>
              </div>
              <select className="form-select" style={{ width: '220px' }} value={draft.scoreMode} onChange={(event) => handleScoreModeChange(event.target.value)}>
                {Object.entries(DEFAULT_SCORE_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted">
                    <th className="text-center">STT</th>
                    <th>Cau hoi</th>
                    <th className="text-center">Diem</th>
                    <th className="text-center">Dieu chinh</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.selectedQuestions.map((question, index) => {
                    const difficulty = resolvedDifficultyMeta[question.difficulty] || buildFallbackDifficultyMeta(question.difficulty);
                    const questionType = resolvedQuestionTypeMeta[question.questionType] || buildFallbackQuestionTypeMeta(question.questionType);

                    return (
                      <tr key={question.id}>
                        <td className="text-center fw-bold">{question.order}</td>
                        <td>
                          <div className="fw-medium">{question.content}</div>
                          <div className="small text-muted mt-1">
                            <span className={`badge bg-${questionType.tone}-subtle text-${questionType.tone} me-2`}>{questionType.label}</span>
                            <span className={`badge bg-${difficulty.tone}-subtle text-${difficulty.tone}`}>{difficulty.label}</span>
                          </div>
                        </td>
                        <td className="text-center" style={{ minWidth: '120px' }}>
                          {draft.scoreMode === 'MANUAL' ? (
                            <input
                              type="number"
                              className="form-control text-center"
                              value={question.score}
                              onChange={(event) => updateManualScore(question.id, event.target.value)}
                            />
                          ) : (
                            <span className="fw-semibold text-danger">{Number(question.score || 0).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="btn-group">
                            <button className="btn btn-sm btn-light border" onClick={() => moveQuestion(index, -1)}>
                              <ArrowUp size={14} />
                            </button>
                            <button className="btn btn-sm btn-light border" onClick={() => moveQuestion(index, 1)}>
                              <ArrowDown size={14} />
                            </button>
                            <button className="btn btn-sm btn-light border text-danger" onClick={() => removeQuestion(question.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {draft.selectedQuestions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">
                        Chua co cau hoi nao trong de.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row g-4 mt-1">
            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0">
                  <h6 className="fw-bold mb-0">
                    <Settings2 size={16} className="me-2" />
                    Cai dat phat hanh
                  </h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Che do phat hanh</label>
                    <select
                      className="form-select"
                      value={draft.publishMode}
                      onChange={(event) => setDraft((prev) => ({ ...prev, publishMode: event.target.value }))}
                    >
                      {publishModeOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {draft.assignmentKind !== 'HOMEWORK' && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Thoi gian lam bai (phut)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={draft.durationMinutes}
                        onChange={(event) => setDraft((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Tong diem</label>
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
                              : normalizeQuestionSet(prev.selectedQuestions, Number(event.target.value), prev.scoreMode, resolvedDifficultyMeta),
                        }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">So lan nop toi da</label>
                    <input
                      type="number"
                      className="form-control"
                      value={draft.maxAttempts}
                      onChange={(event) => setDraft((prev) => ({ ...prev, maxAttempts: Number(event.target.value) }))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Ma vao bai</label>
                    <input
                      className="form-control"
                      value={draft.accessCode || ''}
                      onChange={(event) => setDraft((prev) => ({ ...prev, accessCode: event.target.value }))}
                      placeholder="Khong bat buoc"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Gio mo bai</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={draft.openAt}
                      onChange={(event) => setDraft((prev) => ({ ...prev, openAt: event.target.value }))}
                    />
                  </div>

                  {draft.assignmentKind === 'HOMEWORK' ? (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Han nop</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={draft.dueAt}
                        onChange={(event) => setDraft((prev) => ({ ...prev, dueAt: event.target.value }))}
                      />
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">Gio dong bai (tu tinh)</label>
                      <input type="datetime-local" className="form-control bg-light" value={calculateClosingTime(draft.openAt, draft.durationMinutes)} disabled />
                    </div>
                  )}

                  <div className="small text-muted">
                    {draft.assignmentKind === 'HOMEWORK'
                      ? `Mo bai: ${formatDateTime(draft.openAt)} · Han nop: ${formatDateTime(draft.dueAt)}`
                      : `Mo bai: ${formatDateTime(draft.openAt)} · Dong bai: ${formatDateTime(calculateClosingTime(draft.openAt, draft.durationMinutes))}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0">
                  <h6 className="fw-bold mb-0">
                    <Users size={16} className="me-2" />
                    Gan lop nhan bai
                  </h6>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-column gap-2">
                    {relevantClasses.map((item) => (
                      <label key={item.id} className="border rounded-3 p-3 bg-light d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-medium">{item.name}</div>
                          <div className="small text-muted">
                            {item.teacher || 'Chua co giang vien'} · {item.students || 0} hoc vien
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="form-check-input fs-5"
                          checked={draft.selectedClassIds.includes(item.id)}
                          onChange={() => toggleClass(item.id)}
                        />
                      </label>
                    ))}

                    {relevantClasses.length === 0 && <div className="text-muted">Khong co lop hoc nao thuoc khoa hoc hien tai.</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0">
                  <h6 className="fw-bold mb-0">
                    <BarChart3 size={16} className="me-2" />
                    Ma tran de
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row g-3 mb-3">
                    {Object.entries(resolvedDifficultyMeta).map(([key, meta]) => (
                      <div key={key} className="col-4">
                        <div className={`rounded-3 p-3 bg-${meta.tone}-subtle text-center`}>
                          <div className={`small text-${meta.tone}`}>{meta.label}</div>
                          <div className="fw-bold fs-4">{matrix.difficulty[key] || 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="small text-muted">
                    Tong diem hien tai: <b>{matrix.totalScore.toFixed(2)}</b> / {draft.totalScore}. Tong thoi gian uoc tinh:{' '}
                    <b>{matrix.totalMinutes}</b> phut.
                  </div>
                  {draft.scoreMode === 'MANUAL' && (
                    <div className="small text-muted mt-2">
                      Tong diem manual hien tai: <b>{review.manualTotal.toFixed(2)}</b>.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0">
                  <h6 className="fw-bold mb-0">
                    <AlertTriangle size={16} className="me-2" />
                    Kiem tra nghiep vu
                  </h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="small fw-semibold text-danger mb-2">Loi can xu ly</div>
                    {review.errors.length ? (
                      <ul className="small text-danger mb-0 ps-3">
                        {review.errors.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="small text-success">Khong co loi chan luu de.</div>
                    )}
                  </div>

                  <div>
                    <div className="small fw-semibold text-warning mb-2">Canh bao</div>
                    {review.warnings.length ? (
                      <ul className="small text-warning-emphasis mb-0 ps-3">
                        {review.warnings.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="small text-muted">Cau hinh hien tai kha sat nghiep vu thuc te.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0">
                  <h6 className="fw-bold mb-0">
                    <Clock3 size={16} className="me-2" />
                    Preview payload backend
                  </h6>
                </div>
                <div className="card-body">
                  <div className="small text-muted mb-2">Payload nay la request thuc te se gui len API admin assignment.</div>
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

export default AdminAssignmentBuilder;
