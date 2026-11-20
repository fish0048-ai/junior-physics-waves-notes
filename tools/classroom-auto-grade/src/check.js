/**
 * @typedef {"完成"|"未完成"|"看不清"} CheckStatus
 * @typedef {{
 *   readable: boolean,
 *   hasMarked: boolean,
 *   hasCorrected: boolean,
 *   evidence: string,
 *   provider: string,
 *   model?: string,
 *   notes?: string
 * }} VisionCheckResult
 * @typedef {{
 *   seat?: string,
 *   name?: string,
 *   label: string,
 *   hasMarked: boolean,
 *   hasCorrected: boolean,
 *   status: CheckStatus,
 *   evidence: string,
 *   provider?: string,
 *   notes?: string
 * }} StudentCheckReport
 */

/**
 * 依判準推導整體狀態。
 * - 看不清：照片無法判斷（勿猜成完成）
 * - 完成：有批改且有異色訂正
 * - 未完成：其餘可判斷情形（只有勾、完全沒改等）
 * @param {{ readable: boolean, hasMarked: boolean, hasCorrected: boolean }} input
 * @returns {CheckStatus}
 */
export function deriveStatus(input) {
  if (!input.readable) return "看不清";
  if (input.hasMarked && input.hasCorrected) return "完成";
  return "未完成";
}

/**
 * 正規化 vision 結果並產出學生報告列。
 * @param {import("./ingest.js").StudentSubmission} student
 * @param {Partial<VisionCheckResult> & { provider?: string }} raw
 * @returns {StudentCheckReport}
 */
export function buildStudentReport(student, raw) {
  const readable = raw.readable === true;
  // 看不清時不要沿用模型對 hasMarked／hasCorrected 的猜測
  const hasMarked = readable && raw.hasMarked === true;
  const hasCorrected = readable && raw.hasCorrected === true;
  const status = deriveStatus({ readable, hasMarked, hasCorrected });
  const evidence =
    typeof raw.evidence === "string" && raw.evidence.trim()
      ? raw.evidence.trim()
      : status === "看不清"
        ? "照片模糊、裁切或反光，無法判斷是否有批改與訂正"
        : "模型未提供依據";

  return {
    seat: student.seat,
    name: student.name,
    label: student.label,
    hasMarked,
    hasCorrected,
    status,
    evidence,
    provider: raw.provider,
    notes: raw.notes,
  };
}
