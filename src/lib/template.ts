export type TemplateDraft = {
  id: string;
  title: string;
  description: string;
  createdAtIso: string;
};

export function createTemplateDraft(input: { title: string; description: string }): TemplateDraft {
  return {
    id: slugify(input.title) || 'untitled-graphic',
    title: input.title.trim() || 'Untitled Graphic',
    description: input.description.trim(),
    createdAtIso: new Date().toISOString(),
  };
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
