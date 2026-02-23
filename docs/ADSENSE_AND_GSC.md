# GigaSieve (gigasievepages.com) – AdSense ads.txt & GSC 점검

## 1. AdSense "찾을 수 없음" (ads.txt)

### 현재 설정
- **public/ads.txt** 존재, 내용: `google.com, pub-1628329123719223, DIRECT, f08c47fec0942fa0`
- **Canonical**: www (`https://www.gigasievepages.com`)
- **리다이렉트**: 비-www → www 301 (Cloudflare + _redirects)
- AdSense는 **루트 도메인에서 1회 301** 따라가는 것을 지원함.  
  → `gigasievepages.com/ads.txt` 가 `https://www.gigasievepages.com/ads.txt` 로 301되면, 최종 URL이 **200**이면 인정됨.

### "찾을 수 없음"일 때 확인할 것

1. **최종 URL 직접 열기**  
   브라우저에서 **https://www.gigasievepages.com/ads.txt** 접속  
   - 한 줄로 `google.com, pub-1628329123719223, DIRECT, f08c47fec0942fa0` 가 보이면 **서버 설정은 정상**.  
   - 404면 → 배포 시 **publish 디렉터리**에 `ads.txt`가 포함되는지 확인 (Astro는 `public/` → `dist/` 복사).

2. **비-www → www 301 확인**  
   `https://gigasievepages.com/ads.txt` 접속  
   - **301**로 `https://www.gigasievepages.com/ads.txt` 로 넘어가면 OK.  
   - 404/500이면 Cloudflare 규칙·_redirects 확인.

3. **AdSense 재확인 시점**  
   - AdSense는 보통 **24시간 단위**로 ads.txt를 다시 확인함.  
   - "준비 중"이면 **승인 대기** 단계일 수 있음.  
   - 48시간 이상 지나도 "찾을 수 없음"이면, 위 1·2번이 모두 OK인데도 문제면 AdSense 지원에 문의하는 편이 좋음.

### 이번에 해둔 것
- **public/ads.txt** 끝에 줄바꿈 추가 (일부 검사기 요구사항).
- **public/_headers** 추가: `/ads.txt` 에 `Content-Type: text/plain; charset=utf-8` 지정 (Cloudflare Pages 등에서 적용).

---

## 2. GSC 상태 정리 (사진 기준)

| 사유 | 페이지 수 | 해석 |
|------|-----------|------|
| 리디렉션이 포함된 페이지 | 3 | 비-www → www 301인 URL. **의도된 동작**, 검증만 기다리면 됨. |
| 발견됨 - 현재 색인이 생성되지 않음 | 151 | 수집됐지만 아직 색인 대기. **시간 두고 재크롤** 기다리면 됨. |
| 크롤링됨 - 현재 색인이 생성되지 않음 | 0 (통과) | 이 항목은 **이미 통과** 상태. |

추가로 할 일:
- GSC에 **소유권 확인**이 되어 있는지 확인 (googleae7f13a03d678860.html 등).
- **사이트맵 제출**: `https://www.gigasievepages.com/sitemap.xml`  
  (sitemap.xml.ts 사용 중이므로, 빌드 시 `PUBLIC_SITE_URL=https://www.gigasievepages.com` 설정 필요.)
- **robots.txt**: `https://www.gigasievepages.com/robots.txt` 에서 Sitemap URL이 www로 나오는지 확인.

---

## 3. 배포 시 환경 변수

빌드/배포 시 다음 설정 권장:
- `PUBLIC_SITE_URL=https://www.gigasievepages.com`  
  → robots.txt, sitemap.xml, canonical에 사용됨.

---

**정리**: ads.txt는 **www 주소에서 200으로 열리는지**만 확인하면 되고, GSC는 리다이렉트 3건은 정상·나머지는 시간 두고 보면 됨.
