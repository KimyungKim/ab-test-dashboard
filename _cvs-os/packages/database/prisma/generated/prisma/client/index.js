// Prisma Client stub — replaced by `prisma generate` at runtime
// This file prevents import errors during local development without a DB.

class PrismaModelDelegate {
  findUnique() { return Promise.resolve(null); }
  findMany() { return Promise.resolve([]); }
  create(args) { return Promise.resolve(args?.data ?? {}); }
  createMany() { return Promise.resolve({ count: 0 }); }
  update(args) { return Promise.resolve(args?.data ?? {}); }
  updateMany() { return Promise.resolve({ count: 0 }); }
  upsert(args) { return Promise.resolve(args?.create ?? {}); }
  delete() { return Promise.resolve({}); }
  deleteMany() { return Promise.resolve({ count: 0 }); }
}

export class PrismaClient {
  constructor() {
    this.abtestManualAnnouncement = new PrismaModelDelegate();
    this.abtestManualAnalysisItem = new PrismaModelDelegate();
    this.abtestManualOutcome = new PrismaModelDelegate();
    this.abtestConclusion = new PrismaModelDelegate();
    this.abtestProductConfig = new PrismaModelDelegate();
    this.abtestAnalysisCache = new PrismaModelDelegate();
  }
  $connect() { return Promise.resolve(); }
  $disconnect() { return Promise.resolve(); }
  $queryRaw() { return Promise.resolve([]); }
}

export class AbtestManualAnnouncement {}
export class AbtestManualAnalysisItem {}
export class AbtestManualOutcome {}
export class AbtestConclusion {}
export class AbtestProductConfig {}
export class AbtestAnalysisCache {}
