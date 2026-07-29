export type ConnectionTestStatus = 'idle' | 'testing' | 'connected' | 'warning' | 'failed';

export interface ConnectionTestResult {
  status: ConnectionTestStatus;
  attemptedAt: string | null;
  durationMs: number | null;
  httpStatus: number | null;
  httpStatusText: string | null;
  contentType: string | null;
  responseSizeBytes: number | null;
  responseLooksLikeXml: boolean | null;
  responseLooksLikeVersionOne: boolean | null;
  message: string;
  technicalDetail: string | null;
}
