Write-Host "Local Build and Sync for Festeseim..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit $LASTEXITCODE
}
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Error "Sync failed!"
    exit $LASTEXITCODE
}
Write-Host "Android files updated successfully!"
pause
