import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { AuthCode } from './auth-code.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  telegramId: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column()
  phoneNumber: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => AuthCode, (authCode) => authCode.user)
  authCodes: AuthCode[];
}