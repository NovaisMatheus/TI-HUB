[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$downloadPath = Join-Path $taskRoot 'apps\web\public\downloads'
$publicCA = Join-Path $downloadPath 'ti-hub-rede.cer'
if (-not (Test-Path -LiteralPath $publicCA)) { throw 'Prepare o certificado HTTPS antes de gerar o configurador.' }
$certificateBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($publicCA))
$installerTemplate = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'instalar-acesso-https.template.ps1'))
$installerPath = Join-Path $downloadPath 'instalar-acesso-ti-hub.ps1'
[IO.File]::WriteAllText($installerPath, $installerTemplate.Replace('__CERTIFICATE_BASE64__', $certificateBase64), [Text.UTF8Encoding]::new($true))
Add-Type -AssemblyName System.IO.Compression
$zipPath = Join-Path $downloadPath 'configurador-https-ti-hub.zip'
$stream = [IO.File]::Open($zipPath, [IO.FileMode]::Create)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
  $entry = $archive.CreateEntry('instalar-acesso-ti-hub.ps1')
  $entryStream = $entry.Open()
  try { $bytes = [IO.File]::ReadAllBytes($installerPath); $entryStream.Write($bytes,0,$bytes.Length) } finally { $entryStream.Dispose() }
  $instructions = @'
UGB TI Hub - Configurador HTTPS

1. Extraia este ZIP em uma pasta do computador.
2. Abra PowerShell como administrador.
3. Execute o comando abaixo, substituindo CAMINHO pela pasta extraída:

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "CAMINHO\instalar-acesso-ti-hub.ps1"

4. Reinicie o navegador e abra https://ti-hub.192-168-10-9.sslip.io

O script instala o certificado público de confiança e o endereço interno do Hub.
Nenhuma chave privada está incluída no pacote.
'@
  $entry = $archive.CreateEntry('LEIA-ME.txt')
  $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($true))
  try { $writer.Write($instructions) } finally { $writer.Dispose() }
} finally { $archive.Dispose(); $stream.Dispose() }
Write-Output 'Configurador HTTPS em ZIP atualizado.'
