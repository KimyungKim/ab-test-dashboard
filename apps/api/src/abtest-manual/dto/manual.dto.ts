export class ManualKeyDto {
  declare key: string;
}

export class ManualAnnouncementDto {
  declare key: string;
  declare slackUrl: string;
  testIds?: string[];
}

export class ManualAnalysisDto {
  declare key: string;
  declare slackUrl: string;
  testIds?: string[];
}

export class ManualOutcomeDto {
  declare key: string;
  declare slackUrl: string;
  testIds?: string[];
}

export class ManualAnalysisReorderDto {
  declare key: string;
  declare orderedIds: string[];
}

export class ManualAnalysisDeleteDto {
  declare key: string;
  declare id: string;
}
