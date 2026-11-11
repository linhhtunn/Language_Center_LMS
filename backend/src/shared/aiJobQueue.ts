// Chuyen tu Services/AiFeedback/AiJobQueue.cs - hang doi trong bo nho cho tac vu AI chay nen.
// Mat job dang cho khi restart server la chap nhan duoc (giong ban .NET).
// Ben ghi: StudentAssignment (nop bai) goi enqueueAiJob(...).
// Ben doc: modules/aiFeedback/worker.ts goi startAiJobConsumer(handler) mot lan khi khoi dong.

export type AiJob =
  | { kind: 'Ai1'; maNopBai: string } // nhan xet + cham tu luan tung nhom bai/dang trong 1 lan nop
  | { kind: 'Ai2'; maNopBai: string } // tong hop ca bai sau khi moi nhom da AI1 DONE
  | { kind: 'Ai3'; maHocSinh: string; maKhoaHoc: string }; // so sanh tien bo qua cac lan nop

const queue: AiJob[] = [];
let wake: (() => void) | null = null;

export function enqueueAiJob(job: AiJob): void {
  queue.push(job);
  wake?.();
  wake = null;
}

/** Vong lap doc tuan tu (SingleReader nhu Channel ben .NET). Goi 1 lan. */
export function startAiJobConsumer(handler: (job: AiJob) => Promise<void>, signal?: AbortSignal): Promise<void> {
  return (async () => {
    while (!signal?.aborted) {
      const job = queue.shift();
      if (!job) {
        await new Promise<void>((resolve) => {
          wake = resolve;
          signal?.addEventListener('abort', () => resolve(), { once: true });
        });
        continue;
      }
      try {
        await handler(job);
      } catch (err) {
        console.error('[AiJobQueue] Job loi', job, err);
      }
    }
  })();
}

/** Chi dung trong test. */
export const _pendingAiJobs = () => [...queue];
