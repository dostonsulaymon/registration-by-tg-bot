import { IsNotEmpty, isString } from 'class-validator';

export class VerifyCodeDto {
  @IsNotEmpty()
  code: string;
}