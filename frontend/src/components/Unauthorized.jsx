import React from 'react';

const Unauthorized = ({ height = '70vh', message = 'Bạn không có quyền truy cập trang này' }) => {
    return (
        <div className="d-flex align-items-center justify-content-center" style={{ height }}>
            <div className="text-center">
                <i className="bi bi-shield-lock-fill fs-1 text-danger"></i>
                <h1 className="mt-3">403 - Không có quyền truy cập</h1>
                <p className="text-muted">{message}</p>
            </div>
        </div>
    );
};

export default Unauthorized;
