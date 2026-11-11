import React, { useState, useEffect } from 'react';
import QuestionContext from './QuestionContext';

const SentenceArrangement = ({ question, currentQuestion, answer, onAnswerChange }) => {
  const debai = question.debai || {};
  const cauHoiGoc = debai.cauHoiGoc || question.question;
  const danhSach = debai.danhSach || [];

  // Initialize the list order
  const [orderedItems, setOrderedItems] = useState([]);
  
  // Track dragging state
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    if (danhSach.length > 0) {
      if (answer && Array.isArray(answer) && answer.length === danhSach.length) {
        // If there's an existing answer array of IDs, reconstruct the order
        const restored = answer.map(id => danhSach.find(item => item.id === id)).filter(Boolean);
        if (restored.length === danhSach.length) {
          setOrderedItems(restored);
          return;
        }
      }
      // Otherwise, use the original order
      setOrderedItems([...danhSach]);
      
      // If we don't have an answer yet, set the initial arrangement as the answer
      if (!answer) {
        onAnswerChange(currentQuestion, danhSach.map(item => item.id));
      }
    }
  }, [danhSach, answer, currentQuestion]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // For Firefox compatibility
    e.dataTransfer.setData("text/html", e.target.parentNode);
    e.dataTransfer.setDragImage(e.target.parentNode, 20, 20);
  };

  const handleDragOver = (index) => {
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }
    const itemsCopy = [...orderedItems];
    const draggedItem = itemsCopy[draggedIndex];
    
    // Remove the item from original position
    itemsCopy.splice(draggedIndex, 1);
    // Insert at new position
    itemsCopy.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setOrderedItems(itemsCopy);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    onAnswerChange(currentQuestion, orderedItems.map(item => item.id));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const itemsCopy = [...orderedItems];
    const temp = itemsCopy[index];
    itemsCopy[index] = itemsCopy[index - 1];
    itemsCopy[index - 1] = temp;
    setOrderedItems(itemsCopy);
    onAnswerChange(currentQuestion, itemsCopy.map(item => item.id));
  };

  const moveDown = (index) => {
    if (index === orderedItems.length - 1) return;
    const itemsCopy = [...orderedItems];
    const temp = itemsCopy[index];
    itemsCopy[index] = itemsCopy[index + 1];
    itemsCopy[index + 1] = temp;
    setOrderedItems(itemsCopy);
    onAnswerChange(currentQuestion, itemsCopy.map(item => item.id));
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#F3E8FF",
          color: "#7E22CE",
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Sắp xếp câu
        </span>
        <span style={{
          backgroundColor: "#D1FAE5",
          color: "#047857",
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Tự động chấm
        </span>
      </div>

      <QuestionContext huongDan={debai.huongDan} doanVan={debai.doanVan} />

      <h3 style={{
        fontSize: "16px",
        fontWeight: 600,
        color: "#2563EB",
        marginBottom: "12px"
      }}>
        Câu {currentQuestion + 1}
      </h3>

      {cauHoiGoc && (
        <p style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#111827",
          marginBottom: "24px",
          lineHeight: "1.4"
        }}>
          <span dangerouslySetInnerHTML={{ __html: cauHoiGoc }} />
        </p>
      )}

      <p style={{ marginBottom: "16px", color: "#6B7280", fontSize: "14px" }}>
        Kéo thả hoặc sử dụng nút mũi tên để sắp xếp các câu theo thứ tự đúng:
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {orderedItems.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={() => handleDragOver(idx)}
            onDragEnd={handleDragEnd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px",
              border: "2px solid #E5E7EB",
              borderRadius: "12px",
              backgroundColor: draggedIndex === idx ? "#F3F4F6" : "#FFFFFF",
              opacity: draggedIndex === idx ? 0.5 : 1,
              cursor: "grab",
              transition: "all 0.2s"
            }}
          >
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}>
              <button 
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                style={{ 
                  border: "none", 
                  background: "none", 
                  cursor: idx === 0 ? "not-allowed" : "pointer",
                  color: idx === 0 ? "#D1D5DB" : "#6B7280",
                  padding: "4px"
                }}
              >
                ▲
              </button>
              <button 
                onClick={() => moveDown(idx)}
                disabled={idx === orderedItems.length - 1}
                style={{ 
                  border: "none", 
                  background: "none", 
                  cursor: idx === orderedItems.length - 1 ? "not-allowed" : "pointer",
                  color: idx === orderedItems.length - 1 ? "#D1D5DB" : "#6B7280",
                  padding: "4px"
                }}
              >
                ▼
              </button>
            </div>
            
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#E5E7EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              color: "#374151"
            }}>
              {item.id}
            </div>
            
            <span style={{
              fontSize: "16px",
              color: "#111827",
              flex: 1
            }}>
              <span dangerouslySetInnerHTML={{ __html: item.text }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SentenceArrangement;
