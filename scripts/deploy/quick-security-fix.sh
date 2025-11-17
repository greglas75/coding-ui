#!/bin/bash

# 🔒 QUICK SECURITY FIX SCRIPT
# Automatycznie naprawia krytyczne problemy bezpieczeństwa
# Uruchom: chmod +x quick-security-fix.sh && ./quick-security-fix.sh

set -e

echo "🔒 =========================================="
echo "🔒 QUICK SECURITY FIX SCRIPT"
echo "🔒 =========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FIXES_APPLIED=0
WARNINGS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2

    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
        ((FIXES_APPLIED++))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
        ((WARNINGS++))
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 KROK 1: NAPRAWA PODATNOŚCI W ZALEŻNOŚCIACH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_status "INFO" "Aktualizowanie podatnych pakietów..."

# Aktualizuj xlsx
if npm list xlsx | grep -q "xlsx@0.18.5"; then
    print_status "WARN" "Znaleziono podatny xlsx@0.18.5"
    npm install xlsx@latest
    print_status "OK" "Zaktualizowano xlsx do najnowszej wersji"
else
    print_status "OK" "xlsx jest już w bezpiecznej wersji"
fi

# Aktualizuj happy-dom
if npm list happy-dom | grep -q "happy-dom@20.0.0"; then
    print_status "WARN" "Znaleziono podatny happy-dom@20.0.0"
    npm install happy-dom@latest --save-dev
    print_status "OK" "Zaktualizowano happy-dom do najnowszej wersji"
else
    print_status "OK" "happy-dom jest już w bezpiecznej wersji"
fi

# Weryfikuj npm audit
echo ""
print_status "INFO" "Uruchamiam npm audit..."
if npm audit --audit-level=high > /dev/null 2>&1; then
    print_status "OK" "Brak krytycznych podatności w zależnościach"
else
    print_status "WARN" "npm audit wykrył problemy - sprawdź szczegóły: npm audit"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 KROK 2: KONFIGURACJA ZABEZPIECZEŃ W .env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Sprawdź czy .env istnieje
if [ ! -f .env ]; then
    print_status "WARN" "Plik .env nie istnieje - tworzę z domyślnymi wartościami"
    touch .env
fi

# Funkcja do dodawania/aktualizacji wartości w .env
update_env() {
    local key=$1
    local value=$2

    if grep -q "^${key}=" .env; then
        # Wartość istnieje - zaktualizuj
        if grep -q "^${key}=${value}$" .env; then
            print_status "OK" "${key} już ustawione poprawnie"
        else
            # Backup
            cp .env .env.backup
            sed -i.bak "s/^${key}=.*/${key}=${value}/" .env && rm .env.bak
            print_status "OK" "Zaktualizowano ${key}=${value}"
        fi
    else
        # Wartość nie istnieje - dodaj
        echo "${key}=${value}" >> .env
        print_status "OK" "Dodano ${key}=${value}"
    fi
}

# Dodaj zabezpieczenia
update_env "ENABLE_API_AUTH" "true"
update_env "ENABLE_CSRF" "true"
update_env "ENABLE_RATE_LIMIT" "true"
update_env "ENABLE_CSP" "true"
update_env "STRICT_UPLOAD_VALIDATION" "true"

# Sprawdź CORS_ORIGINS
if ! grep -q "^CORS_ORIGINS=" .env; then
    echo "CORS_ORIGINS=http://localhost:5173,http://localhost:3000" >> .env
    print_status "OK" "Dodano CORS_ORIGINS (localhost)"
    print_status "WARN" "UWAGA: Przed wdrożeniem zmień CORS_ORIGINS na domenę produkcyjną!"
fi

# Sprawdź API_ACCESS_TOKEN
if ! grep -q "^API_ACCESS_TOKEN=" .env; then
    # Generuj losowy token
    TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "API_ACCESS_TOKEN=${TOKEN}" >> .env
    print_status "OK" "Wygenerowano API_ACCESS_TOKEN"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 KROK 3: WERYFIKACJA BEZPIECZEŃSTWA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Sprawdź .gitignore
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    print_status "OK" ".env jest w .gitignore"
else
    echo ".env" >> .gitignore
    print_status "OK" "Dodano .env do .gitignore"
fi

if grep -q "^\.env\*" .gitignore 2>/dev/null; then
    print_status "OK" ".env* pattern w .gitignore"
else
    echo ".env*" >> .gitignore
    print_status "OK" "Dodano .env* do .gitignore"
fi

# Sprawdź czy .env jest w git
if git ls-files --error-unmatch .env > /dev/null 2>&1; then
    print_status "WARN" ".env jest w repozytorium git!"
    echo ""
    echo -e "${RED}UWAGA: Plik .env jest śledzony przez git!${NC}"
    echo "Usuń go TERAZ poleceniem:"
    echo "  git rm --cached .env"
    echo "  git commit -m \"Remove .env from repository\""
    echo ""
else
    print_status "OK" ".env NIE jest w git repository"
fi

# Sprawdź czy src/lib/openai.ts istnieje (nie powinien!)
if [ -f "src/lib/openai.ts" ]; then
    print_status "WARN" "Znaleziono src/lib/openai.ts - KLUCZ API W PRZEGLĄDARCE!"
    echo ""
    echo -e "${YELLOW}UWAGA: Plik src/lib/openai.ts eksponuje klucz OpenAI w przeglądarce!${NC}"
    echo "Usuń go i użyj backend API endpoint /api/gpt-test"
    echo "Zobacz szczegóły w PLAN_NAPRAWCZY_BEZPIECZENSTWA.md (Priorytet 1.3)"
    echo ""
else
    print_status "OK" "Brak src/lib/openai.ts (klucz API nie w przeglądarce)"
fi

# Sprawdź VITE_OPENAI_API_KEY (nie powinno być!)
if grep -q "^VITE_OPENAI_API_KEY=" .env; then
    print_status "WARN" "VITE_OPENAI_API_KEY znalezione w .env - NIEBEZPIECZNE!"
    echo ""
    echo -e "${YELLOW}UWAGA: VITE_OPENAI_API_KEY eksponuje klucz w przeglądarce!${NC}"
    echo "Usuń VITE_ prefix i użyj tylko OPENAI_API_KEY (tylko backend)"
    echo ""
else
    print_status "OK" "Brak VITE_OPENAI_API_KEY w .env"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PODSUMOWANIE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Naprawiono: $FIXES_APPLIED${NC}"
echo -e "${YELLOW}⚠️  Ostrzeżenia: $WARNINGS${NC}"
echo ""

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  WYMAGA UWAGI${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Masz $WARNINGS ostrzeżeń do naprawienia ręcznie."
    echo "Zobacz powyższe komunikaty i przeczytaj:"
    echo "  - PLAN_NAPRAWCZY_BEZPIECZENSTWA.md"
    echo "  - SECURITY_FIXES_IMMEDIATE.md"
    echo ""
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ WSZYSTKIE AUTOMATYCZNE NAPRAWY WYKONANE${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
fi

echo "NASTĘPNE KROKI:"
echo ""
echo "1. Przeczytaj: PLAN_NAPRAWCZY_BEZPIECZENSTWA.md"
echo "2. Wykonaj manualne kroki z Fazy 1:"
echo "   - Usuń src/lib/openai.ts"
echo "   - Zaktualizuj api-server.js (Priorytet 1.4)"
echo "   - Napraw polityki RLS w Supabase (Faza 2)"
echo ""
echo "3. Przetestuj zmiany:"
echo "   npm run dev:full"
echo ""
echo "4. Uruchom security check:"
echo "   ./security-check.sh"
echo ""

exit 0
