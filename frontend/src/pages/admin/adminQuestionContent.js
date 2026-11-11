/**
 * Cầu nối giữa trạng thái soạn thảo trên UI và JSON lưu trong
 * nganhangcauhoi.NoiDungChiTiet (debai / dapan / giaithich / loai / tags).
 *
 * Mỗi dạng câu hỏi có hình dạng đề bài và đáp án riêng, backend không áp đặt
 * schema con — toàn bộ quy ước nằm ở đây và phải khớp với dữ liệu seed
 * trong scripts/SQL insert bài tập.
 */

// ---------------------------------------------------------------------------
// 1. Ánh xạ nhãn dạng câu hỏi trên UI -> mã LOAI_CAU_HOI trong CSDL
// ---------------------------------------------------------------------------

export const QUESTION_TYPE_CODE_BY_FORMAT = {
  'Trắc nghiệm 1 đáp án': 'CQ_TRAC_NGHIEM_1',
  'Trắc nghiệm nhiều đáp án': 'CQ_TRAC_NGHIEM_NHIEU',
  'Điền từ vào chỗ trống/khuyết': 'CQ_DIEN_KHUYET_TU_NHAP',
  'Điền từ vào chỗ trống tương ứng từ một danh sách từ cho trước': 'CQ_DIEN_TU_DANH_SACH',
  'Cho dạng đúng của từ': 'CQ_WORD_FORM',
  'Nối ghép các phần tương ứng': 'CQ_NOI_GHEP',
  'Nối các phần tương ứng': 'CQ_NOI_GHEP',
  'Tìm một từ dùng trong nhiều câu': 'CQ_TRIOS',
  'Trả lời ngắn': 'CQ_SHORT_ANSWER',
  'Chèn câu vào đoạn văn': 'CQ_INSERT_SENTENCE',
  'Tìm và sửa lỗi sai': 'CQ_ERROR_CORRECTION',
  'Viết lại câu': 'CQ_SENTENCE_TRANSFORM',
  'Giải thích thành ngữ hoặc cụm từ': 'CQ_IDIOM',
  'Sắp xếp câu thành đoạn văn / hội thoại': 'CQ_SAP_XEP_CAU',
  'Hoàn thiện câu': 'CQ_HOAN_THIEN_CAU',
  'Phân loại': 'CQ_PHAN_LOAI',
  'Viết câu': 'CQ_TU_LUAN',
  'Viết đoạn văn': 'CQ_TU_LUAN',
  'Viết bài luận': 'CQ_TU_LUAN',
};

// Bài đọc dùng chung KHÔNG phải một dạng câu hỏi riêng — nó chỉ là việc bài tập
// có điền NoiDungNguCanhChung hay không. Các mã dưới đây là dữ liệu cũ, quy về
// đúng dạng trả lời tương ứng khi đọc lên.
const LEGACY_CODE_ALIAS = {
  CQ_DOC_HIEU: 'CQ_TRAC_NGHIEM_1',
  CQ_DOAN_VAN_BLANK: 'CQ_TRAC_NGHIEM_1',
  CQ_MATCHING_HEADINGS: 'CQ_NOI_GHEP',
  CQ_MATCHING_PARAGRAPH: 'CQ_NOI_GHEP',
};

// Chiều ngược lại. Nhiều nhãn cùng trỏ về một mã (vd 3 dạng Viết -> CQ_TU_LUAN)
// nên chỉ giữ nhãn đầu tiên làm đại diện khi đọc dữ liệu về.
export const FORMAT_BY_QUESTION_TYPE_CODE = Object.entries(QUESTION_TYPE_CODE_BY_FORMAT).reduce(
  (accumulator, [format, code]) => {
    if (!accumulator[code]) {
      accumulator[code] = format;
    }
    return accumulator;
  },
  {}
);

export const getQuestionTypeCode = (questionFormat) =>
  QUESTION_TYPE_CODE_BY_FORMAT[questionFormat] || '';

export const getFormatFromCode = (code) =>
  FORMAT_BY_QUESTION_TYPE_CODE[LEGACY_CODE_ALIAS[code] ?? code] || '';

/**
 * Dựng bảng tra nhãn -> mã từ dữ liệu /bootstrap, để trình độ / mức độ / kỹ năng
 * lấy trực tiếp từ CSDL thay vì gán cứng trong mã nguồn.
 */
export const createCatalogLookup = (options = []) => {
  const byLabel = new Map();
  options.forEach((option) => {
    const label = option?.label ?? option?.Label;
    const code = option?.code ?? option?.Code;
    if (label && code) {
      byLabel.set(String(label).trim().toLowerCase(), code);
    }
  });

  return (label, fallback = '') => byLabel.get(String(label || '').trim().toLowerCase()) || fallback;
};

// ---------------------------------------------------------------------------
// 2. Nhãn a, b, c... cho các dạng có danh sách
// ---------------------------------------------------------------------------

const lowerLabel = (index) => String.fromCharCode(97 + index);
const upperLabel = (index) => String.fromCharCode(65 + index);

const toList = (items = [], labeller) =>
  items.map((text, index) => ({ id: labeller(index), text: String(text ?? '') }));

const fromList = (list) =>
  Array.isArray(list) ? list.map((item) => (typeof item === 'string' ? item : item?.text ?? '')) : [];

const splitOrder = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// ---------------------------------------------------------------------------
// 3. UI -> JSON
// ---------------------------------------------------------------------------

/**
 * Dựng cặp deBai/dapAn cho MỘT câu hỏi con.
 * Mỗi câu con là một dòng baitapcauhoi riêng, nên không còn bọc cauHoiCon nữa.
 */
export const buildSingleQuestion = (mode, question) => buildOne(mode, question);

const buildOne = (mode, question) => {
  const prompt = question.prompt || '';

  switch (mode) {
    case 'single_choice':
    case 'multi_choice': {
      const options = question.options || [];
      const deBai = {
        cauHoiGoc: prompt,
        luaChon: options.map((option, index) => ({
          id: option.label || upperLabel(index),
          text: option.text || '',
        })),
      };
      const correct = options
        .map((option, index) => ({ option, id: option.label || upperLabel(index) }))
        .filter((entry) => entry.option.isCorrect)
        .map((entry) => entry.id);

      return { deBai, dapAn: mode === 'single_choice' ? correct[0] ?? '' : correct };
    }

    case 'sentence_arrangement': {
      const sentences = question.arrangementSentences || [];
      return {
        deBai: { cauHoiGoc: prompt, danhSach: toList(sentences, lowerLabel) },
        dapAn: splitOrder(question.arrangementCorrectOrder).map((item) => item.toLowerCase()),
      };
    }

    case 'matching': {
      const pairs = question.matchingPairs || [];
      return {
        deBai: {
          cauHoiGoc: prompt,
          danhSachTrai: toList(question.leftItems || [], (index) => `t${index + 1}`),
          danhSachPhai: toList(question.rightItems || [], lowerLabel),
        },
        dapAn: pairs.reduce((accumulator, pair) => {
          if (pair?.left) {
            accumulator[pair.left] = pair.right ?? '';
          }
          return accumulator;
        }, {}),
      };
    }

    case 'classification': {
      const items = question.classificationItems || [];
      return {
        deBai: {
          cauHoiGoc: prompt,
          nhom: question.classificationGroups || [],
          danhSach: items.map((item, index) => ({ id: lowerLabel(index), text: item?.value || '' })),
        },
        dapAn: items.reduce((accumulator, item, index) => {
          accumulator[lowerLabel(index)] = item?.group || '';
          return accumulator;
        }, {}),
      };
    }

    case 'cloze_from_list':
      // Đoạn văn và word bank nằm ở cấp bài tập, câu con chỉ giữ số chỗ trống
      // và từ được chọn cho chỗ đó.
      return {
        deBai: { cauHoiGoc: prompt, soChoTrong: Number(question.blankNumber || 0) },
        dapAn: question.blankAnswer || '',
      };

    case 'insert_sentence':
      return {
        deBai: { cauHoiGoc: prompt, doanVan: question.passage || '', cauChen: question.insertSentence || '' },
        dapAn: question.correctPosition || '',
      };

    case 'error_correction':
      return {
        deBai: { cauHoiGoc: prompt, doanVan: question.wrongText || '' },
        dapAn: { sai: question.wrongText || '', dung: question.correctedText || '' },
      };

    case 'sentence_rewrite':
      return {
        deBai: { cauHoiGoc: prompt, cauGoc: question.sourceSentence || '' },
        dapAn: { dapAnMau: question.sampleAnswer || '', huongDanCham: question.gradingGuide || '' },
      };

    case 'essay':
      return {
        deBai: {
          cauHoiGoc: prompt,
          gioiHanTu: { toiThieu: Number(question.minWords || 0), toiDa: Number(question.maxWords || 0) },
        },
        dapAn: {
          dapAnMau: question.sampleAnswer || '',
          huongDanCham: question.gradingGuide || '',
          rubric: (question.rubricCriteria || []).filter(Boolean),
        },
      };

    default: {
      // short_text, gap_fill và các dạng còn lại: đáp án là danh sách chuỗi chấp nhận được.
      const answers = (question.acceptedAnswers || []).map((item) => String(item ?? '').trim()).filter(Boolean);
      return { deBai: { cauHoiGoc: prompt }, dapAn: answers };
    }
  }
};

/**
 * Gộp một bài tập con (có thể nhiều câu hỏi con) thành cặp deBai/dapAn.
 * Một câu con  -> lưu phẳng, khớp đúng dữ liệu seed.
 * Nhiều câu con -> bọc trong cauHoiCon để không mất câu nào.
 */
/**
 * Dựng payload gửi lên API cho cả bài tập ngân hàng.
 * Bài đọc / hướng dẫn nằm ở cấp bài tập (cột riêng của baitap),
 * mỗi câu con là một phần tử trong cauHoiCon.
 */
export const buildBankExercisePayload = ({
  mode, exercise, questions, courseId, bankId, trangThaiDuyet, catalog,
}) => ({
  maKhoaHoc: courseId,
  // Ngân hàng đề chứa bài tập này (bảng nganhangde).
  maNganHang: bankId || null,
  // DRAFT | PENDING | APPROVED | RETIRED. Bỏ trống thì backend giữ trạng thái cũ.
  trangThaiDuyet: trangThaiDuyet || null,
  code: exercise?.code || '',
  tenBaiTap: exercise?.title || '',
  huongDanChung: exercise?.huongDanChung || null,
  noiDungNguCanhChung: exercise?.content || null,
  amThanhLink: exercise?.audioUrl || null,
  hinhAnhLink: exercise?.imageUrl || null,
  loaiCauHoiCode: getQuestionTypeCode(exercise?.questionFormat),
  mucDoCode: catalog?.mucDoCode || 'TRUNG_BINH',
  trinhDoCode: catalog?.trinhDoCode || null,
  kyNangCode: catalog?.kyNangCode || null,
  ghiChu: exercise?.note || null,
  // Word bank dùng chung cho mọi chỗ trống của bài (dạng điền từ từ danh sách).
  danhSachTu: (exercise?.wordBank || []).map((item) => String(item ?? '').trim()).filter(Boolean),
  cauHoiCon: (questions || []).filter(Boolean).map((question, index) => {
    const built = buildOne(mode, question);
    return {
      soCau: question.soCau || `Câu ${index + 1}`,
      thuTu: index + 1,
      diemCuaCau: Number(question.score || 1),
      deBai: built.deBai,
      dapAn: built.dapAn,
      giaiThich: question.explanation || null,
    };
  }),
});

// ---------------------------------------------------------------------------
// 4. JSON -> UI
// ---------------------------------------------------------------------------

const parseOne = (mode, deBai = {}, dapAn, explanation, createBase) => {
  const question = createBase();
  question.prompt = deBai.cauHoiGoc || deBai.text || deBai.html || '';
  question.explanation = explanation || '';

  switch (mode) {
    case 'single_choice':
    case 'multi_choice': {
      const correct = Array.isArray(dapAn) ? dapAn.map(String) : [String(dapAn ?? '')];
      question.options = (deBai.luaChon || []).map((option, index) => ({
        id: `OPT-${index}`,
        label: option?.id || upperLabel(index),
        text: option?.text || '',
        isCorrect: correct.includes(String(option?.id ?? upperLabel(index))),
      }));
      question.acceptedAnswers = [];
      break;
    }

    case 'sentence_arrangement':
      question.arrangementSentences = fromList(deBai.danhSach);
      question.arrangementCorrectOrder = Array.isArray(dapAn) ? dapAn.join(', ') : String(dapAn ?? '');
      question.acceptedAnswers = [];
      break;

    case 'matching':
      question.leftItems = fromList(deBai.danhSachTrai);
      question.rightItems = fromList(deBai.danhSachPhai);
      question.matchingPairs = Object.entries(dapAn || {}).map(([left, right]) => ({ left, right }));
      question.acceptedAnswers = [];
      break;

    case 'classification':
      question.classificationGroups = deBai.nhom || [];
      question.classificationItems = (deBai.danhSach || []).map((item) => ({
        value: item?.text || '',
        group: (dapAn || {})[item?.id] || '',
      }));
      question.acceptedAnswers = [];
      break;

    case 'cloze_from_list':
      question.blankNumber = Number(deBai.soChoTrong || 0);
      question.blankAnswer = typeof dapAn === 'string' ? dapAn : '';
      question.acceptedAnswers = [];
      break;

    case 'insert_sentence':
      question.passage = deBai.doanVan || '';
      question.insertSentence = deBai.cauChen || '';
      question.correctPosition = String(dapAn ?? '');
      break;

    case 'error_correction':
      question.wrongText = (dapAn || {}).sai || deBai.doanVan || '';
      question.correctedText = (dapAn || {}).dung || '';
      break;

    case 'sentence_rewrite':
      question.sourceSentence = deBai.cauGoc || '';
      question.sampleAnswer = (dapAn || {}).dapAnMau || '';
      question.gradingGuide = (dapAn || {}).huongDanCham || '';
      break;

    case 'essay':
      question.minWords = Number(deBai.gioiHanTu?.toiThieu || 0);
      question.maxWords = Number(deBai.gioiHanTu?.toiDa || 0);
      question.sampleAnswer = (dapAn || {}).dapAnMau || '';
      question.gradingGuide = (dapAn || {}).huongDanCham || '';
      question.rubricCriteria = (dapAn || {}).rubric || question.rubricCriteria;
      break;

    default:
      question.acceptedAnswers = Array.isArray(dapAn)
        ? dapAn.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        : [String(dapAn ?? '')];
      break;
  }

  return question;
};

/**
 * Dựng lại MỘT câu hỏi con để đổ vào trình soạn thảo.
 * createBase() phải trả về đúng object mặc định của createChildQuestion.
 */
export const parseSingleQuestion = ({ mode, deBai, dapAn, giaiThich, createBase }) =>
  parseOne(mode, deBai && typeof deBai === 'object' ? deBai : {}, dapAn, giaiThich, createBase);
