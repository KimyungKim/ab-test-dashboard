# A/B Test Dashboard

Slack에서 CVS A/B Test 정보를 수집하고 Databricks로 통계 분석을 제공하는 대시보드.

## 기능

- **A/B Test in Slack**: Slack에서 A/B Test 공지, 분석 결과, 결론 스레드 검색
- **A/B Test Dashboard**: Retention, Revenue, Segment별 통계 검정 (Bootstrap, z-test)
- **Product 설정**: 테스트별 분석 상품 타입 설정

## 개발 시작

```bash
cp .env.example .env.local
# .env.local 값 채우기

docker compose up
```

## 배포

CVS-OS 플랫폼으로 배포. `cvs-os.yml` 참조.
