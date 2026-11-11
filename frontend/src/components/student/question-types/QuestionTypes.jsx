import React from 'react';
import Phonetics from './Phonetics';
import MultipleChoice from './MultipleChoice';
import ListeningMultipleChoice from './ListeningMultipleChoice';
import ListeningDictation from './ListeningDictation';
import Trios from './Trios';
import ListeningSpeakerMatching from './ListeningSpeakerMatching';
import Reading from './Reading';
import FillBlank from './FillBlank';
import WordForm from './WordForm';
import WordBank from './WordBank';
import MatchingPairs from './MatchingPairs';
import InsertSentence from './InsertSentence';
import ErrorCorrection from './ErrorCorrection';
import SentenceRewrite from './SentenceRewrite';
import EssayWriting from './EssayWriting';
import OpenCloze from './OpenCloze';
import ReadingShortAnswer from './ReadingShortAnswer';
import ClosestMeaning from './ClosestMeaning';
import IdiomExplanation from './IdiomExplanation';
import SentenceArrangement from './SentenceArrangement';

/**
 * Backend lưu dạng câu hỏi bằng mã danh mục LOAI_CAU_HOI (CQ_*), còn các
 * renderer ở đây vốn được viết theo tên kiểu cũ ("multiple-choice"...). Không
 * mã nào khớp nên trước đây MỌI câu hỏi của đề thật đều rơi vào nhánh mặc
 * định và hiện "Loại câu hỏi không được hỗ trợ".
 *
 * Bảng này quy mã danh mục về tên renderer. Các mã đã bị vô hiệu hoá trong
 * danh mục vẫn được giữ để dữ liệu cũ không vỡ.
 */
const RENDERER_THEO_MA = {
  CQ_TRAC_NGHIEM_1: 'multiple-choice',
  CQ_DIEN_TU_DANH_SACH: 'word-bank',
  CQ_NOI_GHEP: 'matching-pairs',
  CQ_SAP_XEP_CAU: 'sentence-arrangement',
  CQ_TU_LUAN: 'essay-writing',
  CQ_DIEN_KHUYET_TU_NHAP: 'fill-blank',
  CQ_WORD_FORM: 'word-form',
  CQ_ERROR_CORRECTION: 'error-correction',
  CQ_SENTENCE_TRANSFORM: 'sentence-rewrite',
  CQ_SHORT_ANSWER: 'reading-short-answer',
  CQ_IDIOM: 'idiom-explanation',
  CQ_INSERT_SENTENCE: 'insert-sentence',
  CQ_TRIOS: 'trios',
  CQ_HOAN_THIEN_CAU: 'listening-dictation',
  CQ_PHAN_LOAI: 'matching-pairs',

  // Mã cũ đã vô hiệu hoá trong danh mục, dữ liệu cũ vẫn có thể còn.
  CQ_MATCHING_HEADINGS: 'matching-pairs',
  CQ_MATCHING_PARAGRAPH: 'matching-pairs',
  CQ_DOC_HIEU: 'multiple-choice',
  CQ_DOAN_VAN_BLANK: 'multiple-choice',
};

const QuestionTypes = ({
  question,
  assignment,
  currentQuestion,
  answers,
  onAnswerChange,
  currentSubIndex
}) => {
  const answer = answers[currentQuestion];

  // Mã danh mục thì tra bảng, còn tên kiểu cũ thì dùng thẳng.
  const renderer = RENDERER_THEO_MA[question.type] || question.type;

  switch (renderer) {
    case "phonetics":
      return <Phonetics question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "multiple-choice":
      return <MultipleChoice question={question} assignment={assignment} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "listening-multiple-choice":
      return <ListeningMultipleChoice question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "listening-dictation":
      return <ListeningDictation
        question={question}
        assignment={assignment}
        currentQuestion={currentQuestion}
        answers={answers}
        onAnswerChange={onAnswerChange}
      />;
    case "trios":
      return <Trios question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "listening-speaker-matching":
      return <ListeningSpeakerMatching 
        question={question} 
        currentQuestion={currentQuestion} 
        currentSubIndex={currentSubIndex}
        answers={answers} 
        onAnswerChange={onAnswerChange} 
      />;
    case "reading":
      return <Reading 
        question={question}
        assignment={assignment}
        currentQuestion={currentQuestion} 
        currentSubIndex={currentSubIndex} 
        answers={answers} 
        onAnswerChange={onAnswerChange} 
      />;
    case "fill-blank":
    case "fill-in-the-blanks":
      return <FillBlank question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "word-form":
      return <WordForm question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "word-bank":
      // Cac cho trong cung mot bai doc dung chung mot danh sach tu, moi tu chi
      // dung mot lan -> renderer can thay dap an cua ca nhom, khong chi cau nay.
      return <WordBank
        question={question}
        assignment={assignment}
        currentQuestion={currentQuestion}
        answer={answer}
        answers={answers}
        onAnswerChange={onAnswerChange}
      />;
    case "matching-pairs":
    case "matching-headings":
      return <MatchingPairs
        question={question}
        currentQuestion={currentQuestion}
        answer={answer}
        onAnswerChange={onAnswerChange}
      />;
    case "insert-sentence":
      return <InsertSentence question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "error-correction":
      return <ErrorCorrection 
        question={question} 
        currentQuestion={currentQuestion} 
        answers={answers} 
        onAnswerChange={onAnswerChange} 
      />;
    case "sentence-rewrite":
      return <SentenceRewrite question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "essay-writing":
      return <EssayWriting question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "open-cloze":
      return <OpenCloze 
        question={question} 
        currentQuestion={currentQuestion} 
        currentSubIndex={currentSubIndex} 
        answers={answers} 
        onAnswerChange={onAnswerChange} 
      />;
    case "reading-short-answer":
      return <ReadingShortAnswer question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "closest-meaning":
      return <ClosestMeaning question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "idiom-explanation":
      return <IdiomExplanation question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    case "sentence-arrangement":
      return <SentenceArrangement question={question} currentQuestion={currentQuestion} answer={answer} onAnswerChange={onAnswerChange} />;
    default:
      // Nêu rõ mã bị thiếu thay vì báo chung chung, để khi thêm dạng mới vào
      // danh mục mà quên khai báo ở RENDERER_THEO_MA thì nhìn là biết ngay.
      return (
        <div style={{ padding: '24px' }}>
          <div
            style={{
              border: '1px solid #FCA5A5',
              backgroundColor: '#FEF2F2',
              borderRadius: '12px',
              padding: '20px 24px',
            }}
          >
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#B91C1C', margin: '0 0 6px' }}>
              Chưa hiển thị được câu này
            </p>
            <p style={{ fontSize: '14px', color: '#7F1D1D', margin: 0, lineHeight: 1.6 }}>
              Hệ thống chưa có giao diện cho dạng câu hỏi{' '}
              <code style={{ fontWeight: 700 }}>{String(question.type || 'không rõ')}</code>.
              Bạn báo lại giáo viên để được hỗ trợ.
            </p>
          </div>
        </div>
      );
  }
};

export default QuestionTypes;
