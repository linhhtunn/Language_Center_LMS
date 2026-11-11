import React, { useCallback, useEffect, useState } from "react";
import {
  BookMarked, BarChart2, Database, Eye, FileText,
  Layers, RefreshCw, Search, Trash2, X,
  AlertCircle, CheckCircle, Zap
} from "lucide-react";
import toast from "react-hot-toast";
import adminAssignmentService from "../../api/adminAssignmentService";

const TABS = [
  { key: "assignments", label: "Danh sach de thi", icon: FileText },
  { key: "bank",        label: "Ngan hang cau hoi", icon: Database },
];

const diffBadge = (code) => {
  const map = {
    DE:         { bg: "#d1fae5", color: "#065f46", label: "De" },
    TRUNG_BINH: { bg: "#fef3c7", color: "#92400e", label: "TB" },
    KHO:        { bg: "#fee2e2", color: "#991b1b", label: "Kho" },
  };
  const d = map[code] ?? { bg: "#f3f4f6", color: "#374151", label: code || "—" };
  return React.createElement("span", { style: { background: d.bg, color: d.color, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 } }, d.label);
};

const statusBadge = (key) => {
  const map = {
    UPCOMING: { bg: "#ede9fe", color: "#6d28d9", label: "Sap mo" },
    OPEN:     { bg: "#d1fae5", color: "#065f46", label: "Dang mo" },
    CLOSED:   { bg: "#f3f4f6", color: "#6b7280", label: "Da dong" },
    DRAFT:    { bg: "#fef9c3", color: "#854d0e", label: "Ban nhap" },
  };
  const s = map[(key || "").toUpperCase()] ?? { bg: "#f3f4f6", color: "#6b7280", label: key || "—" };
  return React.createElement("span", { style: { background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 } }, s.label);
};

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("vi-VN");
};

const Skeleton = ({ h = 16, w = "100%", radius = 8 }) =>
  React.createElement("div", { style: { height: h, width: w, borderRadius: radius, background: "linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)", backgroundSize: "200% 100%", animation: "egm-shimmer 1.4s infinite" } });

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 };
const cardStyle = { background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "22px 24px" };
const badge = { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, display: "inline-block" };
const btnOutline = { background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 14px", fontWeight: 500, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnIcon   = { background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, borderRadius: 6, display: "flex" };
const btnIconSm = { background: "#f9fafb", border: "1px solid #e5e7eb", cursor: "pointer", color: "#374151", padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center" };
const searchWrap = { display: "flex", alignItems: "center", gap: 8, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", flex: 1, minWidth: 200 };
const searchInput = { border: "none", background: "transparent", outline: "none", padding: "8px 0", fontSize: 13, color: "#374151", width: "100%" };
const selectInput = { border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb", padding: "8px 12px", fontSize: 13, color: "#374151", cursor: "pointer", outline: "none" };
const emptyBox = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px" };

/* ─ Confirm Modal ─ */
const ConfirmModal = ({ open, title, message, onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return React.createElement("div", { style: overlay },
    React.createElement("div", { style: { ...cardStyle, maxWidth: 440, padding: 32, textAlign: "center" } },
      React.createElement(AlertCircle, { size: 40, color: "#ef4444", style: { marginBottom: 12 } }),
      React.createElement("h3", { style: { margin: "0 0 8px", fontSize: 18 } }, title),
      React.createElement("p", { style: { margin: "0 0 24px", color: "#6b7280", fontSize: 14 } }, message),
      React.createElement("div", { style: { display: "flex", gap: 12, justifyContent: "center" } },
        React.createElement("button", { onClick: onCancel, disabled: loading, style: btnOutline }, "Huy"),
        React.createElement("button", { onClick: onConfirm, disabled: loading, style: { ...btnOutline, background: "#ef4444", color: "#fff", border: "none" } }, loading ? "Dang xoa..." : "Xac nhan xoa")
      )
    )
  );
};

/* ─ Question Detail Modal ─ */
const QuestionDetailModal = ({ questionId, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!questionId) return;
    setLoading(true);
    adminAssignmentService.getQuestionDetail(questionId)
      .then(setDetail).catch(() => toast.error("Khong the tai chi tiet cau hoi.")).finally(() => setLoading(false));
  }, [questionId]);
  return React.createElement("div", { style: overlay },
    React.createElement("div", { style: { ...cardStyle, maxWidth: 620, maxHeight: "80vh", overflowY: "auto", padding: 28 } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 } },
        React.createElement("h3", { style: { margin: 0, fontSize: 17 } }, "Chi tiet cau hoi"),
        React.createElement("button", { onClick: onClose, style: btnIcon }, React.createElement(X, { size: 18 }))
      ),
      loading
        ? React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
            React.createElement(Skeleton, { h: 20 }), React.createElement(Skeleton, { h: 14, w: "60%" }), React.createElement(Skeleton, { h: 14 }))
        : !detail
          ? React.createElement("p", { style: { color: "#6b7280" } }, "Khong tim thay du lieu.")
          : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
              React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
                diffBadge(detail.mucDoCode),
                React.createElement("span", { style: { ...badge, background: "#eff6ff", color: "#1d4ed8" } }, detail.loaiCauHoiLabel || detail.loaiCauHoiCode),
                React.createElement("span", { style: { ...badge, background: "#f5f3ff", color: "#7c3aed" } }, detail.tenKhoaHoc)
              ),
              React.createElement("div", { style: { background: "#f9fafb", borderRadius: 10, padding: "14px 16px", fontSize: 15, lineHeight: 1.6 } }, detail.noiDungCauHoi),
              detail.giaiThichDapAn && React.createElement("div", { style: { background: "#f0fdf4", borderRadius: 10, padding: "12px 16px", color: "#166534", fontSize: 13 } },
                React.createElement("strong", null, "Giai thich: "), detail.giaiThichDapAn),
              detail.answers?.length > 0 && React.createElement("div", null,
                React.createElement("p", { style: { margin: "0 0 8px", fontSize: 13, fontWeight: 600 } }, "Dap an:"),
                React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
                  detail.answers.map((a, i) =>
                    React.createElement("div", { key: i, style: { padding: "10px 14px", borderRadius: 8, fontSize: 13, background: a.laDapAnDung ? "#dcfce7" : "#f9fafb", border: `1px solid ${a.laDapAnDung ? "#86efac" : "#e5e7eb"}`, color: a.laDapAnDung ? "#166534" : "#374151", display: "flex", alignItems: "center", gap: 8 } },
                      a.laDapAnDung && React.createElement(CheckCircle, { size: 14, color: "#16a34a" }),
                      a.noiDungDapAn
                    )
                  )
                )
              )
            )
    )
  );
};

/* ─ Assignment Detail Modal ─ */
const AssignmentDetailModal = ({ assignmentId, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!assignmentId) return;
    setLoading(true);
    adminAssignmentService.getAssignmentDetail(assignmentId)
      .then(setDetail).catch(() => toast.error("Khong the tai chi tiet de thi.")).finally(() => setLoading(false));
  }, [assignmentId]);
  return React.createElement("div", { style: overlay },
    React.createElement("div", { style: { ...cardStyle, maxWidth: 660, maxHeight: "85vh", overflowY: "auto", padding: 28 } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 } },
        React.createElement("h3", { style: { margin: 0, fontSize: 17 } }, "Chi tiet de thi"),
        React.createElement("button", { onClick: onClose, style: btnIcon }, React.createElement(X, { size: 18 }))
      ),
      loading
        ? React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
            React.createElement(Skeleton, { h: 24 }), React.createElement(Skeleton, { h: 16, w: "70%" }), React.createElement(Skeleton, { h: 16 }))
        : !detail
          ? React.createElement("p", { style: { color: "#6b7280" } }, "Khong tim thay du lieu.")
          : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
              React.createElement("div", null,
                React.createElement("h2", { style: { margin: "0 0 6px", fontSize: 20 } }, detail.tenBaiTap),
                React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
                  statusBadge(detail.statusKey),
                  React.createElement("span", { style: { ...badge, background: "#eff6ff", color: "#1d4ed8" } }, detail.loaiBaiTapLabel),
                  React.createElement("span", { style: { ...badge, background: "#f5f3ff", color: "#7c3aed" } }, detail.tenKhoaHoc)
                )
              ),
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
                [
                  ["Thoi gian lam bai", detail.thoiGianLamBai ? `${detail.thoiGianLamBai} phut` : "—"],
                  ["Diem toi da", detail.diemToiDa ?? "—"],
                  ["So cau hoi", detail.questions?.length ?? 0],
                  ["So lop", detail.classEvents?.length ?? 0],
                ].map(([label, value]) =>
                  React.createElement("div", { key: label, style: { background: "#f9fafb", borderRadius: 10, padding: "12px 14px" } },
                    React.createElement("p", { style: { margin: "0 0 2px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase" } }, label),
                    React.createElement("p", { style: { margin: 0, fontSize: 15, fontWeight: 600 } }, String(value))
                  )
                )
              ),
              detail.questions?.length > 0 && React.createElement("div", null,
                React.createElement("p", { style: { margin: "0 0 8px", fontSize: 13, fontWeight: 600 } }, `Cau hoi trong de (${detail.questions.length})`),
                React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" } },
                  detail.questions.map((q, i) =>
                    React.createElement("div", { key: q.maCauHoi, style: { padding: "10px 14px", borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb", fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start" } },
                      React.createElement("span", { style: { color: "#9ca3af", minWidth: 22, fontWeight: 600 } }, `${i + 1}.`),
                      React.createElement("span", { style: { flex: 1, lineHeight: 1.5 } }, q.noiDungCauHoi),
                      diffBadge(q.mucDoCode)
                    )
                  )
                )
              )
            )
    )
  );
};

/* ─ StatCard ─ */
const StatCard = ({ icon: Icon, label, value, color }) =>
  React.createElement("div", { style: { background: "#fff", borderRadius: 14, padding: "18px 22px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 16, flex: 1 } },
    React.createElement("div", { style: { background: color + "18", borderRadius: 10, padding: 10 } }, React.createElement(Icon, { size: 20, color })),
    React.createElement("div", null,
      React.createElement("p", { style: { margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" } }, value),
      React.createElement("p", { style: { margin: 0, fontSize: 12, color: "#6b7280" } }, label)
    )
  );

/* ─ Main ─ */
const ExamGenerationManager = () => {
  const [tab, setTab] = useState("assignments");
  const [bootstrap, setBootstrap] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignFilters, setAssignFilters] = useState({ courseId: "", assignmentType: "", status: "", search: "" });
  const [viewAssignmentId, setViewAssignmentId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankFilters, setBankFilters] = useState({ courseId: "", questionType: "", difficulty: "", search: "" });
  const [viewQuestionId, setViewQuestionId] = useState(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState(null);
  const [deleteQuestionLoading, setDeleteQuestionLoading] = useState(false);

  useEffect(() => {
    adminAssignmentService.getBootstrap().then(setBootstrap).catch(() => toast.error("Khong the tai du lieu khoi tao."));
  }, []);

  const loadAssignments = useCallback(async () => {
    setAssignLoading(true);
    try { const d = await adminAssignmentService.getAssignments(assignFilters); setAssignments(Array.isArray(d) ? d : []); }
    catch { toast.error("Khong the tai danh sach de thi."); }
    finally { setAssignLoading(false); }
  }, [assignFilters]);

  useEffect(() => { if (tab === "assignments") loadAssignments(); }, [tab, loadAssignments]);

  const loadBank = useCallback(async () => {
    setBankLoading(true);
    try { const d = await adminAssignmentService.getQuestionBank(bankFilters); setQuestions(Array.isArray(d) ? d : []); }
    catch { toast.error("Khong the tai ngan hang cau hoi."); }
    finally { setBankLoading(false); }
  }, [bankFilters]);

  useEffect(() => { if (tab === "bank") loadBank(); }, [tab, loadBank]);

  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try { await adminAssignmentService.deleteAssignment(deleteTarget.maBaiTap); toast.success("Da xoa de thi."); setDeleteTarget(null); loadAssignments(); }
    catch (e) { toast.error(e?.message || "Xoa de thi that bai."); }
    finally { setDeleteLoading(false); }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionTarget) return;
    setDeleteQuestionLoading(true);
    try { await adminAssignmentService.deleteQuestion(deleteQuestionTarget.maCauHoi); toast.success("Da xoa cau hoi."); setDeleteQuestionTarget(null); loadBank(); }
    catch (e) { toast.error(e?.message || "Xoa cau hoi that bai."); }
    finally { setDeleteQuestionLoading(false); }
  };

  const openCount = assignments.filter(a => (a.statusKey || "").toUpperCase() === "OPEN").length;

  return React.createElement("div", { style: { padding: "24px 28px", maxWidth: 1280, margin: "0 auto", fontFamily: "'Inter','Segoe UI',sans-serif" } },
    React.createElement("style", null, "@keyframes egm-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} .egm-row:hover{background:#f0f7ff!important}"),
    /* Header */
    React.createElement("div", { style: { marginBottom: 22 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
        React.createElement("div", { style: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 12, padding: 10 } }, React.createElement(Layers, { size: 22, color: "#fff" })),
        React.createElement("div", null,
          React.createElement("h1", { style: { margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" } }, "Quan ly De thi"),
          React.createElement("p", { style: { margin: 0, fontSize: 13, color: "#6b7280" } }, "Xem & quan ly de thi va ngan hang cau hoi")
        )
      )
    ),
    /* Stats */
    React.createElement("div", { style: { display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" } },
      React.createElement(StatCard, { icon: FileText,  label: "Tong de thi",  value: assignments.length, color: "#6366f1" }),
      React.createElement(StatCard, { icon: Zap,       label: "Dang mo",      value: openCount,          color: "#10b981" }),
      React.createElement(StatCard, { icon: BookMarked,label: "Cau hoi",      value: questions.length,   color: "#f59e0b" }),
      React.createElement(StatCard, { icon: BarChart2, label: "Khoa hoc",     value: bootstrap?.courses?.length ?? "...", color: "#3b82f6" })
    ),
    /* Tabs */
    React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 20, background: "#f3f4f6", borderRadius: 12, padding: 4, width: "fit-content" } },
      TABS.map(({ key, label, icon: Icon }) =>
        React.createElement("button", { key, onClick: () => setTab(key), style: { border: "none", cursor: "pointer", padding: "8px 20px", borderRadius: 10, fontSize: 14, fontWeight: tab === key ? 600 : 500, background: tab === key ? "#fff" : "transparent", color: tab === key ? "#6366f1" : "#6b7280", boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,.1)" : "none", display: "flex", alignItems: "center", gap: 6 } },
          React.createElement(Icon, { size: 15 }), label)
      )
    ),
    /* ── ASSIGNMENTS TAB ── */
    tab === "assignments" && React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" } },
        React.createElement("div", { style: searchWrap },
          React.createElement(Search, { size: 15, color: "#9ca3af" }),
          React.createElement("input", { type: "text", placeholder: "Tim ten de thi...", value: assignFilters.search, onChange: e => setAssignFilters(f => ({ ...f, search: e.target.value })), style: searchInput })
        ),
        React.createElement("select", { value: assignFilters.courseId, onChange: e => setAssignFilters(f => ({ ...f, courseId: e.target.value })), style: selectInput },
          React.createElement("option", { value: "" }, "Tat ca khoa hoc"),
          ...(bootstrap?.courses || []).map(c => React.createElement("option", { key: c.maKhoaHoc, value: c.maKhoaHoc }, c.tenKhoaHoc))
        ),
        React.createElement("select", { value: assignFilters.assignmentType, onChange: e => setAssignFilters(f => ({ ...f, assignmentType: e.target.value })), style: selectInput },
          React.createElement("option", { value: "" }, "Tat ca loai"),
          ...(bootstrap?.assignmentTypes || []).map(t => React.createElement("option", { key: t.code, value: t.code }, t.label))
        ),
        React.createElement("select", { value: assignFilters.status, onChange: e => setAssignFilters(f => ({ ...f, status: e.target.value })), style: selectInput },
          React.createElement("option", { value: "" }, "Tat ca trang thai"),
          React.createElement("option", { value: "OPEN" }, "Dang mo"),
          React.createElement("option", { value: "UPCOMING" }, "Sap mo"),
          React.createElement("option", { value: "CLOSED" }, "Da dong"),
          React.createElement("option", { value: "DRAFT" }, "Ban nhap")
        ),
        React.createElement("button", { onClick: loadAssignments, disabled: assignLoading, style: btnOutline }, React.createElement(RefreshCw, { size: 14 }), "Lam moi")
      ),
      assignLoading
        ? React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, [1,2,3].map(i => React.createElement(Skeleton, { key: i, h: 52 })))
        : assignments.length === 0
          ? React.createElement("div", { style: emptyBox }, React.createElement(FileText, { size: 36, color: "#d1d5db" }), React.createElement("p", { style: { margin: "10px 0 0", color: "#9ca3af", fontSize: 14 } }, "Chua co de thi nao"))
          : React.createElement("div", { style: { overflowX: "auto" } },
              React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
                React.createElement("thead", null, React.createElement("tr", { style: { borderBottom: "2px solid #e5e7eb" } },
                  ["Ten de thi", "Khoa hoc", "Loai", "Trang thai", "So cau", "Thoi gian", "Han nop", ""].map(h =>
                    React.createElement("th", { key: h, style: { padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12, textTransform: "uppercase", whiteSpace: "nowrap" } }, h)
                  )
                )),
                React.createElement("tbody", null,
                  assignments.map(a => React.createElement("tr", { key: a.maBaiTap, className: "egm-row", style: { borderBottom: "1px solid #f3f4f6", transition: "background .15s" } },
                    React.createElement("td", { style: { padding: "12px 12px", fontWeight: 600, color: "#1f2937", maxWidth: 220 } },
                      React.createElement("div", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: a.tenBaiTap }, a.tenBaiTap),
                      a.code && React.createElement("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 2 } }, a.code)
                    ),
                    React.createElement("td", { style: { padding: "12px 12px", color: "#374151", whiteSpace: "nowrap" } }, a.tenKhoaHoc ?? "—"),
                    React.createElement("td", { style: { padding: "12px 12px" } }, React.createElement("span", { style: { ...badge, background: "#eff6ff", color: "#1d4ed8" } }, a.loaiBaiTapLabel ?? a.loaiBaiTapCode ?? "—")),
                    React.createElement("td", { style: { padding: "12px 12px" } }, statusBadge(a.statusKey)),
                    React.createElement("td", { style: { padding: "12px 12px", textAlign: "center" } }, a.soCauHoi ?? "—"),
                    React.createElement("td", { style: { padding: "12px 12px", whiteSpace: "nowrap" } }, a.thoiGianLamBai ? `${a.thoiGianLamBai} phut` : "—"),
                    React.createElement("td", { style: { padding: "12px 12px", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" } }, fmtDate(a.dueAt)),
                    React.createElement("td", { style: { padding: "12px 12px" } },
                      React.createElement("div", { style: { display: "flex", gap: 6 } },
                        React.createElement("button", { onClick: () => setViewAssignmentId(a.maBaiTap), title: "Xem chi tiet", style: btnIconSm }, React.createElement(Eye, { size: 14 })),
                        React.createElement("button", { onClick: () => setDeleteTarget(a), title: "Xoa", style: { ...btnIconSm, color: "#ef4444" } }, React.createElement(Trash2, { size: 14 }))
                      )
                    )
                  ))
                )
              ),
              React.createElement("p", { style: { margin: "10px 0 0", fontSize: 12, color: "#9ca3af" } }, `Hien thi ${assignments.length} de thi`)
            )
    ),
    /* ── BANK TAB ── */
    tab === "bank" && React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" } },
        React.createElement("div", { style: searchWrap },
          React.createElement(Search, { size: 15, color: "#9ca3af" }),
          React.createElement("input", { type: "text", placeholder: "Tim noi dung cau hoi...", value: bankFilters.search, onChange: e => setBankFilters(f => ({ ...f, search: e.target.value })), style: searchInput })
        ),
        React.createElement("select", { value: bankFilters.courseId, onChange: e => setBankFilters(f => ({ ...f, courseId: e.target.value })), style: selectInput },
          React.createElement("option", { value: "" }, "Tat ca khoa hoc"),
          ...(bootstrap?.courses || []).map(c => React.createElement("option", { key: c.maKhoaHoc, value: c.maKhoaHoc }, c.tenKhoaHoc))
        ),
        React.createElement("select", { value: bankFilters.questionType, onChange: e => setBankFilters(f => ({ ...f, questionType: e.target.value })), style: selectInput },
          React.createElement("option", { value: "" }, "Tat ca loai cau hoi"),
          ...(bootstrap?.questionTypes || []).map(t => React.createElement("option", { key: t.code, value: t.code }, t.label))
        ),
        React.createElement("select", { value: bankFilters.difficulty, onChange: e => setBankFilters(f => ({ ...f, difficulty: e.target.value })), style: selectInput },
          React.createElement("option", { value: "" }, "Tat ca do kho"),
          ...(bootstrap?.difficultyLevels || []).map(d => React.createElement("option", { key: d.code, value: d.code }, d.label))
        ),
        React.createElement("button", { onClick: loadBank, disabled: bankLoading, style: btnOutline }, React.createElement(RefreshCw, { size: 14 }), "Lam moi")
      ),
      bankLoading
        ? React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, [1,2,3,4].map(i => React.createElement(Skeleton, { key: i, h: 52 })))
        : questions.length === 0
          ? React.createElement("div", { style: emptyBox }, React.createElement(Database, { size: 36, color: "#d1d5db" }), React.createElement("p", { style: { margin: "10px 0 0", color: "#9ca3af", fontSize: 14 } }, "Ngan hang cau hoi trong"))
          : React.createElement("div", { style: { overflowX: "auto" } },
              React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
                React.createElement("thead", null, React.createElement("tr", { style: { borderBottom: "2px solid #e5e7eb" } },
                  ["Noi dung cau hoi", "Khoa hoc", "Loai", "Do kho", "Dap an", "Tao luc", ""].map(h =>
                    React.createElement("th", { key: h, style: { padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12, textTransform: "uppercase", whiteSpace: "nowrap" } }, h)
                  )
                )),
                React.createElement("tbody", null,
                  questions.map(q => React.createElement("tr", { key: q.maCauHoi, className: "egm-row", style: { borderBottom: "1px solid #f3f4f6" } },
                    React.createElement("td", { style: { padding: "12px 12px", maxWidth: 280 } },
                      React.createElement("div", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }, title: q.noiDungCauHoi }, q.noiDungCauHoi)
                    ),
                    React.createElement("td", { style: { padding: "12px 12px", whiteSpace: "nowrap", color: "#374151" } }, q.tenKhoaHoc ?? "—"),
                    React.createElement("td", { style: { padding: "12px 12px" } }, React.createElement("span", { style: { ...badge, background: "#f0fdf4", color: "#166534" } }, q.loaiCauHoiLabel || q.loaiCauHoiCode || "—")),
                    React.createElement("td", { style: { padding: "12px 12px" } }, diffBadge(q.mucDoCode)),
                    React.createElement("td", { style: { padding: "12px 12px", textAlign: "center" } }, q.laCauHoiTuLuan ? "TL" : (q.soDapAnLuaChon ?? q.soDapAnNhapLieu ?? 0)),
                    React.createElement("td", { style: { padding: "12px 12px", fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" } }, q.thoiGianTao ? new Date(q.thoiGianTao).toLocaleDateString("vi-VN") : "—"),
                    React.createElement("td", { style: { padding: "12px 12px" } },
                      React.createElement("div", { style: { display: "flex", gap: 6 } },
                        React.createElement("button", { onClick: () => setViewQuestionId(q.maCauHoi), style: btnIconSm }, React.createElement(Eye, { size: 14 })),
                        React.createElement("button", { onClick: () => setDeleteQuestionTarget(q), style: { ...btnIconSm, color: "#ef4444" } }, React.createElement(Trash2, { size: 14 }))
                      )
                    )
                  ))
                )
              ),
              React.createElement("p", { style: { margin: "10px 0 0", fontSize: 12, color: "#9ca3af" } }, `Hien thi ${questions.length} cau hoi`)
            )
    ),
    /* Modals */
    viewAssignmentId && React.createElement(AssignmentDetailModal, { assignmentId: viewAssignmentId, onClose: () => setViewAssignmentId(null) }),
    viewQuestionId && React.createElement(QuestionDetailModal, { questionId: viewQuestionId, onClose: () => setViewQuestionId(null) }),
    React.createElement(ConfirmModal, { open: !!deleteTarget, title: "Xoa de thi?", message: `Ban co chac chan muon xoa de thi "${deleteTarget?.tenBaiTap}"?`, onConfirm: handleDeleteAssignment, onCancel: () => setDeleteTarget(null), loading: deleteLoading }),
    React.createElement(ConfirmModal, { open: !!deleteQuestionTarget, title: "Xoa cau hoi?", message: "Cau hoi se bi xoa khoi ngan hang.", onConfirm: handleDeleteQuestion, onCancel: () => setDeleteQuestionTarget(null), loading: deleteQuestionLoading })
  );
};

export default ExamGenerationManager;
