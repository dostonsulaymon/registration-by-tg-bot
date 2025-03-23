import { Injectable } from '@nestjs/common';
import { ResponseDto } from './dtos/response.dto';
import { BotService } from './bot/bot.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MoreThan, Repository } from 'typeorm';
import { AuthCode } from './entities/auth-code.entity';

@Injectable()
export class AppService {
  constructor(
    private botService: BotService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthCode)
    private authCodeRepository: Repository<AuthCode>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async verifyCode(code: string): Promise<ResponseDto> {
    const authCode = await this.authCodeRepository.findOne({
      where: {
        code,
        expiresAt: MoreThan(new Date()), // ensures code isn't expired
      },
      relations: ['user'], // get user info along with auth code
    });

    if (!authCode) {
      return {
        isValid: false,
      };
    }

    const user = authCode.user;

    return {
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      isValid: true,
    };
  }


}
