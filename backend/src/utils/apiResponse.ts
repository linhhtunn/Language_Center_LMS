// Giu dung dang du lieu tra ve cua ApiResponseDto ben .NET de frontend khong phai sua:
// { success, message, code, messageKey, errorCode, data }

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  code: string;
  messageKey: string | null;
  errorCode: string | null;
  data: T | null;
}

export function ok<T>(data: T, message = 'Thành công', code = 'SUCCESS', messageKey = 'COMMON.SUCCESS'): ApiResponse<T> {
  return { success: true, message, code, messageKey, errorCode: null, data };
}

export function fail<T = null>(message: string, errorCode?: string, messageKey?: string): ApiResponse<T> {
  const code = errorCode?.trim() ? errorCode : 'ERROR_UNKNOWN';
  return { success: false, message, code, messageKey: messageKey ?? code, errorCode: code, data: null };
}

/** Loi nghiep vu co kem HTTP status, nem ra trong service va duoc errorHandler bat. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR_UNKNOWN',
  ) {
    super(message);
  }
}
