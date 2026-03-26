import { IsString, IsIn, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsIn(['Admin', 'Staff', 'Customer'])
  @MaxLength(50)
  name: string;
}
