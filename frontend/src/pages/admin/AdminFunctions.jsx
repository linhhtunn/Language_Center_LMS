import React, { useEffect, useMemo, useState } from 'react';
import { PAGE_NAME_VI, PERMISSION_NAME_VI } from '../../constants/permissionEnums';
import apiClient from '../../api/BaseApi';

const API_BASE = 'Permissions';
const SYSTEM_ROLES = ['Admin', 'Giao_Vien', 'Hoc_Sinh', 'Phu_Huynh'];

const toVietnameseLabel = (value) =>
  value
    .replace(/^PAGE_/, '')
    .split('_')
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const getPageDisplayName = (name) => PAGE_NAME_VI[name] || name;

const getPermissionDisplayName = (code) => PERMISSION_NAME_VI[code] || toVietnameseLabel(code);

const normalizePages = (rawPages) =>
  (rawPages || []).map((page) => ({
    ...page,
    chucNangs: ((page.chucNangs || page.quyens) || []).map((permission) => ({
      ...permission,
      permissionId: permission.maQuyen ?? permission.maChucNang,
      permissionCode: permission.permissionCode ?? permission.tenQuyen ?? permission.maChucNangCode ?? ''
    }))
  }));

const normalizeMappings = (rawMappings) =>
  (rawMappings || []).map((mapping) => ({
    ...mapping,
    maQuyen: mapping.maQuyen ?? mapping.maChucNang
  }));

const AdminFunctions = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [mappings, setMappings] = useState([]);

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(new Set());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRoleName, setCreateRoleName] = useState('');
  const [createPermissionIds, setCreatePermissionIds] = useState(new Set());

  const permissionIdToCode = useMemo(() => {
    const map = new Map();
    pages.forEach((page) => {
      page.chucNangs.forEach((permission) => {
        map.set(permission.permissionId, permission.permissionCode);
      });
    });
    return map;
  }, [pages]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.maVaiTro === selectedRoleId) || null,
    [roles, selectedRoleId]
  );

  const isSystemRole = selectedRole ? SYSTEM_ROLES.includes(selectedRole.tenVaiTro) : false;

  const loadMatrix = async (nextSelectedRoleId = null) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get(`${API_BASE}/matrix`);

      if (data?.success === false) {
        throw new Error(data?.message || 'Không thể tải dữ liệu phân quyền.');
      }

      const nextRoles = data.roles || [];
      const nextPages = normalizePages(data.pages);
      const nextMappings = normalizeMappings(data.mappings);

      setRoles(nextRoles);
      setPages(nextPages);
      setMappings(nextMappings);

      const preferredRoleId =
        nextSelectedRoleId ??
        (nextRoles.some((r) => r.maVaiTro === selectedRoleId) ? selectedRoleId : nextRoles[0]?.maVaiTro ?? null);

      setSelectedRoleId(preferredRoleId);
    } catch (e) {
      setError(e.message || 'Có lỗi xảy ra khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  useEffect(() => {
    if (!selectedRole) {
      setEditRoleName('');
      setSelectedPermissionIds(new Set());
      return;
    }

    setEditRoleName(selectedRole.tenVaiTro || '');

    const permissionIds = mappings
      .filter((m) => m.maVaiTro === selectedRole.maVaiTro)
      .map((m) => m.maQuyen);

    setSelectedPermissionIds(new Set(permissionIds));
  }, [selectedRole, mappings]);

  const toggleSelectedPermission = (permissionId) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const toggleCreatePermission = (permissionId) => {
    setCreatePermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const saveSelectedRole = async () => {
    if (!selectedRole) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const permissionCodes = Array.from(selectedPermissionIds)
        .map((id) => permissionIdToCode.get(id))
        .filter(Boolean);

      const payload = {
        tenVaiTro: editRoleName.trim(),
        permissionCodes
      };

      const data = await apiClient.put(`${API_BASE}/roles/${selectedRole.maVaiTro}`, payload);

      if (data?.success === false) {
        throw new Error(data?.message || 'Cập nhật vai trò thất bại.');
      }

      await loadMatrix(selectedRole.maVaiTro);
    } catch (e) {
      setError(e.message || 'Cập nhật vai trò thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!createRoleName.trim()) {
      setError('Tên vai trò mới không được để trống.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const permissionCodes = Array.from(createPermissionIds)
        .map((id) => permissionIdToCode.get(id))
        .filter(Boolean);

      const data = await apiClient.post(`${API_BASE}/roles`, {
        tenVaiTro: createRoleName.trim(),
        permissionCodes
      });

      if (data?.success === false) {
        throw new Error(data?.message || 'Tạo vai trò thất bại.');
      }

      setShowCreateModal(false);
      setCreateRoleName('');
      setCreatePermissionIds(new Set());
      await loadMatrix(data.maVaiTro || null);
    } catch (e) {
      setError(e.message || 'Tạo vai trò thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedRole = async () => {
    if (!selectedRole) {
      return;
    }

    const ok = window.confirm(`Bạn có chắc muốn xoá vai trò \"${selectedRole.tenVaiTro}\"?`);
    if (!ok) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = await apiClient.delete(`${API_BASE}/roles/${selectedRole.maVaiTro}`);

      if (data?.success === false) {
        throw new Error(data?.message || 'Xoá vai trò thất bại.');
      }

      await loadMatrix();
    } catch (e) {
      setError(e.message || 'Xoá vai trò thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold mb-0">
          <i className="bi bi-shield-lock me-2"></i>
          Quản lý chức năng và phân quyền
        </h3>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          disabled={loading || saving}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Tạo vai trò mới
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Danh sách vai trò</div>
            <div className="list-group list-group-flush">
              {roles.map((role) => (
                <button
                  key={role.maVaiTro}
                  type="button"
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                    role.maVaiTro === selectedRoleId ? 'active' : ''
                  }`}
                  onClick={() => setSelectedRoleId(role.maVaiTro)}
                >
                  <span>{role.tenVaiTro}</span>
                  {SYSTEM_ROLES.includes(role.tenVaiTro) && (
                    <span className="badge text-bg-secondary">Hệ thống</span>
                  )}
                </button>
              ))}
              {!roles.length && (
                <div className="list-group-item text-muted">Chưa có vai trò nào.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Chi tiết vai trò</span>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-success btn-sm"
                  onClick={saveSelectedRole}
                  disabled={!selectedRole || saving || loading}
                >
                  <i className="bi bi-save me-1"></i>
                  Lưu thay đổi
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={deleteSelectedRole}
                  disabled={!selectedRole || saving || loading || isSystemRole}
                  title={isSystemRole ? 'Vai trò hệ thống không thể xoá' : ''}
                >
                  <i className="bi bi-trash me-1"></i>
                  Xoá vai trò
                </button>
              </div>
            </div>

            <div className="card-body">
              {!selectedRole && <div className="text-muted">Vui lòng chọn một vai trò để chỉnh sửa.</div>}

              {selectedRole && (
                <>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Tên vai trò</label>
                    <input
                      className="form-control"
                      value={editRoleName}
                      onChange={(e) => setEditRoleName(e.target.value)}
                      disabled={isSystemRole}
                    />
                    {isSystemRole && (
                      <small className="text-muted">Vai trò hệ thống chỉ cho phép chỉnh sửa quyền, không đổi tên/xoá.</small>
                    )}
                  </div>

                  <div className="border rounded-3 p-3" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
                    {pages.map((page) => (
                      <div key={page.maTrang} className="mb-3">
                        <div className="fw-semibold text-primary mb-2">{getPageDisplayName(page.tenTrang)}</div>
                        <div className="row g-2">
                          {page.chucNangs.map((permission) => (
                            <div className="col-md-6" key={permission.permissionId}>
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`perm_${permission.permissionId}`}
                                  checked={selectedPermissionIds.has(permission.permissionId)}
                                  onChange={() => toggleSelectedPermission(permission.permissionId)}
                                />
                                <label className="form-check-label" htmlFor={`perm_${permission.permissionId}`}>
                                  {getPermissionDisplayName(permission.permissionCode)}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Tạo vai trò mới</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Tên vai trò</label>
                  <input
                    className="form-control"
                    value={createRoleName}
                    onChange={(e) => setCreateRoleName(e.target.value)}
                    placeholder="Ví dụ: Tro_Giang"
                  />
                </div>

                <div className="border rounded-3 p-3" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
                  {pages.map((page) => (
                    <div key={`create_${page.maTrang}`} className="mb-3">
                      <div className="fw-semibold text-primary mb-2">{getPageDisplayName(page.tenTrang)}</div>
                      <div className="row g-2">
                        {page.chucNangs.map((permission) => (
                          <div className="col-md-6" key={`create_perm_${permission.permissionId}`}>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`create_perm_${permission.permissionId}`}
                                checked={createPermissionIds.has(permission.permissionId)}
                                onChange={() => toggleCreatePermission(permission.permissionId)}
                              />
                              <label className="form-check-label" htmlFor={`create_perm_${permission.permissionId}`}>
                                {getPermissionDisplayName(permission.permissionCode)}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Đóng
                </button>
                <button className="btn btn-primary" onClick={createRole} disabled={saving}>
                  Tạo vai trò
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="position-fixed top-50 start-50 translate-middle bg-white border rounded-3 px-4 py-3 shadow">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Đang tải dữ liệu phân quyền...
        </div>
      )}
    </div>
  );
};

export default AdminFunctions;
