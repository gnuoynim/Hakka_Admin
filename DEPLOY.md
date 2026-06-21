# Hakka Admin 배포 가이드

## 배포 방법

어드민 페이지는 FastAPI 백엔드에서 정적 파일로 서빙됩니다.

### 1. 환경변수 설정

**서버의 `Hakka_Backend/.env` 파일에 추가:**

```env
# Admin Panel
ADMIN_EMAILS=arome0825@gmail.com,other_admin@example.com
ADMIN_TOKEN_EXPIRE_HOURS=8
ADMIN_ORIGIN=https://api.hakka.co.kr
```

⚠️ **중요**: `ADMIN_EMAILS`에 등록된 Google 계정만 어드민 페이지에 접근할 수 있습니다.

### 2. 로컬에서 빌드

```bash
cd Hakka_Admin

# 환경변수 확인 (.env 파일)
cat .env

# 빌드
npm run build

# 빌드 결과물 확인
ls dist/
```

### 3. 서버에 배포

**방법 A: SCP로 복사**

```bash
# dist/ 폴더를 서버의 /admin/ 경로로 복사
scp -r dist/* user@146.56.110.186:/admin/
```

**방법 B: Git을 통한 배포**

```bash
# 1. Git push
git add .
git commit -m "Update admin dashboard"
git push

# 2. 서버에서 pull & build
ssh user@146.56.110.186
cd /var/www/hakka/Hakka_Admin
git pull
npm run build
cp -r dist/* /admin/
```

### 4. 서버 디렉토리 구조

```
/var/www/hakka/
├── Hakka_Backend/     # FastAPI 백엔드
├── Hakka_Frontend/    # React Native 웹 빌드
└── /admin/            # 어드민 대시보드 (여기에 빌드 결과 복사)
    ├── index.html
    └── assets/
        ├── index-*.js
        └── index-*.css
```

### 5. 백엔드 재시작

```bash
# Docker 사용 시
cd /var/www/hakka
docker-compose restart backend

# 또는 직접 실행 시
cd /var/www/hakka/Hakka_Backend
pkill -f "uvicorn app.main:app"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 접속 확인

1. **URL**: `https://api.hakka.co.kr/admin/`
2. **Google 로그인** 버튼 클릭
3. 화이트리스트에 등록된 계정으로 로그인
4. 대시보드 확인

## 트러블슈팅

### "권한이 없는 계정입니다" 오류

→ `.env`의 `ADMIN_EMAILS`에 본인 이메일 추가 후 백엔드 재시작

### 404 Not Found

→ `/admin/` 디렉토리에 `index.html` 파일이 있는지 확인

```bash
ls -la /admin/
```

### 빈 화면 또는 로딩 무한

→ 브라우저 콘솔 확인, API URL이 올바른지 확인

```bash
# Hakka_Admin/.env 확인
cat .env
# VITE_API_BASE_URL=https://api.hakka.co.kr/api 여야 함
```

### CORS 에러

→ 백엔드 `.env`의 `ADMIN_ORIGIN` 확인

```env
ADMIN_ORIGIN=https://api.hakka.co.kr
```

## 어드민 사용자 추가/제거

### 사용자 추가

```bash
# 서버에 SSH 접속
ssh user@146.56.110.186

# .env 파일 수정
cd /var/www/hakka/Hakka_Backend
nano .env

# ADMIN_EMAILS에 이메일 추가 (콤마로 구분)
ADMIN_EMAILS=existing@example.com,new_admin@gmail.com

# 저장 후 백엔드 재시작
docker-compose restart backend
```

### 사용자 제거

`.env`의 `ADMIN_EMAILS`에서 해당 이메일 제거 후 재시작

## 보안 체크리스트

- ✅ `ADMIN_EMAILS`에 승인된 이메일만 등록
- ✅ Google OAuth 클라이언트 ID 설정됨
- ✅ HTTPS로만 접속 (HTTP 차단)
- ✅ JWT 토큰 만료 시간 적절히 설정 (기본 8시간)
- ✅ 감사 로그 정기 확인 (`admin_audit_log` 테이블)

## 업데이트 프로세스

```bash
# 1. 로컬에서 수정 & 테스트
cd Hakka_Admin
npm run dev
# http://localhost:5173 에서 테스트

# 2. 빌드
npm run build

# 3. 서버 배포
scp -r dist/* user@146.56.110.186:/admin/

# 4. 확인
# https://api.hakka.co.kr/admin/ 접속하여 변경사항 확인
```

## 모니터링

### 감사 로그 확인

```sql
-- 최근 어드민 활동 조회
SELECT * FROM admin_audit_log 
ORDER BY created_at DESC 
LIMIT 100;

-- 특정 관리자 활동 조회
SELECT * FROM admin_audit_log 
WHERE admin_email = 'arome0825@gmail.com'
ORDER BY created_at DESC;
```

### 백엔드 로그 확인

```bash
# Docker 로그
docker logs -f hakka_backend

# 어드민 접속 로그 필터링
docker logs hakka_backend 2>&1 | grep -i admin
```
