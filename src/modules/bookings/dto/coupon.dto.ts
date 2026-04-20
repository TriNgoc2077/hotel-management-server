import { DiscountType } from '@/common/enums/booking.enum';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreateCouponDto {
    @IsString()
    code: string;

    @IsEnum(DiscountType)
    discountType: DiscountType;

    @IsNumber()
    discountValue: number;

    @IsOptional()
    expiredAt: Date;
}

export class ApplyCouponDto {
    @IsString()
    bookingId: string;

    @IsString()
    couponCode: string;
}