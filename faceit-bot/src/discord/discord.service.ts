import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  Client, Events, GatewayIntentBits, Interaction, MessageFlags, REST, Routes, SlashCommandBuilder,
} from 'discord.js';
import { VerificationService } from '../verification/verification.service';

@Injectable()
export class DiscordService implements OnModuleDestroy {
  private readonly logger = new Logger(DiscordService.name);
  private readonly client = new Client({
    intents: [GatewayIntentBits.Guilds],
    presence: { status: 'invisible' },
  });
  private readonly token = process.env.DISCORD_TOKEN as string;
  private readonly clientId = process.env.DISCORD_CLIENT_ID as string;

  constructor(private readonly verification: VerificationService) {}

  async start(): Promise<void> {
    await this.registerCommands();
    this.setupEventListeners();
    this.client.once(Events.ClientReady, (c) => c.user.setStatus('invisible'));
    await this.client.login(this.token);
  }

  private async registerCommands(): Promise<void> {
    const commands = [
      new SlashCommandBuilder()
        .setName('faceit')
        .setDescription('Отправить запрос на верификацию')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Пользователь, которому отправить запрос').setRequired(true),
        ),
    ].map((cmd) => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(this.token);
    try {
      await rest.put(Routes.applicationCommands(this.clientId), { body: commands });
    } catch (error) {
      this.logger.error('Failed to register commands', (error as Error).stack);
    }
  }

  private async route(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand() && interaction.commandName === 'faceit') {
      const target = interaction.options.getUser('user', true);
      if (target.bot) {
        await interaction.reply({ content: '❌ Нельзя отправить запрос боту.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({ content: `✅ Запрос на верификацию отправлен ${target}`, flags: MessageFlags.Ephemeral });
      return this.verification.startVerification(interaction, target);
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'verify_lang') {
      return this.verification.handleLanguage(interaction);
    }
    if (interaction.isButton() && interaction.customId === 'verify_policy_accept') {
      return this.verification.handlePolicyAccept(interaction);
    }
    if (interaction.isModalSubmit() && interaction.customId === 'verify_nickname_modal') {
      return this.verification.handleNicknameModalSubmit(interaction);
    }
  }

  private setupEventListeners(): void {
    this.client.on(Events.InteractionCreate, async (interaction) => {
      try {
        await this.route(interaction);
      } catch (error) {
        if ([10062, 40060].includes((error as { code?: number }).code ?? 0)) {
          return;
        }
        this.logger.error('Interaction error', (error as Error).stack);
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction
            .reply({ content: 'Произошла ошибка при обработке запроса.', flags: MessageFlags.Ephemeral })
            .catch(() => undefined);
        }
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.destroy();
  }
}
