import type { Brush } from './brush-engine';
type Context = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerBrushTools(
  context: Context | undefined,
  read: () => unknown,
  compose: (brush: Brush, seed: number) => unknown,
) {
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools = [
    {
      name: 'read_drawing',
      title: 'Read drawing state',
      description:
        'Read the selected brush, settings, and stroke count of the current drawing.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: unknown) {
        if (
          !input ||
          typeof input !== 'object' ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          throw new Error('Expected an empty object');
        return read();
      },
    },
    {
      name: 'compose_drawing',
      title: 'Compose a drawing',
      description:
        'Replace the canvas with a complete procedural drawing using the selected settings. This action can be undone.',
      inputSchema: {
        type: 'object',
        properties: {
          brush: { type: 'string', enum: ['subway', 'figures', 'gunpla'] },
          seed: { type: 'integer', minimum: 1, maximum: 10000 },
        },
        required: ['brush', 'seed'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== 'object' || Array.isArray(input))
          throw new Error('Expected brush and seed');
        const v = input as Record<string, unknown>;
        if (
          Object.keys(v).some((k) => !['brush', 'seed'].includes(k)) ||
          !['subway', 'figures', 'gunpla'].includes(String(v.brush)) ||
          !Number.isInteger(v.seed) ||
          Number(v.seed) < 1 ||
          Number(v.seed) > 10000
        )
          throw new Error(
            'Expected a valid brush and integer seed from 1 to 10000',
          );
        return compose(v.brush as Brush, v.seed as number);
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Optional experimental browser API. Drawing remains available. */
    }
  }
  return () => lifecycle.abort();
}
export type { Context as BrushModelContext };
