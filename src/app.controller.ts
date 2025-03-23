import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { VerifyCodeDto } from './dtos/verify-code.dto';
import { ResponseDto } from './dtos/response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/auth/verify')
  verifyCode(@Body() body: VerifyCodeDto): Promise<ResponseDto> {

    return this.appService.verifyCode(body.code);

  }

}
