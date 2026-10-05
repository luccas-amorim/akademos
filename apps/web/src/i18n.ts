import { i18n } from '@lingui/core';
import { messages } from './locales/pt-BR/messages.po';

export const LOCALE = 'pt-BR';

i18n.load(LOCALE, messages);
i18n.activate(LOCALE);

export { i18n };
