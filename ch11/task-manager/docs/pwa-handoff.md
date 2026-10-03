# pwa-handoff.md — 제11장 인계 메모
## 현재 상태
- 실행 파일: index.html, style.css, app.js (외부 라이브러리·CDN 없음 → 오프라인 캐시 대상이 3개뿐)
- viewport 메타 태그 있음. 모든 경로는 상대 경로(./)
- 데이터: LocalStorage 키 `ai-agent-designer.task-manager.v1`, JSON 백업 내보내기·가져오기 있음
## 11장에서 할 일
| 절 | 할 일 | 이 프로젝트에서 확인할 곳 |
|---|---|---|
| 11-2 반응형 | 360px 고정 2열 → 좁은 화면 1열, 터치 영역 44px 이상 | style.css의 .layout, .row, .filters, button |
| 11-3 Manifest | manifest.webmanifest, 아이콘 192·512px, start_url "./" | index.html <head> |
| 11-4 Service Worker | sw.js에서 index.html·style.css·app.js 캐시 | app.js 마지막에 등록 코드 추가 |
| 11-5 설치 테스트 | HTTPS 배포(제9장 GitHub Pages 등) 후 스마트폰 설치 | README 실행 방법 갱신 |
## 주의
- Service Worker는 LocalStorage에 접근할 수 없다. 업무 데이터는 지금처럼 페이지(app.js)에서만 다룬다.
- 배포 주소가 바뀌면 기존 데이터가 보이지 않는다 → 백업 내보내기 후 새 주소에서 가져오기.
- 일부 기기(특히 iOS)에서는 홈 화면에 설치한 앱과 브라우저의 저장소가 분리될 수 있다 → 설치 후 JSON 가져오기로 옮긴다.
- 캐시 파일 이름을 바꾸면 sw.js 캐시 목록도 함께 바꾼다.
