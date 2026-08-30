import subprocess
import os

def run_cmd(cmd):
    # print(f"Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error running: {' '.join(cmd)}")
        print(res.stderr)
        raise Exception(f"Command failed: {res.stderr}")

def main():
    print("Starting PNG Asset Generation...")
    
    # Paths to source SVGs
    mark_teal_svg = "/home/wah-vanessa/Desktop/meyalo/assets/brand/mark/meyalo-mark-teal.svg"
    mark_white_svg = "/home/wah-vanessa/Desktop/meyalo/assets/brand/mark/meyalo-mark-white.svg"
    mark_black_svg = "/home/wah-vanessa/Desktop/meyalo/assets/brand/mark/meyalo-mark-black.svg"
    
    horiz_svg = "/home/wah-vanessa/Desktop/meyalo/assets/brand/master/meyalo-horizontal.svg"
    stacked_light_svg = "/home/wah-vanessa/Desktop/meyalo/assets/brand/logo/stacked/meyalo-stacked-light.svg"
    stacked_dark_svg = "/home/wah-vanessa/Desktop/meyalo/assets/brand/logo/stacked/meyalo-stacked-dark.svg"
    
    # 1. Generate Mark PNGs (transparent background)
    mark_sizes = [16, 20, 24, 32, 40, 48, 64, 72, 96, 128, 144, 192, 256, 384, 512, 1024]
    for size in mark_sizes:
        dest = f"/home/wah-vanessa/Desktop/meyalo/assets/brand/mark/meyalo-mark-teal-{size}.png"
        run_cmd(["convert", "-background", "none", "-resize", f"{size}x{size}", mark_teal_svg, dest])
        
    print("Generated Mark PNGs.")
    
    # 2. Create the App Icon SVG template (teal background + centered white mark)
    # The mark has size 360x360 within the 512x512 square (about 14% padding)
    # Let's read mark path d
    with open(mark_white_svg, "r") as f:
        content = f.read()
    import re
    mark_d = re.search(r'd="([^"]+)"', content).group(1)
    
    app_icon_svg_content = f'''<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#087F73" />
  <g transform="translate(76, 76) scale(0.703125)">
    <path d="{mark_d}" fill="#FFFFFF" fill-rule="evenodd" />
  </g>
</svg>
'''
    app_icon_svg_path = "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/app_icon_template.svg"
    with open(app_icon_svg_path, "w") as f:
        f.write(app_icon_svg_content)
        
    # Generate App Icon PNGs (solid background, no transparency)
    app_icon_sizes = [16, 20, 29, 32, 40, 48, 58, 60, 72, 76, 80, 87, 96, 120, 128, 144, 152, 167, 180, 192, 256, 512, 1024]
    for size in app_icon_sizes:
        dest = f"/home/wah-vanessa/Desktop/meyalo/assets/brand/app-icon/app-icon-{size}.png"
        run_cmd(["convert", "-resize", f"{size}x{size}", app_icon_svg_path, dest])
        
    # Standard iOS App Store icon (solid, no transparency)
    run_cmd(["convert", "-resize", "1024x1024", app_icon_svg_path, "/home/wah-vanessa/Desktop/meyalo/assets/brand/app-icon/ios-icon-1024.png"])
    print("Generated App Icon PNGs.")
    
    # 3. Generate Android Adaptive Icon Foreground
    # For Android adaptive, the safe zone is the inner 66% circle (288px within 432px)
    # Foreground must be transparent, containing only the white mark
    adaptive_fg_svg_content = f'''<svg width="432" height="432" viewBox="0 0 432 432" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(72, 72) scale(0.5625)">
    <path d="{mark_d}" fill="#FFFFFF" fill-rule="evenodd" />
  </g>
</svg>
'''
    adaptive_fg_svg_path = "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/adaptive_fg.svg"
    with open(adaptive_fg_svg_path, "w") as f:
        f.write(adaptive_fg_svg_content)
        
    run_cmd(["convert", "-background", "none", "-resize", "432x432", adaptive_fg_svg_path, "/home/wah-vanessa/Desktop/meyalo/assets/brand/app-icon/adaptive-icon-foreground.png"])
    print("Generated Android Adaptive Foreground.")
    
    # 4. Generate Monochrome Icon (for themed icons)
    # Typically dark gray/black on transparent background, centered in 432x432
    monochrome_svg_content = f'''<svg width="432" height="432" viewBox="0 0 432 432" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(72, 72) scale(0.5625)">
    <path d="{mark_d}" fill="#000000" fill-rule="evenodd" />
  </g>
</svg>
'''
    monochrome_svg_path = "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/monochrome.svg"
    with open(monochrome_svg_path, "w") as f:
        f.write(monochrome_svg_content)
        
    run_cmd(["convert", "-background", "none", "-resize", "432x432", monochrome_svg_path, "/home/wah-vanessa/Desktop/meyalo/assets/brand/app-icon/monochrome-icon.png"])
    print("Generated Monochrome Icon.")
    
    # 5. Generate Favicons
    # Standard ICO (contains 16, 32, 48 sizes)
    ico_dest = "/home/wah-vanessa/Desktop/meyalo/assets/brand/favicon/favicon.ico"
    # Generate temporary PNGs for ICO compilation
    run_cmd(["convert", "-background", "none", "-resize", "16x16", mark_teal_svg, "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/fav16.png"])
    run_cmd(["convert", "-background", "none", "-resize", "32x32", mark_teal_svg, "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/fav32.png"])
    run_cmd(["convert", "-background", "none", "-resize", "48x48", mark_teal_svg, "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/fav48.png"])
    
    run_cmd(["convert", 
             "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/fav16.png",
             "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/fav32.png",
             "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/fav48.png",
             ico_dest])
             
    # Apple touch icon 180x180 (solid teal background, centered white mark)
    run_cmd(["convert", "-resize", "180x180", app_icon_svg_path, "/home/wah-vanessa/Desktop/meyalo/assets/brand/favicon/apple-touch-icon.png"])
    
    # Standalone favicon PNGs
    favicon_sizes = [16, 32, 48, 64]
    for size in favicon_sizes:
        dest = f"/home/wah-vanessa/Desktop/meyalo/assets/brand/favicon/favicon-{size}x{size}.png"
        run_cmd(["convert", "-background", "none", "-resize", f"{size}x{size}", mark_teal_svg, dest])
        
    # PWA icons
    run_cmd(["convert", "-background", "none", "-resize", "192x192", mark_teal_svg, "/home/wah-vanessa/Desktop/meyalo/assets/brand/favicon/icon-192.png"])
    run_cmd(["convert", "-background", "none", "-resize", "512x512", mark_teal_svg, "/home/wah-vanessa/Desktop/meyalo/assets/brand/favicon/icon-512.png"])
    print("Generated Favicons.")
    
    # 6. Generate Social Avatars (teal background, centered white mark, safe zone padded)
    avatar_sizes = [400, 512, 1024]
    for size in avatar_sizes:
        dest = f"/home/wah-vanessa/Desktop/meyalo/assets/brand/social/avatar-{size}.png"
        run_cmd(["convert", "-resize", f"{size}x{size}", app_icon_svg_path, dest])
    print("Generated Social Avatars.")
    
    # 7. Generate Splash Screen Images
    # Light splash: Canvas (#F7F9F7) background + centered teal mark (height 200px)
    splash_light_dest = "/home/wah-vanessa/Desktop/meyalo/assets/brand/splash/splash-light.png"
    run_cmd(["convert", "-size", "1242x2436", "xc:#F7F9F7", "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/splash_base_light.png"])
    run_cmd(["convert", "-background", "none", "-resize", "200x200", mark_teal_svg, "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/splash_mark_teal.png"])
    run_cmd(["composite", "-gravity", "center", 
             "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/splash_mark_teal.png",
             "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/splash_base_light.png",
             splash_light_dest])
             
    # Dark splash: Teal (#087F73) background + centered white mark (height 200px)
    splash_dark_dest = "/home/wah-vanessa/Desktop/meyalo/assets/brand/splash/splash-dark.png"
    run_cmd(["convert", "-size", "1242x2436", "xc:#087F73", "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/splash_base_dark.png"])
    run_cmd(["convert", "-background", "none", "-resize", "200x200", mark_white_svg, "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/splash_mark_white.png"])
    run_cmd(["composite", "-gravity", "center", 
             "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/splash_mark_white.png",
             "/home/wah-vanessa/.gemini/antigravity/brain/9d869e20-8061-4267-ab66-e43faa46c990/scratch/splash_base_dark.png",
             splash_dark_dest])
    print("Generated Splash Screen Images.")
    
    # 8. Generate Logo PNGs
    # Horizontal: 1024x197
    run_cmd(["convert", "-background", "none", "-resize", "1024x", horiz_svg, "/home/wah-vanessa/Desktop/meyalo/assets/brand/logo/horizontal/meyalo-horizontal-teal-ink.png"])
    # Stacked light: 1024x819
    run_cmd(["convert", "-background", "none", "-resize", "1024x", stacked_light_svg, "/home/wah-vanessa/Desktop/meyalo/assets/brand/logo/stacked/meyalo-stacked-light.png"])
    # Stacked dark: 1024x819
    run_cmd(["convert", "-background", "none", "-resize", "1024x", stacked_dark_svg, "/home/wah-vanessa/Desktop/meyalo/assets/brand/logo/stacked/meyalo-stacked-dark.png"])
    print("Generated Logo PNGs.")
    
    print("Asset generation complete!")

if __name__ == "__main__":
    main()
