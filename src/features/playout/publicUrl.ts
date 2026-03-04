import type { SavedTemplate } from '../../store/useTemplateStore';
import type { SportKey } from '../simulation/types';

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

export type TemplateFeedPayload = {
  template: SavedTemplate;
  sport?: SportKey;
};

export type OutputFeedPayload = {
  template: SavedTemplate;
  sport?: SportKey;
};

const isSavedTemplate = (value: unknown): value is SavedTemplate => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SavedTemplate>;
  return typeof candidate.id === 'string' && Array.isArray(candidate.layers);
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

export const encodeTemplateFeedPayload = (payload: TemplateFeedPayload): string => toBase64Url(JSON.stringify(payload));

export const decodeTemplateFeedPayload = (encoded: string): TemplateFeedPayload | null => {
  try {
    const decoded = JSON.parse(fromBase64Url(encoded)) as TemplateFeedPayload | SavedTemplate;
    if (isSavedTemplate(decoded)) {
      return { template: decoded };
    }
    if (!decoded || typeof decoded !== 'object' || !isSavedTemplate(decoded.template)) return null;
    return decoded;
  } catch {
    return null;
  }
};

export const encodeOutputFeedPayload = (payload: OutputFeedPayload): string => toBase64Url(JSON.stringify(payload));

export const decodeOutputFeedPayload = (encoded: string): OutputFeedPayload | null => {
  try {
    const decoded = JSON.parse(fromBase64Url(encoded)) as OutputFeedPayload | SavedTemplate;
    if (isSavedTemplate(decoded)) {
      return { template: decoded };
    }
    if (!decoded || typeof decoded !== 'object' || !isSavedTemplate(decoded.template)) return null;
    return decoded;
  } catch {
    return null;
  }
};

export const buildTemplateFeedUrl = (origin: string, payloadOrTemplate: TemplateFeedPayload | SavedTemplate): string => {
  const payload = isSavedTemplate(payloadOrTemplate) ? { template: payloadOrTemplate } : payloadOrTemplate;
  const encoded = encodeTemplateFeedPayload(payload);
  return `${origin}/template-feed/${payload.template.id}?tpl=${encoded}`;
};

export const buildOutputFeedUrl = (
  origin: string,
  payloadOrTemplate: OutputFeedPayload | SavedTemplate,
  _bindings?: Record<string, unknown>,
  _sponsor?: string | null,
): string => {
  const payload = isSavedTemplate(payloadOrTemplate) ? { template: payloadOrTemplate } : payloadOrTemplate;
  const encoded = encodeOutputFeedPayload(payload);
  // Keep template id in the URL so embed output can always resolve the current program template on refresh.
  return `${origin}/output?embed=1&templateId=${encodeURIComponent(payload.template.id)}&tpl=${encoded}`;
};

export const buildFollowOutputUrl = (origin: string, follow: 'program' | 'preview'): string => `${origin}/output?embed=1&follow=${follow}`;
