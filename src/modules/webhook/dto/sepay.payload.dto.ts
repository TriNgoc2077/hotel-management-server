import { IsNumber, IsString, IsOptional } from 'class-validator';

export class SePayPayload {
  @IsNumber()
  id: number;

  @IsString()
  gateway: string;

  @IsString()
  @IsOptional()
  transactionDate: string;

  @IsString()
  @IsOptional()
  accountNumber: string;

  @IsString()
  @IsOptional()
  code: string | null;

  @IsString()
  @IsOptional()
  content: string;

  @IsString()
  @IsOptional()
  transferType: string;

  @IsNumber()
  @IsOptional()
  transferAmount: number;

  @IsNumber()
  @IsOptional()
  accumulated: number;

  @IsString()
  @IsOptional()
  subAccount: string | null;

  @IsString()
  @IsOptional()
  referenceCode: string;

  @IsString()
  @IsOptional()
  description: string;
}