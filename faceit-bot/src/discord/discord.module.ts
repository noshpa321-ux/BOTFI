import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [VerificationModule],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
