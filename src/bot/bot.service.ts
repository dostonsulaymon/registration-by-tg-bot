import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot as GrammyBot } from 'grammy';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuthCode } from '../entities/auth-code.entity';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class BotService implements OnModuleInit {
  private bot: GrammyBot;
  private instructionsSent: Set<string> = new Set();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthCode)
    private authCodeRepository: Repository<AuthCode>,
  ) {}

  async onModuleInit() {
    setTimeout(() => this.initializeBot(), 0);
  }

  private async initializeBot() {
    try {
      await this.startSimpleBot();
      const botInfo = await this.bot.api.getMe();
      console.log(`${botInfo.username} starting bot...`);
    } catch (error) {
      console.error('Failed to start bot', error);
      throw error;
    }
  }

  public async startSimpleBot(): Promise<void> {
    const token = this.getBotToken();
    this.bot = new GrammyBot(token);
    this.initializeHandlers();
    await this.bot.start();
  }

  private getBotToken(): string {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      throw new Error('BOT_TOKEN not found in environment variables');
    }
    return token;
  }

  private initializeHandlers() {
    this.registerStartCommand();
    this.registerLoginCommand();
    this.registerContactHandler();
    this.registerRenewCommand();
  }

  private async askContact(ctx: any, firstName: string) {
    await ctx.reply(
      `🇺🇿\nSalom ${firstName} 👋 Viloyat Taxi'ning rasmiy botiga xush kelibsiz\n\n⬇ Kontaktingizni yuboring (tugmani bosib)\n\n🇺🇸\nHi ${firstName} 👋\nWelcome to Viloyat Taxi official bot\n\n⬇ Send your contact (by clicking button)`,
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: 'Share Contact / Kontaktni yuborish',
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  }

  private registerStartCommand() {
    this.bot.command('start', async (ctx) => {
      if (!ctx || !ctx.from) {
        console.error('User context is undefined');
        await ctx.reply(
          'Welcome to our bot! Please try again later if you experience any issues.',
        );
        return;
      }

      const firstName = ctx.from.first_name || 'User';
      await ctx.react('🆒');
      await this.askContact(ctx, firstName);
    });
  }

  private registerLoginCommand() {
    this.bot.command('login', async (ctx) => {
      if (!ctx || !ctx.from) {
        console.error('User context is undefined in login command');
        return;
      }

      const userIdStr = ctx.from.id.toString();
      const user = await this.userRepository.findOne({
        where: { telegramId: userIdStr },
      });

      if (!user) {
        await ctx.reply(
          '🇺🇿 Iltimos, avval kontaktingizni yuboring\n\n🇺🇸 Please share your contact first',
          {
            reply_markup: {
              keyboard: [
                [
                  {
                    text: 'Share Contact / Kontaktni yuborish',
                    request_contact: true,
                  },
                ],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          },
        );
        return;
      }

      const activeCode = await this.authCodeRepository.findOne({
        where: { userId: user.id, expiresAt: MoreThan(new Date()) },
      });

      if (activeCode) {
        if (activeCode) {
          if (ctx.callbackQuery) {
            // @ts-ignore
            await ctx.api.answerCallbackQuery(ctx.callbackQuery.id, {
              text: '🇺🇿 Eski kodingiz hali ham kuchda ☝️ ️',
              show_alert: true,
            });
          } else {
            await ctx.reply('🇺🇿 Eski kodingiz hali ham kuchda ☝️ ️');
          }
          return; // Important!
        }
      }

      await this.sendAuthCode(ctx, userIdStr, user.phoneNumber);
    });
  }

  private registerContactHandler() {
    this.bot.on(':contact', async (ctx) => {
      if (!ctx || !ctx.message || !ctx.from) {
        console.error('User context is undefined');
        await ctx.reply(
          'Welcome to our bot! Please try again later if you experience any issues.',
        );
        return;
      }

      const { phone_number, first_name, last_name } = ctx.message.contact;
      const userIdStr = ctx.from.id.toString();
      const username = ctx.from.username;

      let user = await this.userRepository.findOne({
        where: { telegramId: userIdStr },
      });

      if (user) {
        await this.userRepository.update(user.id, {
          phoneNumber: phone_number,
        });
      } else {
        // if phoneNumber doesn't contain +, make sure to add this!!

        user = await this.userRepository.save({
          telegramId: userIdStr,
          firstName: first_name,
          lastName: last_name,
          username: username,
          phoneNumber: phone_number,
        });
      }

      await this.sendAuthCodeFirstTime(ctx, userIdStr, phone_number);

      if (!this.instructionsSent.has(userIdStr)) {
        await ctx.reply(
          `🇺🇿 🔑 Yangi kod olish uchun /login ni bosing\n\n🇺🇸 🔑 To get a new code click /login`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              remove_keyboard: true,
            },
          },
        );
        this.instructionsSent.add(userIdStr);
      }
    });
  }

  private registerRenewCommand() {
    this.bot.callbackQuery('renew_code', async (ctx) => {
      try {
        const userIdStr = ctx.from?.id?.toString();
        if (!userIdStr) {
          await ctx.answerCallbackQuery({
            text: 'User not found',
            show_alert: true,
          });
          return;
        }

        const user = await this.userRepository.findOne({
          where: { telegramId: userIdStr },
        });

        if (!user) {
          await ctx.answerCallbackQuery({
            text: 'Avval kontaktingizni yuboring / Please share your contact first',
            show_alert: true,
          });
          return;
        }

        const activeCode = await this.authCodeRepository.findOne({
          where: { userId: user.id, expiresAt: MoreThan(new Date()) },
        });

        if (activeCode) {
          await ctx.answerCallbackQuery({
            text: 'Eski kodingiz hali ham kuchda ☝️ / Your code is still valid ☝️',
            show_alert: true,
          });
          return;
        }

        // Now safe to acknowledge callback query without text
        try {
          await ctx.answerCallbackQuery();
        } catch (ackError) {
          console.warn('Could not acknowledge callback query', ackError);
        }

        const code = await this.getRandomCode();
        const messageId = ctx.callbackQuery.message?.message_id;
        const chatId = ctx.callbackQuery.message?.chat.id;

        if (!chatId || !messageId) {
          await this.sendAuthCode(ctx, userIdStr, user.phoneNumber);
          return;
        }

        await ctx.api.editMessageText(
          chatId,
          messageId,
          `🔒Code: <code>${code}</code>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Yangilash / Renew', callback_data: 'renew_code' }],
              ],
            },
          },
        );

        await this.saveAuthCode(user.id, code);
        this.scheduleCodeExpiration(chatId, messageId);
      } catch (error) {
        console.error('Callback query error:', error);
        try {
          await ctx.answerCallbackQuery({
            text: 'An error occurred. Please try again.',
            show_alert: true,
          });
        } catch (finalError) {
          console.error('Final error handling failed', finalError);
        }
      }
    });

    // Global error handler
    this.bot.catch((err) => {
      console.error('Bot global error:', err);
    });
  }

  private async sendAuthCodeFirstTime(
    ctx: any,
    userId: string,
    phoneNumber: string,
  ) {
    const code = await this.getRandomCode();

    // Get user id from database
    const user = await this.userRepository.findOne({
      where: { telegramId: userId },
    });
    if (!user) {
      console.error('User not found in database');
      return;
    }

    // Save the code to database with expiration
    await this.saveAuthCode(user.id, code);

    const sentMsg = await ctx.reply(`🔒Code: <code>${code}</code>`, {
      parse_mode: 'HTML',
    });

    console.log(
      `Code: ${code} has been sent to user ID: ${userId} with phone: ${phoneNumber} for the first time!!`,
    );

    // Set timeout to replace code with expired message
    this.scheduleCodeExpiration(ctx.chat.id, sentMsg.message_id);
  }

  private async sendAuthCode(ctx, userId: string, phoneNumber: string) {
    const code = await this.getRandomCode();

    // Get user id from database
    const user = await this.userRepository.findOne({
      where: { telegramId: userId },
    });
    if (!user) {
      console.error('User not found in database');
      return;
    }

    // Save the code to database with expiration
    await this.saveAuthCode(user.id, code);

    const sentMsg = await ctx.reply(`🔒Code: <code>${code}</code>`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔄 Yangilash / Renew',
              callback_data: 'renew_code',
            },
          ],
        ],
      },
    });

    console.log(
      `Code: ${code} has been sent to user ID: ${userId} with phone: ${phoneNumber}`,
    );

    // Set timeout to replace code with expired message
    this.scheduleCodeExpiration(ctx.chat.id, sentMsg.message_id);
  }

  private async getRandomCode() {
    return Math.floor(10000 + Math.random() * 90000);
  }

  private async saveAuthCode(userId: number, code: number) {
    // Delete any existing codes for this user
    await this.authCodeRepository.delete({ userId });

    // Calculate expiration time (20 seconds from now)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 20);

    // Save new code
    await this.authCodeRepository.save({
      userId,
      code: code.toString(),
      expiresAt,
    });
  }

  private scheduleCodeExpiration(chatId: number, messageId: number) {
    // Replace code with "expired" message after 20 seconds
    setTimeout(async () => {
      try {
        await this.bot.api.editMessageText(
          chatId,
          messageId,
          '⚠️ 🇺🇿 Kod muddati tugadi\n\n🇺🇸 Code has expired',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🔄 Yangi kod olish / Get new code',
                    callback_data: 'renew_code',
                  },
                ],
              ],
            },
          },
        );
      } catch (error) {
        console.error('Failed to update expired code message', error);
      }
    }, 20000); // 20 seconds
  }
}
