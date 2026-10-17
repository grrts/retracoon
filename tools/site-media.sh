#!/usr/bin/env bash
# Copies the marketing kit's assets that the website uses into server/public/, sized and
# compressed for the web. Run from the repo root with the marketing folder as argument:
#   tools/site-media.sh /path/to/marketing
# Needs ffmpeg (with libx264 and libwebp). The output is committed; rerun after the
# marketing kit changes.
set -euo pipefail

src="${1:?usage: tools/site-media.sh /path/to/marketing}"
out="server/public"
site="$out/site"
press="$out/downloads"
rm -rf "$press"  # site/ also holds the web font from tools/site-font.py
mkdir -p "$site" "$press/raccoons" "$press/capsules" "$press/screenshots" "$press/video"

ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# Landing page hero: the Steam library art, wide for desktop and a square crop around the
# raccoon for phones.
ff -i "$src/steam/capsules/steam-library-hero-3840x1240.png" -vf "scale=1920:-2:flags=neighbor" -c:v libwebp -quality 88 "$site/hero.webp"
ff -i "$src/steam/capsules/steam-library-hero-3840x1240.png" -vf "crop=1240:1240:900:0,scale=800:800:flags=lanczos" -c:v libwebp -quality 88 "$site/hero-square.webp"
# Landing page: the glow-up loop (hero), the boss fight (hidden bosses) and stills.
ff -i "$src/video/glow-up-vertical.mp4" -an -vf "crop=1080:1440:0:236,scale=540:720:flags=neighbor" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart "$site/glow-up.mp4"
# The poster is the fully kitted raccoon near the end of the loop.
ff -ss 10 -i "$src/video/glow-up-vertical.mp4" -vf "crop=1080:1440:0:236,scale=540:720:flags=neighbor" -frames:v 1 -c:v libwebp -quality 85 "$site/glow-up.webp"
ff -i "$src/video/boss-clip-landscape.mp4" -an -vf "scale=1280:720:flags=lanczos" -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -movflags +faststart "$site/boss-fight.mp4"
ff -i "$src/steam/screenshots/01-boss-candy.png" -vf "scale=1280:720:flags=lanczos" -c:v libwebp -quality 85 "$site/boss-fight.webp"
# The push-or-retreat store shot, without its caption.
ff -i "$src/store/google-play/05-push-or-retreat.png" -vf "crop=1544:872:188:182,scale=1280:-2:flags=lanczos" -c:v libwebp -quality 85 "$site/push-or-retreat.webp"

# Press kit: the full-size files, as downloads. PNGs are small already.
cp "$src"/raccoons/*.png "$press/raccoons/"
cp "$src"/steam/capsules/*.png "$press/capsules/"
cp "$src"/steam/screenshots/*.png "$press/screenshots/"
cp "$src/video/glow-up.gif" "$press/video/glow-up.gif"
ff -i "$src/video/boss-clip-landscape.mp4" -an -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart "$press/video/boss-clip-landscape.mp4"
ff -i "$src/video/boss-clip-vertical.mp4" -an -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart "$press/video/boss-clip-vertical.mp4"
ff -i "$src/video/glow-up-vertical.mp4" -an -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart "$press/video/glow-up-vertical.mp4"

du -sh "$site" "$press"
