/**
 * Zod Validation Schemas for Sorkalam API Routes
 * Enforces strict typing, input sanitization, and standardized API envelopes.
 */

import { z } from "zod";

// API Response Helpers
export function createSuccessResponse<T>(data: T, meta?: Record<string, any>) {
  return {
    success: true as const,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function createErrorResponse(code: string, message: string, details?: any) {
  return {
    success: false as const,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

// 1. Search Query Parameters
export const SearchQuerySchema = z.object({
  q: z.string().optional().default(""),
  period: z.string().optional(),
  changeType: z.enum(["spelling", "meaning", "usage", "all"]).optional().default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(12),
  sort: z.string().optional().default("relevance"),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// 2. Journey Parameters
export const JourneyParamsSchema = z.object({
  id: z.string().min(1, "Word ID is required"),
});

// 3. Evidence Query Parameters
export const EvidenceQuerySchema = z.object({
  id: z.string().min(1, "Word ID is required"),
  period: z.string().optional(),
});

// 4. Compare Query Parameters
export const CompareQuerySchema = z.object({
  word: z.string().min(1, "Word or Lemma is required"),
  from: z.string().optional().default("sangam"),
  to: z.string().optional().default("modern"),
});

// 5. Auth Credentials
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "researcher", "scholar", "admin"]).optional().default("researcher"),
  institution: z.string().optional(),
});

// 6. Contribution Payload
export const CreateContributionSchema = z.object({
  userId: z.string().optional().default("usr-guest"),
  wordText: z.string().min(1, "Tamil word text is required"),
  periodId: z.string().min(1, "Period ID is required"),
  changeType: z.enum(["spelling", "meaning", "usage"]),
  sourceTitle: z.string().min(2, "Source title is required"),
  verseText: z.string().min(5, "Verse text must be at least 5 characters"),
  translationEn: z.string().optional(),
  lineRef: z.string().optional(),
  century: z.string().optional(),
});

// 7. Scholar Review Payload
export const ReviewContributionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewerId: z.string().optional().default("usr-scholar-1"),
  notes: z.string().min(2, "Scholarly review notes are required"),
});

// 8. Collections Payload
export const CreateCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  description: z.string().optional(),
});

export const AddCollectionItemSchema = z.object({
  wordId: z.string().min(1, "Word ID is required"),
  notes: z.string().optional(),
});
