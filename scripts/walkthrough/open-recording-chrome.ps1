# Opens Chrome tabs for walkthrough recording (you start Win+Alt+R or OBS manually).
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
  Write-Error "Chrome not found at $chrome"
  exit 1
}
$base = "https://www.apnatutorhub.com"
$urls = @(
  "$base/login",
  "$base/register?role=tutor",
  "$base/register?role=parent",
  "$base/tutor/dashboard",
  "$base/tutor/leads",
  "$base/tutor/wallet",
  "$base/parent/dashboard",
  "$base/admin"
)
Start-Process $chrome -ArgumentList ($urls | ForEach-Object { "`"$_`"" })
Write-Host "Chrome opened. Log in with demo accounts (see docs/VIDEO_WALKTHROUGH_GUIDE.md)."
Write-Host "Start recording: Win+Alt+R, then record each tab flow separately."
