# Application Assets

This folder contains application icons and other assets for the desktop application.

## Icons

- `icon.svg` - Vector source icon (use this for regenerating other formats)
- `icon.png` - PNG icon for Linux (256x256)
- `icon.ico` - Windows icon
- `icon.icns` - macOS icon

## Generating Platform-Specific Icons

To generate platform-specific icons from the SVG source, you can use tools like:

### Using ImageMagick (command line)

```bash
# Generate PNG
convert -background transparent icon.svg -resize 256x256 icon.png

# Generate ICO (Windows)
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# Generate ICNS (macOS) - requires iconutil on macOS
mkdir icon.iconset
for size in 16 32 64 128 256 512; do
  convert -background transparent icon.svg -resize ${size}x${size} icon.iconset/icon_${size}x${size}.png
done
iconutil -c icns icon.iconset
rm -r icon.iconset
```

### Using Online Tools

- [Real Favicon Generator](https://realfavicongenerator.net/)
- [CloudConvert](https://cloudconvert.com/svg-to-ico)

## Notes

The desktop application will use these icons for:
- Application window icon
- System tray icon
- Installer icons
- Desktop shortcuts
