import { Router } from 'express';
import { adminStudyContentRouter } from './adminStudyContent.js';
import { studentStudyContentRouter } from './studentStudyContent.js';
import { teacherStudyContentRouter } from './teacherStudyContent.js';

// Noi dung hoc tap (chuong hoc + tai lieu), chuyen tu 3 controller .NET:
//   AdminStudyContentController   -> /api/AdminStudyContent/...   (quyen STUDY_CONTENT_ADMIN)
//   TeacherStudyContentController -> /api/TeacherStudyContent/... (quyen STUDY_CONTENT_TEACHER)
//   StudentStudyContentController -> /api/StudentStudyContent/... (quyen STUDY_CONTENT_STUDENT)
// Router nay duoc gan o goc (app.use(router)) nen moi route ghi DU duong dan.
const router = Router();

router.use(adminStudyContentRouter);
router.use(teacherStudyContentRouter);
router.use(studentStudyContentRouter);

export default router;
