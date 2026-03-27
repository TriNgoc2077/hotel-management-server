export const INSERT_SYSTEM_LOG = `
  INSERT INTO system_logs (id, user_id, action, ip, user_agent, description)
  VALUES (?, ?, ?, ?, ?, ?)
`;

export const buildGetLogsQuery = (query: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
}) => {
  const { page, limit, userId, action } = query;

  let sql = `SELECT * FROM system_logs WHERE 1=1`;
  const params: any[] = [];

  // filter
  if (userId) {
    sql += ` AND user_id = ?`;
    params.push(userId);
  }

  if (action) {
    sql += ` AND action LIKE ?`;
    params.push(`%${action}%`);
  }

  // sort
  sql += ` ORDER BY created_at DESC`;

  // pagination (optional)
  if (page && limit) {
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
  }

  return { sql, params };
};
