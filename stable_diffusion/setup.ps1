param(
  [string]$Python = "python",
  [ValidateSet("cu128", "cpu")]
  [string]$TorchBuild = "cu128"
)

$ErrorActionPreference = "Stop"
$StableDiffusionDir = $PSScriptRoot
$VenvDir = Join-Path $StableDiffusionDir ".venv"
$Requirements = Join-Path $StableDiffusionDir "requirements.txt"

if ($TorchBuild -eq "cu128") {
  $VideoRoot = "HKLM:\SYSTEM\CurrentControlSet\Control\Video"
  $Adapters = Get-ChildItem -LiteralPath $VideoRoot -ErrorAction SilentlyContinue | ForEach-Object {
    Get-ItemProperty -LiteralPath ($_.PSPath + "\0000") -ErrorAction SilentlyContinue
  } | ForEach-Object { $_.DriverDesc } | Where-Object { $_ }
  if (-not ($Adapters -match "NVIDIA")) {
    throw "CUDA setup requires an NVIDIA adapter. Detected: $($Adapters -join ', ')"
  }
}

if (Test-Path -LiteralPath $Python) {
  $PythonExe = (Resolve-Path -LiteralPath $Python).Path
} else {
  $PythonExe = (Get-Command $Python -ErrorAction Stop).Source
}

& $PythonExe -c "import sys; assert (3, 11) <= sys.version_info[:2] < (3, 14), 'Python 3.11-3.13 is required'; print(sys.version)"

if (-not (Test-Path -LiteralPath $VenvDir)) {
  & $PythonExe -m venv $VenvDir
}

$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
& $VenvPython -m pip install --upgrade pip

$TorchIndex = if ($TorchBuild -eq "cpu") {
  "https://download.pytorch.org/whl/cpu"
} else {
  "https://download.pytorch.org/whl/cu128"
}

& $VenvPython -m pip install "torch==2.7.0" --index-url $TorchIndex
& $VenvPython -m pip install --requirement $Requirements

& $VenvPython -c "import torch; print('torch', torch.__version__); print('cuda_available', torch.cuda.is_available()); print('gpu', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'none')"

if ($TorchBuild -eq "cpu") {
  Write-Warning "CPU mode is installed for tooling checks only. SDXL generation is intentionally blocked unless --allow-cpu is passed."
}

Write-Host "Environment ready: $VenvDir"
