import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';
import { createTemplateDraft } from './lib/template';

export default function App() {
  const [title, setTitle] = useState('Untitled Graphic');
  const [description, setDescription] = useState('Fresh rebuild in progress.');

  const draft = useMemo(() => createTemplateDraft({ title, description }), [title, description]);

  return (
    <main className="app-shell">
      <section className="panel">
        <p className="eyebrow">Renderless Studio</p>
        <h1>Clean slate</h1>
        <p>Everything has been reset to a minimal foundation so we can rebuild intentionally.</p>
      </section>

      <section className="panel form">
        <label>
          Template title
          <input value={title} onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)} rows={3} />
        </label>
      </section>

      <section className="panel preview">
        <h2>Draft preview</h2>
        <pre>{JSON.stringify(draft, null, 2)}</pre>
      </section>
    </main>
  );
}
