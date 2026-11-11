import React from 'react';

const ScheduleNavigator = ({ onPrev, onNext, onToday }) => {
    return (
        <div className="d-flex align-items-center gap-2">
            {/* Nút Hiện tại */}
            <button 
                className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" 
                onClick={onToday}
                style={{ backgroundColor: '#007bff', border: 'none', height: '40px', fontSize: '14px' }}
            >
                Hiện tại
            </button>
            
            {/* Cụm Trở về / Tiếp */}
            <div className="d-flex align-items-center border rounded-pill bg-white px-2 shadow-sm" style={{ height: '40px' }}>
                <button 
                    className="btn btn-link text-dark p-0 px-2 text-decoration-none small fw-medium d-flex align-items-center" 
                    onClick={onPrev}
                    style={{ fontSize: '14px' }}
                >
                    <i className="bi bi-chevron-left small me-1"></i> Trở về
                </button>
                
                <div className="vr mx-1 my-2" style={{ opacity: 0.2, height: '20px' }}></div>
                
                <button 
                    className="btn btn-link text-dark p-0 px-2 text-decoration-none small fw-medium d-flex align-items-center" 
                    onClick={onNext}
                    style={{ fontSize: '14px' }}
                >
                    Tiếp <i className="bi bi-chevron-right small ms-1"></i>
                </button>
            </div>
        </div>
    );
};

export default ScheduleNavigator;