# 读取 Windows 剪贴板里复制的文件/文件夹路径
# 输出：每个路径一行，行尾用 Tab 后跟 1(文件夹)/0(文件)
# 由 clipboard-server.mjs 调用；UTF-8 输出避免中文乱码

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$items = Get-Clipboard -Format FileDropList
if ($items) {
  foreach ($item in $items) {
    $p = $item.FullName
    if (-not $p) { continue }
    $isDir = Test-Path -LiteralPath $p -PathType Container
    Write-Output ("{0}`t{1}" -f $p, [int]$isDir)
  }
}
