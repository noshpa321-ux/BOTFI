import { Injectable, Logger } from '@nestjs/common';
import {
  MessageFlags,
  type ButtonInteraction, type ChatInputCommandInteraction, type ModalSubmitInteraction, type User,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { RedisService, VerificationSession, VerificationStep } from '../redis/redis.service';
import { VerificationUI } from './verification.ui';
import { texts } from './verification.i18n';

type StepInteraction = StringSelectMenuInteraction | ButtonInteraction | ModalSubmitInteraction;

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly redis: RedisService) {}

  async startVerification(interaction: ChatInputCommandInteraction, target: User): Promise<void> {
    await this.redis.setSession(target.id, {
      discordId: target.id,
      step: 'LANGUAGE',
      language: null,
      createdAt: Date.now(),
    });


    const message = VerificationUI.languageSelect();
    try {
      await target.send(message);
    } catch {
      if (interaction.channel?.isSendable()) {
        await interaction.channel.send({ ...message, content: `${target}` });
      } else {
        this.logger.error(`Could not deliver language select to ${target.id}`);
      }
    }
  }

  private async requireStep(interaction: StepInteraction, step: VerificationStep): Promise<VerificationSession | null> {
    const session = await this.redis.getSession(interaction.user.id);
    if (session && session.step === step) return session;
    await interaction.reply({ content: texts(session?.language).expired, flags: MessageFlags.Ephemeral });
    return null;
  }

  async handleLanguage(interaction: StringSelectMenuInteraction): Promise<void> {
    if (!(await this.requireStep(interaction, 'LANGUAGE'))) return;
    const language = interaction.values[0];
    await this.redis.updateSession(interaction.user.id, { language, step: 'POLICY' });
    await interaction.update(VerificationUI.policyAccept(language));
  }

  async handlePolicyAccept(interaction: ButtonInteraction): Promise<void> {
    const session = await this.requireStep(interaction, 'POLICY');
    if (!session) return;
    await this.redis.updateSession(interaction.user.id, { step: 'NICKNAME' });
    await interaction.showModal(VerificationUI.nicknameModal(session.language));
  }

  async handleNicknameModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const session = await this.requireStep(interaction, 'NICKNAME');
    if (!session) return;
    const nickname = interaction.fields.getTextInputValue('faceit_nickname_input').trim();

    await interaction.deferUpdate();
    await this.redis.updateSession(interaction.user.id, { step: 'COMPLETED', nickname });
    await interaction.editReply(VerificationUI.success({ nickname }, session.language));
  }
}
