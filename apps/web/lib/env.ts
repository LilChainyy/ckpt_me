import { z } from 'zod';

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().startsWith('postgresql://'),
  NEXTAUTH_SECRET: z.string().min(16),

  // Optional
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_TOKEN: z
    .string()
    .refine((v) => v.startsWith('github_') || v.startsWith('ghp_'), {
      message: 'GITHUB_APP_TOKEN must start with "github_" or "ghp_"',
    })
    .optional(),
  NEXTAUTH_URL: z.string().url().optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (result.success) {
    return result.data;
  }

  const formatted = result.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  const message = `Environment variable validation failed:\n${formatted}`;

  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    process.exit(1);
  }

  console.warn(message);

  // In development, return process.env as-is so the app can still start
  return process.env as unknown as Env;
}

export const env = validateEnv();
