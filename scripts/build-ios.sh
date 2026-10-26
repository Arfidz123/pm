#!/usr/bin/env bash
set -e

echo "=== Building iOS IPA (Unsigned) ==="

# 1. Install pods
cd ios
pod install
cd ..

# 2. Build via xcodebuild
echo "Compiling via xcodebuild..."
xcodebuild clean build \
  -workspace ios/CMMSApp.xcworkspace \
  -scheme CMMSApp \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath derived_data \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  AD_HOC_CODE_SIGNING_ALLOWED=YES

# 3. Packaging into .ipa
echo "Packaging into CMMSApp-unsigned.ipa..."
mkdir -p Payload
cp -r derived_data/Build/Products/Release-iphoneos/CMMSApp.app Payload/
zip -r CMMSApp-unsigned.ipa Payload
rm -rf Payload

echo "=== Build Complete: CMMSApp-unsigned.ipa ready! ==="
