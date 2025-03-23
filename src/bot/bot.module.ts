import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotService } from './bot.service';
import { User } from '../entities/user.entity';
import { AuthCode } from '../entities/auth-code.entity';
import { BotController } from './bot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthCode])],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
