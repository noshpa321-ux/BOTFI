import { join } from 'path';
import {
  AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  type BaseMessageOptions, type MessageActionRowComponentBuilder, type ModalActionRowComponentBuilder,
} from 'discord.js';
import { texts } from './verification.i18n';

const COLOR = '#FF5500';
const BANNER_FILE = 'banner.jpg';
const BANNER = `attachment://${BANNER_FILE}`;
const banner = () => [asset(BANNER_FILE)];

const LOGO_FILE = 'logo.jpg';
const asset = (name: string) => new AttachmentBuilder(join(__dirname, '..', '..', 'assets', name), { name });
const FOOTER = 'FACEIT • Verification';

const LANGUAGES: Record<string, { label: string; emoji: string }> = {
  ru: { label: 'Русский', emoji: '🇷🇺' },
  en: { label: 'English', emoji: '🇬🇧' },
  uk: { label: 'Українська', emoji: '🇺🇦' },
  de: { label: 'Deutsch', emoji: '🇩🇪' },
  fr: { label: 'Français', emoji: '🇫🇷' },
  pl: { label: 'Polski', emoji: '🇵🇱' },
  es: { label: 'Español', emoji: '🇪🇸' },
  pt: { label: 'Português', emoji: '🇵🇹' },
  'pt-BR': { label: 'Português Brasileiro', emoji: '🇧🇷' },
  fi: { label: 'Suomi', emoji: '🇫🇮' },
  sv: { label: 'Svenska', emoji: '🇸🇪' },
  zh: { label: '中文', emoji: '🇨🇳' },
  tr: { label: 'Türkçe', emoji: '🇹🇷' },
  id: { label: 'Bahasa Indonesia', emoji: '🇮🇩' },
  ja: { label: '日本語', emoji: '🇯🇵' },
  hr: { label: 'Hrvatski', emoji: '🇭🇷' },
  mk: { label: 'Македонски', emoji: '🇲🇰' },
};

const languageName = (code?: string | null): string => (LANGUAGES[code ?? "en"] || LANGUAGES.en).label;

const messageRow = (component: MessageActionRowComponentBuilder) =>
  new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(component);

export class VerificationUI {
  static languageSelect(): BaseMessageOptions {
    const embed = new EmbedBuilder()
      .setColor(COLOR).setTitle('FACEIT')
      .setDescription('**🔶 Select your language**\n\nHello! Before proceeding, please select the language.')
      .setImage(BANNER)
      .setFooter({ text: FOOTER });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('verify_lang')
      .setPlaceholder('Выберите язык / Select language')
      .addOptions(Object.entries(LANGUAGES).map(([value, { label, emoji }]) => ({ label, value, emoji })));

    return { embeds: [embed], components: [messageRow(menu)], files: banner() };
  }

  static policyAccept(language: string): BaseMessageOptions {
    const t = texts(language);
    const embed = new EmbedBuilder()
      .setColor(COLOR).setTitle('FACEIT')
      .setDescription(`**${t.policyTitle}**\n\n${t.selectedLanguage}: ${languageName(language)}\n\n**${t.policyBody}**\n${t.consent}`)
      .setImage(BANNER)
      .setFooter({ text: FOOTER });

    const button = new ButtonBuilder()
      .setCustomId('verify_policy_accept').setEmoji('✅').setLabel(t.accept).setStyle(ButtonStyle.Success);

    return { embeds: [embed], components: [messageRow(button)], files: banner() };
  }

  static nicknameModal(language?: string | null): ModalBuilder {
    const t = texts(language);
    const input = new TextInputBuilder()
      .setCustomId('faceit_nickname_input')
      .setLabel(t.nicknameLabel)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    return new ModalBuilder()
      .setCustomId('verify_nickname_modal').setTitle(t.nicknameTitle)
      .addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(input));
  }

  static success(playerData: { nickname: string }, language?: string | null): BaseMessageOptions {
    const t = texts(language);
    const embed = new EmbedBuilder()
      .setColor(COLOR).setTitle('FACEIT')
      .setDescription(`**🔶 ${t.step}**\n\n${t.language}: ${languageName(language)}\n${t.chosenNickname}: ${playerData.nickname}\n\n**${t.found}**\n${t.finish}`)
      .setImage(BANNER)
      .setFooter({ text: FOOTER });
    embed.setThumbnail(`attachment://${LOGO_FILE}`);

    const linkButton = new ButtonBuilder()
      .setLabel(t.link)
      .setURL(`https://faceit.com/en/players/${encodeURIComponent(playerData.nickname)}`)
      .setStyle(ButtonStyle.Link);

    return { embeds: [embed], components: [messageRow(linkButton)], files: [asset(BANNER_FILE), asset(LOGO_FILE)] };
  }
}
