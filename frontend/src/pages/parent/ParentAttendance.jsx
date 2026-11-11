import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Badge } from "react-bootstrap";
import { p0Api } from "../../api/p0Api";
import { useAuth } from "../../context/AuthContext";

const ParentAttendance = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [childrenRows, setChildrenRows] = useState([]);
  const [childFilter, setChildFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [children, attendance] = await Promise.all([
          p0Api.parents.children(user.id),
          p0Api.parents.attendance(user.id),
        ]);
        setChildrenRows(children || []);
        setRows(attendance || []);
      } catch (err) {
        setError(err.message || "Khong tai duoc du lieu phu huynh.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id]);

  const children = useMemo(() => {
    const map = new Map(childrenRows.map((row) => [row.studentId, row.fullName]));
    rows.forEach((row) => map.set(row.studentId, row.studentName));
    return Array.from(map.entries());
  }, [childrenRows, rows]);
  const classes = useMemo(() => Array.from(new Map(rows.map((row) => [row.classId, row.className])).entries()), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const matchesChild = !childFilter || row.studentId === childFilter;
    const matchesClass = !classFilter || row.classId === classFilter;
    const matchesDate = !dateFilter || row.sessionDate === dateFilter;
    return matchesChild && matchesClass && matchesDate;
  }), [rows, childFilter, classFilter, dateFilter]);

  const stats = {
    total: filtered.length,
    present: filtered.filter((row) => row.status === "present").length,
    absent: filtered.filter((row) => row.status === "absent").length,
    late: filtered.filter((row) => row.status === "late").length,
  };

  const getStatus = (status, label) => {
    switch (status) {
      case "present":
        return <Badge bg="success">{label || "Co mat"}</Badge>;
      case "late":
        return <Badge bg="warning">{label || "Di muon"}</Badge>;
      case "absent":
        return <Badge bg="danger">{label || "Vang mat"}</Badge>;
      case "excused":
        return <Badge bg="primary">{label || "Co phep"}</Badge>;
      default:
        return <Badge bg="secondary">{label || "Chua diem danh"}</Badge>;
    }
  };

  return (
    <Container className="mt-4">
      <h4 className="mb-4">Lich su diem danh</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0">Danh sach con</h6>
            <Badge bg="info">{childrenRows.length}</Badge>
          </div>
          {loading ? (
            <div className="text-muted">Dang tai danh sach con...</div>
          ) : childrenRows.length === 0 ? (
            <div className="text-muted">Phu huynh chua duoc gan hoc sinh nao.</div>
          ) : (
            <Row className="g-2">
              {childrenRows.map((child) => (
                <Col md={4} key={child.studentId}>
                  <div className="border rounded p-3 h-100">
                    <div className="fw-semibold">{child.fullName}</div>
                    <small className="text-muted">{child.email || "Chua co email"}</small>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>

      <Row className="mb-4">
        <Col md={3}><Card className="text-center p-3 shadow-sm bg-primary text-white"><h6>Tong buoi</h6><h3>{stats.total}</h3></Card></Col>
        <Col md={3}><Card className="text-center p-3 shadow-sm bg-success text-white"><h6>Co mat</h6><h3>{stats.present}</h3></Card></Col>
        <Col md={3}><Card className="text-center p-3 shadow-sm bg-danger text-white"><h6>Vang</h6><h3>{stats.absent}</h3></Card></Col>
        <Col md={3}><Card className="text-center p-3 shadow-sm bg-warning text-dark"><h6>Di muon</h6><h3>{stats.late}</h3></Card></Col>
      </Row>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <select className="form-select" value={childFilter} onChange={(e) => setChildFilter(e.target.value)}>
                <option value="">Tat ca con</option>
                {children.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </Col>
            <Col md={4}>
              <select className="form-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="">Tat ca lop</option>
                {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </Col>
            <Col md={4}>
              <input type="date" className="form-control" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">Dang tai lich su diem danh...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted py-4">Chua co du lieu diem danh phu hop. Neu vua gan hoc sinh, hay de giao vien diem danh mot buoi hoc truoc.</div>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Hoc sinh</th>
                  <th>Lop</th>
                  <th>Ngay hoc</th>
                  <th>Trang thai</th>
                  <th>Ghi chu</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={`${item.studentId}-${item.sessionId}`}>
                    <td>{item.studentName}</td>
                    <td>{item.className}</td>
                    <td>{item.sessionDate}</td>
                    <td>{getStatus(item.status, item.statusLabel)}</td>
                    <td>{item.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ParentAttendance;
