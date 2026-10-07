import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export type VerificationStep = 'LANGUAGE' | 'POLICY' | 'NICKNAME' | 'COMPLETED';

export interface VerificationSession {
  discordId: string;
  step: VerificationStep;
  language: string | null;
  nickname?: string;
  createdAt: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  async setSession(userId: string, data: VerificationSession, ttl = 900): Promise<void> {
    await this.client.set(`verify:${userId}`, JSON.stringify(data), 'EX', ttl);
  }

  async getSession(userId: string): Promise<VerificationSession | null> {
    const data = await this.client.get(`verify:${userId}`);
    return data ? (JSON.parse(data) as VerificationSession) : null;
  }

  async updateSession(userId: string, partialData: Partial<VerificationSession>): Promise<VerificationSession | null> {
    const session = await this.getSession(userId);
    if (!session) return null;
    const updated = { ...session, ...partialData };
    await this.setSession(userId, updated);
    return updated;
  }

  async deleteSession(userId: string): Promise<void> {
    await this.client.del(`verify:${userId}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
