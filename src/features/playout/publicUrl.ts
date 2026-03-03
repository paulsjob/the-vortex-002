import type { SavedTemplate } from '../../store/useTemplateStore';

const toBase64Url = (value: string) => btoa(unescape(encodeURIComponent(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
};

export type OutputPayload = {
  template: SavedTemplate;
  bindings?: Record<string, unknown>;
  sponsor?: string | null;
};

export const encodeTemplatePayload = (template: SavedTemplate): string => toBase64Url(JSON.stringify(template));

export const decodeTemplatePayload = (encoded: string): SavedTemplate | null => {
  try {
    return JSON.parse(fromBase64Url(encoded)) as SavedTemplate;
  } catch {
    return null;
  }
};

export const encodeOutputPayload = (payload: OutputPayload): string => toBase64Url(JSON.stringify(payload));

export const decodeOutputPayload = (encoded: string): OutputPayload | null => {
  try {
    const decoded = JSON.parse(fromBase64Url(encoded)) as OutputPayload | SavedTemplate;
    if (!decoded || typeof decoded !== 'object') return null;
    if ('template' in decoded && decoded.template) return decoded as OutputPayload;
    return { template: decoded as SavedTemplate };
  } catch {
    return null;
  }
};

export const buildTemplateFeedUrl = (origin: string, template: SavedTemplate): string => {
  const payload = encodeTemplatePayload(template);
  return `${origin}/template-feed/${template.id}?tpl=${payload}`;
};

export const buildOutputFeedUrl = (
  origin: string,
  template: SavedTemplate,
  bindings?: Record<string, unknown>,
  sponsor?: string | null,
): string => {
  const payload = encodeOutputPayload({ template, bindings, sponsor });
  return `${origin}/output?tpl=${payload}`;
};
