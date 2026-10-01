Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\aryah\.gemini\antigravity-ide\scratch\CMMSApp\media_1790776793092.png"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found at $sourcePath"
    exit 1
}

$sourceImg = [System.Drawing.Bitmap]::FromFile($sourcePath)

# Copy source to src/assets/images/
$assetsDir = "C:\Users\aryah\.gemini\antigravity-ide\scratch\CMMSApp\src\assets\images"
$sourceImg.Save("$assetsDir\app_logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$sourceImg.Save("$assetsDir\pm_logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved app_logo.png and pm_logo.png in $assetsDir"

function Create-SquircleIcon([System.Drawing.Bitmap]$src, [int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $radius = [int]($size * 0.18)
    $diameter = $radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $dim = $size - 1
    $rect = New-Object System.Drawing.Rectangle(0, 0, $dim, $dim)
    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $g.SetClip($path)
    $g.DrawImage($src, 0, 0, $size, $size)
    $path.Dispose()
    $g.Dispose()

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Create-RoundIcon([System.Drawing.Bitmap]$src, [int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($src, 0, 0, $size, $size)
    $path.Dispose()
    $g.Dispose()

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$densities = @{
    'mdpi'    = 48
    'hdpi'    = 72
    'xhdpi'   = 96
    'xxhdpi'  = 144
    'xxxhdpi' = 192
}

foreach ($d in $densities.Keys) {
    $s = $densities[$d]
    $dir = "C:\Users\aryah\.gemini\antigravity-ide\scratch\CMMSApp\android\app\src\main\res\mipmap-$d"
    Create-SquircleIcon $sourceImg $s "$dir\ic_launcher.png"
    Create-RoundIcon $sourceImg $s "$dir\ic_launcher_round.png"
    Write-Host "Generated $d ($s x $s) -> ic_launcher.png & ic_launcher_round.png"
}

$sourceImg.Dispose()
Write-Host "All PM app launcher icons generated successfully!"
