/**
 * Chuyển Date sang format MySQL datetime: 'YYYY-MM-DD HH:MM:SS'
 * Mặc định dùng thời điểm hiện tại.
 *
 * Lý do không dùng toISOString():
 *   - toISOString() trả về UTC, không phải local timezone
 *   - Cần slice + replace thủ công, dễ sai nếu copy-paste
 */
export function toMysqlDatetime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())} ` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}:` +
    `${pad(date.getSeconds())}`
  );
}
