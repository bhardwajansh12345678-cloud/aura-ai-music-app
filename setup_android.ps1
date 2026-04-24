$ErrorActionPreference = "Stop"
$sdkDir = "C:\android-sdk"

if (!(Test-Path $sdkDir)) {
    New-Item -ItemType Directory -Force -Path $sdkDir
}

$zipPath = "$sdkDir\cmdline-tools.zip"
if (!(Test-Path $zipPath)) {
    Write-Host "Downloading Android SDK Command Line Tools..."
    Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $zipPath
}

$cmdlineDir = "$sdkDir\cmdline-tools\latest"
if (!(Test-Path $cmdlineDir)) {
    Write-Host "Extracting cmdline-tools..."
    Expand-Archive -Path $zipPath -DestinationPath "$sdkDir\cmdline-tools" -Force
    # Rename cmdline-tools inside cmdline-tools to 'latest'
    Rename-Item -Path "$sdkDir\cmdline-tools\cmdline-tools" -NewName "latest"
}

Write-Host "Accepting licenses and installing packages..."
$sdkmanager = "$cmdlineDir\bin\sdkmanager.bat"
# echo y to accept licenses
cmd.exe /c "echo y | & `"$sdkmanager`" `"platforms;android-34`" `"build-tools;34.0.0`""
cmd.exe /c "echo y | & `"$sdkmanager`" --licenses"

Write-Host "Updating local.properties..."
$localProps = "C:\Users\Lenovo\Desktop\antigravity\android\local.properties"
Set-Content -Path $localProps -Value "sdk.dir=C\:\\android-sdk"

Write-Host "Done setting up Android SDK."
