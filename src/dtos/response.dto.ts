export class ResponseDto {
  telegramId?: string; // optional, only if found
  isValid: boolean;
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
}
