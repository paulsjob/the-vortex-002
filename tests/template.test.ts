import { describe, expect, it } from 'vitest';
import { createTemplateDraft, slugify } from '../src/lib/template';

describe('template helpers', () => {
  it('slugifies titles', () => {
    expect(slugify('  Hero Lower Third  ')).toBe('hero-lower-third');
  });

  it('creates a fallback id/title when values are blank', () => {
    const draft = createTemplateDraft({ title: '   ', description: '  test  ' });
    expect(draft.id).toBe('untitled-graphic');
    expect(draft.title).toBe('Untitled Graphic');
    expect(draft.description).toBe('test');
  });
});
