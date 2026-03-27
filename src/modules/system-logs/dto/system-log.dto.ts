export class SystemLogDto {
  id: string;
  user_id: string | null;
  action: string;
  ip: string | null;
  user_agent: string | null;
  description: string | null;
  created_at: Date;
}
