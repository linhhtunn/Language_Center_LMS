import React, { useState, useEffect } from "react";
import BaseApi, { getApiBaseUrl } from "../../api/BaseApi";

const triggerBrowserDownload = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "dinh-kem";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};
/**
 * Chức năng: Hiển thị và quản lý danh sách thông báo cho admin
 * Creatby: Trương Quốc Lộc - 18/3/2026
 * Updateby: Trương Quốc Lộc - 18/3/2026
 */

// Utility function để convert UTC time sang local time
const formatLocalDate = (utcDateString) => {
  try {
    // Parse ISO string (with Z suffix indicating UTC)
    const utcDate = new Date(utcDateString);
    // toLocaleDateString automatically converts to browser's local timezone
    return utcDate.toLocaleDateString('vi-VN');
  } catch (error) {
    return 'N/A';
  }
};

const formatLocalTime = (utcDateString) => {
  try {
    const utcDate = new Date(utcDateString);
    // toLocaleTimeString automatically converts to browser's local timezone
    return utcDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (error) {
    return 'N/A';
  }
};

// Get local timezone offset for display (e.g., "GMT+7" or "UTC+7")
const getTimezoneOffset = () => {
  const now = new Date();
  const offset = -now.getTimezoneOffset() / 60; // Convert minutes to hours
  const sign = offset >= 0 ? '+' : '';
  return `UTC${sign}${offset}`;
};

const AdminNotifications = () => {
  // 1. Dữ liệu giả
  const [notifications, setNotifications] = useState([]);

  // State lọc dữ liệu
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTarget, setFilterTarget] = useState("Tất cả đối tượng");

  //State quản lý model và form
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    title: "",
    content: "",
    target: "Tất cả",
  });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await BaseApi.get("Notification");
      const resData = res.data || res;

      // Xử lý linh hoạt: Backend trả về trực tiếp mảng (Array) HOẶC trả object chứa data
      const isArray = Array.isArray(resData);
      const isSuccess = resData.success || isArray;
      const dataList = isArray ? resData : (resData.data || []);

      if (isSuccess) {
        const normalizedData = dataList.map(item => ({
          id: item.id || item.Id,
          title: item.title || item.Title || "",
          content: item.content || item.Content || "",
          target: item.target || item.Target || "Tất cả",
          createdAt: item.createdAt || item.CreatedAt || item.ThoiGianTao || new Date().toISOString(),
          attachments: (item.attachments || item.Attachments || []).map(a => ({
            id: a.id || a.Id,
            fileName: a.fileName || a.FileName || "tep-dinh-kem",
          })),
        }));
        setNotifications(normalizedData);
      } else {
        alert("Lỗi từ server: " + (resData.message || "Không lấy được dữ liệu"));
      }
    } catch (error) {
      if (error.response) {
        alert(`Lỗi API: Mã ${error.response.status} - ${error.response.statusText}`);
      } else {
        alert("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
      }
    }
  };

  // 2. Hàm xử lý
  const handleOpenModal = (notification = null) => {
    if (notification) {
      setIsEditing(true);
      setFormData(notification);
    } else {
      setIsEditing(false);
      setFormData({ id: null, title: "", content: "", target: "Tất cả" });
    }
    setFiles([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFiles([]);
  };

  const downloadAttachment = async (attachment) => {
    try {
      const token = BaseApi.getAuthToken();
      const response = await fetch(`${getApiBaseUrl()}/Notification/attachments/${attachment.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Không thể tải file đính kèm.");
      }
      const blob = await response.blob();
      triggerBrowserDownload(blob, attachment.fileName);
    } catch (error) {
      alert(error.message || "Không thể tải file đính kèm.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      alert("Vui lòng nhập đầy đủ Tiêu đề và Nội dung!");
      return;
    }

    try {
      let res;
      if (isEditing) {
        res = await BaseApi.put(`Notification/${formData.id}`, formData);
      } else {
        const form = new FormData();
        form.append("Title", formData.title);
        form.append("Content", formData.content);
        form.append("DoiTuong", formData.target);
        files.forEach((file) => form.append("Files", file));

        const token = BaseApi.getAuthToken();
        const rawResponse = await fetch(`${getApiBaseUrl()}/Notification`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        res = await rawResponse.json();
      }

      const resData = res.data || res;

      // Bắt lỗi nếu Backend trả về HTTP 200 nhưng nội dung bên trong báo success = false
      if (resData && resData.success === false) {
        alert("Lỗi từ server: " + (resData.message || "Không thể lưu thông báo."));
        return;
      }

      alert(isEditing ? "Cập nhật thông báo thành công!" : "Thêm mới thông báo thành công!");
      await fetchNotifications(); // Tải lại danh sách từ server
      handleCloseModal();
    } catch (error) {
      if (error.response) {
        alert(`Lỗi API: Mã ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
      } else {
        alert("Có lỗi xảy ra khi lưu. Vui lòng kiểm tra kết nối mạng.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thông báo này?")) {
      try {
        const res = await BaseApi.delete(`Notification/${id}`);
        const resData = res.data || res;

        if (resData && resData.success === false) {
          alert("Lỗi từ server: " + (resData.message || "Không thể xóa thông báo."));
          return;
        }

        alert("Xóa thông báo thành công!");
        await fetchNotifications(); // Tải lại danh sách từ server
      } catch (error) {
        if (error.response) {
          alert(`Lỗi API: Mã ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
        } else {
          alert("Có lỗi xảy ra khi xóa thông báo.");
        }
      }
    }
  };

  // 3. Hàm render màu cho role
  const targetColor = (target) => {
    if (target === "Tất cả") return "bg-success";
    if (target === "Giáo viên") return "bg-warning text-dark";
    if (target === "Phụ huynh") return "bg-info text-dark";
    return "bg-primary"; // Học sinh
  };

  // Lọc dữ liệu trước khi hiển thị
  const filteredNotifications = notifications.filter((item) => {
    const matchSearch = (item.title || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchTarget =
      filterTarget === "Tất cả đối tượng" || item.target === filterTarget;
    return matchSearch && matchTarget;
  });

  // 4. Main
  return (
    <div className="p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-bell me-2"></i>
            Quản lý thông báo
          </h3>
          <small className="text-muted">
            <i className="bi bi-globe me-1"></i>Múi giờ hệ thống: {getTimezoneOffset()}
          </small>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-circle me-2"></i> Thêm thông báo
        </button>
      </div>

      {/* Filter */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-8">
              <input
                className="form-control"
                placeholder="Tìm kiếm theo tiêu đề thông báo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={filterTarget}
                onChange={(e) => setFilterTarget(e.target.value)}
              >
                <option>Tất cả đối tượng</option>
                <option>Tất cả</option>
                <option>Học sinh</option>
                <option>Giáo viên</option>
                <option>Phụ huynh</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="card">
        <div className="card-body">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Ngày đăng</th>
                <th>Khung giờ</th>
                <th>Tiêu đề</th>
                <th>Đối tượng</th>
                <th>Đính kèm</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    Không tìm thấy thông báo nào.
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <small className="text-muted">
                        {formatLocalDate(item.createdAt)}
                      </small>
                    </td>
                    <td>
                      <small className="text-muted">
                        {formatLocalTime(item.createdAt)}
                      </small>
                    </td>
                    <td>
                      <div className="fw-medium">{item.title}</div>
                      {/* Thêm phần hiển thị 1 đoạn ngắn nội dung giống cách hiển thị sđt ở AdminUsers */}
                      <small
                        className="text-muted text-truncate d-inline-block"
                        style={{ maxWidth: "250px" }}
                      >
                        {item.content}
                      </small>
                    </td>
                    <td>
                      <span className={`badge ${targetColor(item.target)}`}>
                        {item.target}
                      </span>
                    </td>
                    <td>
                      {(item.attachments || []).length === 0 ? (
                        <span className="text-muted">-</span>
                      ) : (
                        item.attachments.map((att) => (
                          <button
                            key={att.id}
                            className="btn btn-sm btn-outline-secondary me-1 mb-1"
                            onClick={() => downloadAttachment(att)}
                            title={att.fileName}
                          >
                            <i className="bi bi-paperclip"></i>{" "}
                            {att.fileName.length > 14 ? `${att.fileName.slice(0, 12)}…` : att.fileName}
                          </button>
                        ))
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline-primary btn-sm me-2"
                        onClick={() => handleOpenModal(item)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form*/}
      {showModal && (
        <div className="modal-overlay" style={overlayStyle}>
          <div
            className="card border-0 shadow rounded-4 p-4"
            style={{ width: "500px", maxWidth: "90%" }}
          >
            <h4 className="mb-4">
              {isEditing ? "Sửa thông báo" : "Thêm thông báo mới"}
            </h4>

            <div className="mb-3">
              <label className="form-label fw-medium">Tiêu đề</label>
              <input
                type="text"
                className="form-control"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Nhập tiêu đề..."
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-medium">Đối tượng nhận</label>
              <select
                className="form-select"
                name="target"
                value={formData.target}
                onChange={handleChange}
              >
                <option value="Tất cả">Tất cả</option>
                <option value="Học sinh">Học sinh</option>
                <option value="Giáo viên">Giáo viên</option>
                <option value="Phụ huynh">Phụ huynh</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="form-label fw-medium">Nội dung</label>
              <textarea
                className="form-control"
                name="content"
                rows="4"
                value={formData.content}
                onChange={handleChange}
                placeholder="Nhập nội dung thông báo..."
              ></textarea>
            </div>

            {!isEditing && (
              <div className="mb-4">
                <label className="form-label fw-medium">
                  Tệp đính kèm (Word, Excel, PowerPoint, PDF - có thể chọn nhiều file)
                </label>
                <input
                  type="file"
                  className="form-control"
                  multiple
                  accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                {files.length > 0 && (
                  <ul className="list-unstyled mt-2 mb-0 small text-muted">
                    {files.map((f, i) => (
                      <li key={i}>
                        <i className="bi bi-file-earmark-text me-1"></i>
                        {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={handleCloseModal}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <i className="bi bi-save me-2"></i>Lưu thông báo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Style nội bộ cho Modal (Popup) để làm mờ nền
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1050,
};

export default AdminNotifications;
