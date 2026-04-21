import { Controller, Post, Body, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Public } from 'src/common/decorators/public.decorator';
import { SePayPayload } from './dto/sepay.payload.dto';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Public()
  @Post('sepay')
  @HttpCode(HttpStatus.OK)
  async handleSePayWebhook(
    @Body() payload: SePayPayload,
    @Headers('authorization') authHeader: string,
  ) {
    const apiKey = process.env.SEPAY_API_KEY;
    if (apiKey) {
      if (!authHeader || !authHeader.includes(apiKey)) {
        throw new UnauthorizedException('Invalid API Key');
      }
    }

    await this.webhookService.processSePayTransaction(payload);
    
    return { success: true };
  }
}
