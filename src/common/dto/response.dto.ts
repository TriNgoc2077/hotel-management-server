export class MetaDto {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

export class PaginatedResponseDto<T> {
  meta: MetaDto;
  result: T[];
}
