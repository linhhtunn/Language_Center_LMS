
import React from 'react';

const ListeningSpeakerMatching = ({ question, currentQuestion, currentSubIndex, answers, onAnswerChange }) => {
  const speaker = Number.isInteger(currentSubIndex) ? question.speakers[currentSubIndex] : null;
  return (
    <>
      <div className="mb-4">
        <span className="px-3 py-1 rounded-2 bg-blue-100 text-blue-800 fw-semibold" style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8", fontSize: "12px" }}>
          Listening Matching
        </span>
      </div>
      <div className="row g-4 mb-5">
        <div className="col-md-6">
          <div className="p-4 rounded-3 border" style={{ backgroundColor: "#FAFAFA" }}>
            <div className="d-flex gap-4 align-items-center mb-4">
              <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white" style={{ width: "50px", height: "50px" }}>
                <i className="bi bi-play-fill" style={{ fontSize: "24px" }}></i>
              </div>
              <div className="flex-grow-1">
                <p className="fw-bold mb-1" style={{ fontSize: "16px" }}>{question.trackName}</p>
                <p className="text-muted mb-2" style={{ fontSize: "14px" }}>Số lần nghe còn lại: {question.listensLeft}</p>
                <div className="progress" style={{ height: "8px", borderRadius: "4px" }}>
                  <div className="progress-bar" role="progressbar" style={{ width: "0%", backgroundColor: "#3B82F6", borderRadius: "4px" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <h3 className="fw-bold mb-4" style={{ fontSize: "20px" }}>{question.instruction}</h3>
      <div className="row g-4">
        <div className="col-md-6">
          {speaker ? (
            <div className="mb-3">
              <p className="fw-bold mb-2" style={{ fontSize: "16px" }}>Speaker {speaker.id}</p>
              <select
                className="form-select"
                value={answers[`${currentQuestion}`] || ""}
                onChange={(e) => onAnswerChange(`${currentQuestion}`, e.target.value)}
              >
                <option value="">Chọn đáp án</option>
                {question.options.map((opt, optIdx) => (
                  <option key={`opt-${optIdx}`} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ) : (
            question.speakers.map((speakerItem, idx) => (
              <div key={`speaker-${idx}`} className="mb-3">
                <p className="fw-bold mb-2" style={{ fontSize: "16px" }}>Speaker {speakerItem.id}</p>
                <select
                  className="form-select"
                  value={answers[`${currentQuestion}-${idx}`] || ""}
                  onChange={(e) => onAnswerChange(`${currentQuestion}-${idx}`, e.target.value)}
                >
                  <option value="">Chọn đáp án</option>
                  {question.options.map((opt, optIdx) => (
                    <option key={`opt-${optIdx}`} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ListeningSpeakerMatching;
