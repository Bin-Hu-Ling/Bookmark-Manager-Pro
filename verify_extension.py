#!/usr/bin/env python3
"""
Verify the extension structure and files.
"""

import os
import json
import sys

def check_file_exists(path, description):
    if os.path.exists(path):
        print(f"✓ {description}: {path}")
        return True
    else:
        print(f"✗ {description}: {path} - MISSING")
        return False

def check_manifest():
    manifest_path = "dist/manifest.json"
    if not os.path.exists(manifest_path):
        print("✗ Manifest file missing")
        return False
    
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        print("✓ Manifest.json is valid JSON")
        
        # Check required fields
        required_fields = ["manifest_version", "name", "version", "description"]
        for field in required_fields:
            if field in manifest:
                print(f"  ✓ Has {field}: {manifest[field]}")
            else:
                print(f"  ✗ Missing required field: {field}")
                return False
        
        # Check icons
        if "icons" in manifest:
            print("  ✓ Has icons configuration")
        else:
            print("  ✗ Missing icons configuration")
            return False
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"✗ Manifest.json has invalid JSON: {e}")
        return False

def main():
    print("Verifying Bookmark Manager Extension...")
    print("=" * 50)
    
    all_ok = True
    
    # Check essential files
    files_to_check = [
        ("dist/manifest.json", "Manifest file"),
        ("dist/background.js", "Background script"),
        ("dist/popup.html", "Popup HTML"),
        ("dist/popup.css", "Popup CSS"),
        ("dist/popup.js", "Popup JavaScript"),
    ]
    
    for path, desc in files_to_check:
        if not check_file_exists(path, desc):
            all_ok = False
    
    # Check icons
    print("\nChecking icons...")
    icon_sizes = [16, 32, 48, 128]
    for size in icon_sizes:
        icon_path = f"dist/icons/icon{size}.png"
        if not check_file_exists(icon_path, f"Icon {size}x{size}"):
            all_ok = False
    
    # Check manifest validity
    print("\nChecking manifest.json...")
    if not check_manifest():
        all_ok = False
    
    # Summary
    print("\n" + "=" * 50)
    if all_ok:
        print("✓ Extension structure is VALID and ready for testing!")
        print("\nNext steps:")
        print("1. Load the 'dist' folder in Chrome (chrome://extensions/)")
        print("2. Enable Developer mode and click 'Load unpacked'")
        print("3. Test the extension functionality")
        return 0
    else:
        print("✗ Extension structure has ISSUES that need fixing")
        return 1

if __name__ == "__main__":
    sys.exit(main())