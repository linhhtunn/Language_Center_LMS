import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { queryCI } from '../../utils/dotnetCompat.js';
import { sendClientError } from '../users/dotnetBinding.js';

// Chuyen tu SystemController.cs - [Route("api/[controller]")] = /api/System, [AllowAnonymous].
//
// IConfiguration["System:MigrateKey"] (bien moi truong System__MigrateKey ben .NET)
//   -> process.env.SYSTEM_MIGRATE_KEY (chap nhan ca ten cu System__MigrateKey).
// Chua dat key -> endpoint coi nhu khong ton tai (404); sai key -> 401.
//
// Khac biet bat buoc: Node khong chay duoc EF Core Migrations (ma C#). Schema cua ban Node do
// database/01_schema.sql quan ly. Endpoint doc bang __EFMigrationsHistory va so voi danh sach migration
// cua ban .NET cuoi cung: du het -> tra SUCCESS y het ban cu; con thieu -> 500 ERROR kem danh sach thieu.
const router = Router();

/** Danh sach migration trong QuanLyTrungTam/backend/Migrations (ban .NET cuoi cung). */
export const KNOWN_EF_MIGRATIONS = [
  '20260322120219_Baseline_HeThongHocOnline_Final',
  '20260324175733_CheckModelSync_20260325_v2',
  '20260329152242_AddLanCuoiDangNhapToNguoiDung',
  '20260413010802_CodeFirstSync_20260413',
  '20260428162401_AddClassScopedStudyContent',
  '20260502104538_AddQuestionBankRichFieldsForAssignments',
  '20260507085906_AddScheduleApi',
  '20260508035125_AddScheduleChangeRequestColumns',
  '20260509052650_AddDoiTuongToThongBao2',
  '20260722085750_AddNotificationAttachments',
  '20260722093818_CheckYeucaulichdaySync',
  '20260802051602_AddMissingFieldsAndTables',
  '20260805130000_HybridModule_BaiTapSinhDe_V5',
  '20260807120000_MoTaToJson',
  '20260807130000_WidenSoCau',
  '20260807140000_UniqueDanhMuc',
  '20260807150000_BaiTapMauNganHang',
  '20260807160000_MaCauHoiNullable',
  '20260807170000_NganHangDe',
  '20260808100000_NopBaiThieuCot',
  '20260923120000_AiNhanXetTables',
  '20261005090000_AiNhanXetChiTietCauHoi',
  '20261017120000_ChatbotAssistant',
];

const migrateKey = () => (process.env.SYSTEM_MIGRATE_KEY ?? process.env.System__MigrateKey ?? '').trim();

/** DbConnection.Database / DataSource lay tu chuoi ket noi. */
function connectionInfo() {
  try {
    const url = new URL(config.databaseUrl);
    return { database: decodeURIComponent(url.pathname.replace(/^\//, '')), host: url.hostname };
  } catch {
    return { database: '', host: '' };
  }
}

/** GetAppliedMigrationsAsync: bang lich su chua ton tai -> danh sach rong. */
async function appliedMigrations(): Promise<string[] | null> {
  const exists = await prisma.$queryRaw<{ n: bigint | number }[]>`
    SELECT COUNT(*) AS n FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = '__EFMigrationsHistory'`;
  if (Number(exists[0]?.n ?? 0) === 0) return null;
  const rows = await prisma.$queryRaw<{ MigrationId: string }[]>`
    SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId`;
  return rows.map((r) => r.MigrationId);
}

// POST /api/System/migrate?key=
router.post('/api/System/migrate', async (req, res) => {
  const expectedKey = migrateKey();
  if (!expectedKey) return sendClientError(res, 404);

  const key = queryCI(req, 'key');
  const a = Buffer.from(key ?? '', 'utf8');
  const b = Buffer.from(expectedKey, 'utf8');
  if (!key || a.length !== b.length || !timingSafeEqual(a, b)) return sendClientError(res, 401);

  try {
    const { database, host } = connectionInfo();
    const history = await appliedMigrations();
    const applied = history ?? [];
    // Khong co bang lich su EF = database duoc tao tu database/01_schema.sql (khong do EF quan ly).
    const pending = history === null ? [] : KNOWN_EF_MIGRATIONS.filter((m) => !applied.includes(m));

    if (pending.length === 0) {
      return res.json({
        status: 'SUCCESS',
        message: 'Database đã ở trạng thái mới nhất. Không có Migration nào cần áp dụng.',
        database,
        host,
        appliedCount: applied.length,
        pendingCount: 0,
      });
    }

    return res.status(500).json({
      status: 'ERROR',
      message:
        `Backend Node không chạy được EF Core Migrations. Còn ${pending.length} migration chưa áp dụng: ` +
        `${pending.join(', ')}. Hãy cập nhật schema bằng database/01_schema.sql.`,
    });
  } catch (ex) {
    return res.status(500).json({ status: 'ERROR', message: ex instanceof Error ? ex.message : String(ex) });
  }
});

export default router;
