Add-Type -AssemblyName System.Drawing

function Create-LauncherIcon([int]$size, [bool]$isRound, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $logo = [System.Drawing.Bitmap]::FromFile('C:\Users\aryah\.gemini\antigravity-ide\scratch\CMMSApp\src\assets\images\pln_icon_plus_logo.png')

    if ($isRound) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(1, 1, $size - 2, $size - 2)
        $g.FillPath([System.Drawing.Brushes]::White, $path)
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(25, 0, 0, 0), 1)
        $g.DrawPath($pen, $path)
        $path.Dispose()
        $pen.Dispose()

        $targetW = [int]($size * 0.78)
        $targetH = [int]($targetW * $logo.Height / $logo.Width)
        $targetX = [int](($size - $targetW) / 2)
        $targetY = [int](($size - $targetH) / 2)
        $g.DrawImage($logo, $targetX, $targetY, $targetW, $targetH)
    } else {
        $radius = [int]($size * 0.18)
        $diameter = $radius * 2
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $dim = $size - 2
        $rect = New-Object System.Drawing.Rectangle(1, 1, $dim, $dim)
        $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
        $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
        $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
        $path.CloseFigure()

        $g.FillPath([System.Drawing.Brushes]::White, $path)
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(25, 0, 0, 0), 1)
        $g.DrawPath($pen, $path)
        $path.Dispose()
        $pen.Dispose()

        $targetW = [int]($size * 0.82)
        $targetH = [int]($targetW * $logo.Height / $logo.Width)
        $targetX = [int](($size - $targetW) / 2)
        $targetY = [int](($size - $targetH) / 2)
        $g.DrawImage($logo, $targetX, $targetY, $targetW, $targetH)
    }

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $logo.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

$densities = @{
    'mdpi' = 48
    'hdpi' = 72
    'xhdpi' = 96
    'xxhdpi' = 144
    'xxxhdpi' = 192
}

foreach ($d in $densities.Keys) {
    $s = $densities[$d]
    $dir = "C:\Users\aryah\.gemini\antigravity-ide\scratch\CMMSApp\android\app\src\main\res\mipmap-$d"
    Create-LauncherIcon $s $false "$dir\ic_launcher.png"
    Create-LauncherIcon $s $true "$dir\ic_launcher_round.png"
    Write-Host "Updated mipmap-$d ($s x $s)"
}
