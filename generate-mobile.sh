#!/bin/bash

# ============================================================================
# ZeusX - Script di build e sincronizzazione mobile
# ============================================================================

set -e  # Ferma lo script se c'è un errore

echo "🚀 Inizio build e sincronizzazione mobile..."

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory del frontend
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/frontend" && pwd)"

echo -e "${YELLOW}📦 Step 1/4: Installazione dipendenze...${NC}"
cd "$FRONTEND_DIR"
if command -v npm &> /dev/null; then
    npm install
else
    echo -e "${RED}❌ npm non trovato. Installa Node.js prima di continuare.${NC}"
    exit 1
fi

echo -e "${YELLOW}🔨 Step 2/4: Build del frontend...${NC}"
npm run build

echo -e "${YELLOW}📱 Step 3/4: Sincronizzazione con Capacitor...${NC}"
if command -v npx &> /dev/null; then
    npx cap sync
else
    echo -e "${RED}❌ npx non trovato. Installa Node.js prima di continuare.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build e sincronizzazione completate!${NC}"
echo ""
echo "Per aprire Android Studio:"
echo "  cd $FRONTEND_DIR && npx cap open android"
echo ""
echo "Per aprire Xcode (solo macOS):"
echo "  cd $FRONTEND_DIR && npx cap open ios"