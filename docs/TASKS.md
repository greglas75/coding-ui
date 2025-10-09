# 📋 TASKS – Coding UI Development Roadmap

## ✅ Etap 1 — Setup
- [x] Stworzenie projektu React (Vite)
- [x] Połączenie z Supabase (answers table)
- [x] Hosting na Cloudflare Pages
- [x] Instalacja Tailwind + PostCSS
- [x] Bazowy layout + header + tabela

---

## 🔄 Etap 2 — UX / UI
- [x] Naprawa trybu Dark Mode (automatyczne przełączanie + inicjalizacja w main.tsx)
- [ ] Uporządkowanie typografii i spacingu
- [ ] Responsywność mobilna

---

## 🚀 Etap 3 — Funkcje użytkowe
- [x] Dodanie filtrów i wyszukiwania (FilterBar.tsx)
- [x] Dodanie bulk actions (BulkActions.tsx)
- [x] Skróty klawiaturowe (useKeyboardShortcuts.ts)
- [x] Debounce dla wyszukiwania (useDebounce.ts)
- [x] Active filters UI z reset
- [x] Obsługa Enter w wyszukiwaniu
- [x] Nowy dashboard z rozszerzonymi kolumnami (CodingGrid.tsx)
- [x] Szybka edycja inline z quick status buttons
- [ ] Paginacja kursorem (Supabase .range)
- [ ] Tryb edycji inline

---

## 🤖 Etap 4 — Inteligencja / AI
- [ ] Auto-kategoryzacja (Supabase Edge Function lub GPT)
- [ ] Prosty scoring jakościowy (np. "Confidence")
- [ ] Wizualizacja w dashboardzie

---

## 🧰 Etap 5 — Techniczne
- [ ] Logi zdarzeń (audit trail)
- [ ] Konfiguracja auth (Supabase Auth)
- [ ] Deploy produkcyjny (Cloudflare Pages)
- [ ] Testy E2E / snapshoty (Playwright)

---

## 🗓️ Changelog

### 2024-10-06
- ✅ **Etap 3 - Funkcje użytkowe**: Zaimplementowano kompletny system filtrowania, bulk actions i skrótów klawiaturowych
  - Dodano FilterBar.tsx z wyszukiwaniem i filtrowaniem statusu
  - Dodano BulkActions.tsx z przyciskami whitelist/blacklist/categorized
  - Dodano useKeyboardShortcuts.ts z obsługą klawiszy 1/2/3
  - Zaktualizowano AnswerTable.tsx z zaznaczaniem wierszy i integracją wszystkich komponentów
- ✅ **Etap 2 - UX/UI**: Naprawiono dark mode - klasa `dark` tylko na `<html>`, usunięto z `<body>`
- ✅ **Etap 2 - UX/UI**: Dodano inicjalizację dark mode w main.tsx przed pierwszym renderowaniem
- 🚀 **Deployment**: Stworzono kompletny system automatycznego deploymentu
  - deploy.sh, deploy.bat, deploy-advanced.sh, quick-deploy.sh
  - Dokumentacja DEPLOYMENT.md z instrukcjami
  - Aliasy terminala .deploy-aliases
  - NPM scripts dla łatwego użycia
- 📋 **Zarządzanie**: Dodano TASKS.md - centralną listę zadań i roadmapę projektu
- ✅ **Etap 3 - UX**: Zaimplementowano zaawansowane filtrowanie z debounce
  - Dodano useDebounce.ts hook z opóźnieniem 400ms
  - Przebudowano FilterBar jako controlled component
  - Dodano Active filters UI z badge'ami i reset
  - Obsługa Enter w wyszukiwaniu (natychmiastowe filtrowanie)
  - Przycisk Clear z disabled state
  - Warunkowe zapytania Supabase (tylko gdy wartości nie są puste)
- ✅ **Etap 3 - UX**: Ulepszono logikę wyszukiwania z dłuższym debounce
  - Zwiększono opóźnienie debounce z 400ms do 800ms
  - Dodano mechanizm leading/trailing edge w useDebounce
  - Dodano spinner "Filtering..." podczas wyszukiwania
  - Enter nadal działa natychmiast (pomija debounce)
  - Console.log dla debugowania filtrowania
- ✅ **Etap 3 - Dashboard**: Zaimplementowano nowy dashboard z rozszerzonymi kolumnami
  - Dodano SQL migrację dla nowych kolumn (language, country, quick_status, etc.)
  - Zaktualizowano typy TypeScript z nowymi polami
  - Stworzono CodingGrid.tsx z szybką edycją inline
  - Quick status buttons z kolorami i automatycznym coding_date
  - Edytowalne pola: translation_en, general_status, selected_code
  - Mini-toast "Saved" przy zapisie
  - Zachowano realtime i istniejącą logikę filtrowania
- ✅ **Etap 3 - Responsywny Layout**: Ulepszono layout dla lepszego wykorzystania szerokości ekranu
  - Zwiększono szerokość kontenera: max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px]
  - Elastyczny grid w FilterBar: grid-cols-1 md:grid-cols-12
  - Sticky header z backdrop-blur i responsywnymi kolumnami
  - Przełącznik density (Comfortable/Compact) z dynamicznym padding
  - Mobile card view (md:hidden) z kluczowymi polami
  - Quick status pills z nowymi kolorami i zwartym stylem
  - Ukrywanie kolumn na mniejszych ekranach (hidden sm/md/lg:table-cell)
