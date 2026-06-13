#!/bin/sh
set -e

echo "=== Ksape Build & Package ==="
echo "Building with Parcel..."
npm run build

echo "Packaging module..."
VERSION=$(grep '^version=' module.prop | cut -d= -f2)
ZIPFILE="Ksape-${VERSION}.zip"

# Create temp directory with module structure
rm -rf dist/_package
mkdir -p dist/_package

cp module.prop dist/_package/
cp action.sh dist/_package/ 2>/dev/null || true
cp -r webroot dist/_package/webroot

cd dist/_package
zip -r "../${ZIPFILE}" .
cd ../..

rm -rf dist/_package

echo "Done: dist/${ZIPFILE}"
