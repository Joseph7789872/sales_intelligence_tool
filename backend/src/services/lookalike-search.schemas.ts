import { z } from 'zod';

export const ProspectSchema = z.object({
  companyName: z.string(),
  domain: z.string(),
  industry: z.string(),
  employeeCount: z.number(),
  revenue: z.string(),
  location: z.string(),
  techStack: z.array(z.string()),
  matchScore: z.number().min(0).max(100),
  matchReasons: z.array(z.string()),
  contactName: z.string(),
  contactTitle: z.string(),
  contactEmail: z.string(),
  contactLinkedin: z.string(),
});

export const LookalikeResponseSchema = z.object({
  prospects: z.array(ProspectSchema).min(1).max(10),
});

export type LookalikeResponse = z.infer<typeof LookalikeResponseSchema>;
