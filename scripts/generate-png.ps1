Add-Type -AssemblyName System.Drawing

$sizes = @(192, 512)
foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Green background
    $brushBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(5, 150, 105))
    $g.FillRectangle($brushBg, 0, 0, $size, $size)

    # White font
    $brushWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $fontSize = [int]($size * 0.28)
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
    $g.DrawString('AC', $font, $brushWhite, $rect, $sf)

    $outPath = "frontend/public/icons/icon-${size}x${size}.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $font.Dispose()
    $brushWhite.Dispose()
    $brushBg.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $outPath"
}
