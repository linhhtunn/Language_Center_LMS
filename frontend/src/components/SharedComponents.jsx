import React from "react";

export const SourceBadge = ({ mode = "real", label }) => {
  const styles =
    mode === "real"
      ? "bg-success-subtle text-success border border-success-subtle"
      : mode === "hybrid"
        ? "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
        : "bg-light text-muted border";

  return (
    <span className={`badge rounded-pill px-3 py-2 fw-semibold ${styles}`}>
      {label}
    </span>
  );
};

export const LoadingCard = ({ children = "Đang tải dữ liệu..." }) => (
  <div className="p-4 animate__animated animate__fadeIn">
    <div className="card border-0 shadow-sm rounded-5 p-5 text-center">
      <div className="spinner-border text-primary mb-3" role="status" />
      <div className="fw-semibold text-muted">{children}</div>
    </div>
  </div>
);

export const DataBadge = ({
  count,
  total,
  percent,
  color = "#0d6efd",
  label,
}) => {
  const bg = `${color}20`;
  const border = `${color}55`;
  return (
    <span
      className="badge rounded-pill border px-3 py-2"
      style={{ backgroundColor: bg, color, borderColor: border }}
    >
      {label}
      {count != null && `: ${count}`}
      {total != null && `/${total}`}
      {percent != null && ` (${Number(percent).toFixed(1)}%)`}
    </span>
  );
};

export const PageHeader = ({
  title,
  subtitle,
  demoBadge = false,
  leftActions,
  rightActions,
}) => (
  <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
    <div className="d-flex flex-wrap align-items-center gap-3">
      <div>
        <h2 className="fw-bold text-dark mb-1 text-uppercase d-flex align-items-center gap-2">
          {title}
          {demoBadge && (
            <span className="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle fs-6 px-3 py-1">
              <i className="bi bi-exclamation-triangle-fill me-1"></i> Dữ liệu
              mẫu
            </span>
          )}
        </h2>
        {subtitle && <div className="small text-muted">{subtitle}</div>}
      </div>
      {leftActions}
    </div>
    {rightActions && (
      <div className="d-flex gap-2 flex-wrap justify-content-end">
        {rightActions}
      </div>
    )}
  </div>
);

export const ErrorAlert = ({ message }) =>
  message ? (
    <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">
      <i className="bi bi-exclamation-triangle-fill me-2"></i>
      {message}
    </div>
  ) : null;

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  style,
}) => (
  <div className="input-group" style={style}>
    <span className="input-group-text bg-white border-end-0 rounded-start-4">
      <i className="bi bi-search text-muted"></i>
    </span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="form-control border-start-0 rounded-end-4"
      placeholder={placeholder}
    />
  </div>
);

export const AvatarLetter = ({
  letter,
  size = 36,
  bg = "linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)",
  color = "#1d4ed8",
  fontSize,
}) => (
  <div
    className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: bg,
      color,
      fontSize: fontSize ?? size * 0.36,
    }}
  >
    {String(letter || "?")
      .charAt(0)
      .toUpperCase()}
  </div>
);

export const StatCard = ({ title, value, icon, color, subtitle }) => (
  <div
    className="card border-0 shadow-sm rounded-5 p-4 text-white h-100 shadow-hover"
    style={{ background: color }}
  >
    <div className="d-flex justify-content-between align-items-start">
      <div>
        <p className="mb-1 fw-medium opacity-75 small text-uppercase">
          {title}
        </p>
        <h2 className="fw-bold mb-0">{value}</h2>
        {subtitle && <div className="small opacity-75 mt-1">{subtitle}</div>}
      </div>
      <div className="bg-white bg-opacity-25 rounded-4 p-2">
        <i className={`bi ${icon} fs-3 text-white`}></i>
      </div>
    </div>
  </div>
);
