Write-Host "Starting deployment process..." -ForegroundColor Green

# 1. Build
Write-Host "Building project..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Exiting." -ForegroundColor Red
    exit
}

# 2. Git operations
Write-Host "Adding changes to git..." -ForegroundColor Cyan
git add .

Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m "UI Redesign 2.0: Tailwind CSS, New Components, Calendar Fix"

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful! Changes pushed to GitHub." -ForegroundColor Green
    Write-Host "Check GitHub Actions for build status: https://github.com/Lalika85/Festeseim/actions" -ForegroundColor Yellow
} else {
    Write-Host "Push failed. Please check your git configuration." -ForegroundColor Red
}

Read-Host -Prompt "Press Enter to exit"
