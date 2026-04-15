# A/B Test Dashboard

Slack에서 A/B Test 정보를 수집하고 Databricks로 통계 분석을 제공하는 대시보드.

## 기술스택

- **Frontend**: Next.js 16 (App Router, Turbopack), Tailwind CSS 4, React 19
- **Backend**: NestJS 11 (Express), TypeScript 5
- **Database**: PostgreSQL 17, Prisma 7
- **외부 연동**: Databricks (OAuth M2M), Slack API, OpenAI
- **빌드**: Turborepo, pnpm

## 프로젝트 구조

```
apps/web/          # Next.js 16 프론트엔드
apps/api/          # NestJS 11 백엔드
packages/database/ # Prisma 7 + PostgreSQL
```

## 개발 명령어

```bash
pnpm dev          # 전체 개발 서버 (Docker Compose 사용)
pnpm build        # 전체 빌드
pnpm db:generate  # Prisma Client 생성
pnpm db:migrate   # 마이그레이션 생성
pnpm db:push      # 스키마 DB 반영
pnpm db:studio    # Prisma Studio
```

## 컨벤션

- **Git**: Conventional Commits
- **API**: RESTful, `/api` prefix
- **데이터 저장**: PostgreSQL (Prisma). 로컬 JSON 파일 사용 금지
- **환경변수**: 새 변수 추가 시 `.env.example`과 `cvs-os.yml` 동시 업데이트
- **AI API**: AI Proxy(`AIPROXY_BASE_URL`) 경유 권장

## 환경변수 주요 항목

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (CVS-OS 자동 주입) |
| `DATABRICKS_HOST` | Databricks workspace hostname |
| `DATABRICKS_HTTP_PATH` | SQL warehouse HTTP path |
| `DATABRICKS_CLIENT_ID` | OAuth M2M Client ID |
| `DATABRICKS_CLIENT_SECRET` | OAuth M2M Client Secret |
| `SLACK_USER_TOKEN` | Slack User Token |
| `OPENAI_API_KEY` | OpenAI API Key |
