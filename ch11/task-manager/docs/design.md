# design.md — 데이터와 화면 설계
## 업무 객체
| 필드 | 형식 | 규칙 |
|---|---|---|
| id | 문자열 | 고유값. crypto.randomUUID(), 미지원 시 대체 id |
| title | 문자열 | 필수, 앞뒤 공백 제거, 1~100자 |
| status | 문자열 | 예정 / 진행 중 / 완료 |
| priority | 문자열 | 높음 / 보통 / 낮음 |
| dueDate | 문자열 | YYYY-MM-DD 또는 빈 문자열 |
| memo | 문자열 | 선택, 500자 이하 |
| createdAt, updatedAt | 문자열 | ISO 8601 |
## 저장 형식
`{ schemaVersion: 1, savedAt, tasks: [...] }` 를 키 `ai-agent-designer.task-manager.v1`에 저장.
## 날짜 규칙
오늘 = 기기의 현지 날짜. 기한 지남 = 완료가 아니고 마감일이 오늘보다 이전.
## 정렬
미완료 → 마감일 빠른 순(없음은 뒤) → 우선순위 높음 순.
## 화면
헤더(저장 위치 안내) / 등록·수정 폼 / 필터 영역 / 결과 수 / 목록 / 백업 영역. 제11장에서 1열 모바일 레이아웃으로 리팩터링한다.
