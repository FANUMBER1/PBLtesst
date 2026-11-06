# Chạy toàn bộ kiểm thử hệ thống SortiX Dashboard
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Chạy bộ kiểm tra tự động (Regression Tests)..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nKiểm tra kiểu dữ liệu TypeScript (Strict Mode)..." -ForegroundColor Yellow
npx tsc --noEmit --pretty false
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nKiểm tra linting mã nguồn..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nĐÃ HOÀN THÀNH TOÀN BỘ KIỂM TRA: PASS 100%!" -ForegroundColor Green
