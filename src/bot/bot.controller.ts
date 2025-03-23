import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bots')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startBot(): Promise<void> {
    await this.botService.startSimpleBot();
  }
}