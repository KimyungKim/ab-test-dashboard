/**
 * Prisma Client type stub — generated at runtime by `prisma generate`.
 * This file allows TypeScript to compile without a live database.
 * Run `pnpm db:generate` to replace this with the real generated client.
 */

export interface PrismaClientOptions {
  adapter?: unknown;
  log?: unknown[];
  datasources?: unknown;
  datasourceUrl?: string;
}

export declare class PrismaClient {
  constructor(options?: PrismaClientOptions);
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw(...args: unknown[]): Promise<unknown>;

  abtestManualAnnouncement: PrismaModelDelegate;
  abtestManualAnalysisItem: PrismaModelDelegate;
  abtestManualOutcome: PrismaModelDelegate;
  abtestConclusion: PrismaModelDelegate;
  abtestProductConfig: PrismaModelDelegate;
  abtestAnalysisCache: PrismaModelDelegate;
}

interface PrismaModelDelegate {
  findUnique(args: unknown): Promise<unknown>;
  findMany(args?: unknown): Promise<unknown[]>;
  create(args: unknown): Promise<unknown>;
  createMany(args: unknown): Promise<{ count: number }>;
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<{ count: number }>;
  upsert(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
  deleteMany(args?: unknown): Promise<{ count: number }>;
}

export declare class AbtestManualAnnouncement {}
export declare class AbtestManualAnalysisItem {}
export declare class AbtestManualOutcome {}
export declare class AbtestConclusion {}
export declare class AbtestProductConfig {}
export declare class AbtestAnalysisCache {}
