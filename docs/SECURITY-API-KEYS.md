# 🔐 API Keys Security Guide

## ✅ **Co zostało zaimplementowane:**

### **1. Automatyczna Obfuskacja (XOR + Base64)**
- **Poziom**: Basic protection
- **Co robi**: Wszystkie klucze API są automatycznie obfuskowane przed zapisem do localStorage
- **Użycie**: Automatyczne - nie wymaga akcji użytkownika
- **Ochrona przed**: Casual inspection w DevTools
- **NIE chroni przed**: XSS attacks, zdeterminowanym atakującym

### **2. Web Crypto API (AES-256-GCM) - OPCJONALNE**
- **Poziom**: Strong encryption
- **Co robi**: Prawdziwe szyfrowanie z hasłem użytkownika (PBKDF2 + AES-GCM)
- **Użycie**: Wymaga master password od użytkownika
- **Ochrona przed**: Offline attacks, casual inspection
- **NIE chroni przed**: XSS attacks (bo klucz musi być w pamięci podczas użycia)

---

## 📊 **Porównanie poziomów bezpieczeństwa:**

| Metoda | Ochrona przed casual inspection | Ochrona przed XSS | Wygoda użytkowania |
|--------|----------------------------------|-------------------|---------------------|
| **Plain text** | ❌ Nie | ❌ Nie | ✅✅✅ Wysoka |
| **Obfuskacja (current)** | ✅ Tak | ❌ Nie | ✅✅✅ Wysoka |
| **AES-256 + Master Password** | ✅✅ Tak | ❌ Nie | ⚠️ Średnia (wymaga hasła) |
| **Backend-only (production)** | ✅✅✅ Tak | ✅✅✅ Tak | ✅✅ Wysoka |

---

## 🎯 **Rekomendacje:**

### **Dla Development/Testing:**
✅ **Obecna implementacja (obfuskacja) jest OK**
- Wystarczająca dla lokalnego developmentu
- Nie wymaga hasła
- Backward compatible

### **Dla Production:**
⚠️ **NIE używaj localStorage - przenieś klucze na backend!**

```
DLACZEGO?
┌──────────────────────────────────────────────────────────────┐
│ JavaScript ZAWSZE ma dostęp do localStorage                  │
│ XSS attack może ukraść klucze PRZED szyfrowaniem            │
│ Szyfrowanie w JS = obfuskacja, NIE prawdziwe bezpieczeństwo │
└──────────────────────────────────────────────────────────────┘

LEPSZE ROZWIĄZANIE:
┌──────────────────────────────────────────────────────────────┐
│ 1. Klucze API tylko na backendzie                            │
│ 2. Frontend wysyła tylko user auth token                     │
│ 3. Backend używa swoich kluczy do wywołania AI               │
│ 4. Rate limiting per user na backendzie                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔍 **Co jest w localStorage teraz:**

### Przed (plain text):
```javascript
localStorage.getItem('anthropic_api_key')
// Returns: "sk-ant-api03-abc123..."
```

### Po (obfuskated):
```javascript
localStorage.getItem('anthropic_api_key')
// Returns: "Q29kaW5nLVVJLTIwMjU6YWJjMTIz..."  <- Base64 obfuscated
```

---

## 🛠️ **Jak to działa (techniczne szczegóły):**

### **Obfuskacja (automatyczna):**
```typescript
// Przy zapisie:
localStorage.setItem('key', obfuscate(apiKey))

// Przy odczycie:
const key = deobfuscate(localStorage.getItem('key'))
```

**Proces:**
1. Base64 encode klucza
2. XOR z fixed key: `'coding-ui-2025'`
3. Base64 encode wyniku
4. Zapisz do localStorage

### **Szyfrowanie (opcjonalne - TODO):**
```typescript
// Przy zapisie (wymaga master password):
const encrypted = await encrypt(apiKey, masterPassword)
localStorage.setItem('key', encrypted)

// Przy odczycie:
const decrypted = await decrypt(stored, masterPassword)
```

**Proces:**
1. Generate random salt (16 bytes)
2. Derive AES-256 key from password (PBKDF2, 100k iterations)
3. Generate random IV (12 bytes)
4. Encrypt with AES-256-GCM
5. Combine: salt + IV + encrypted data
6. Base64 encode i zapisz

---

## ✅ **Co chronisz TERAZ:**

### ✅ Casual inspection
Ktoś kto spojrzy na localStorage w DevTools NIE zobaczy klucza w plain text.

### ✅ Backward compatibility
Stare klucze (plain text) nadal działają - automatyczna migracja przy pierwszym zapisie.

---

## ⚠️ **Czego NIE chronisz:**

### ❌ XSS Attacks
Jeśli atakujący wstrzyknie JavaScript na stronę, może:
- Wywołać `getAnthropicAPIKey()` i ukraść klucz
- Nasłuchiwać na API requests i przechwycić klucz
- Podmienić funkcje szyfrowania

### ❌ Malicious Browser Extensions
Extension z dostępem do localStorage może odczytać i deszyfrować klucze.

### ❌ Physical Access
Ktoś z fizycznym dostępem do komputera może odczytać localStorage.

---

## 📝 **TODO: Opcjonalne ulepszenia**

### **1. Master Password (dla paranoidalnych):**
```typescript
// W Settings:
<input
  type="password"
  placeholder="Master Password (optional - for AES-256 encryption)"
  onChange={(e) => setMasterPassword(e.target.value)}
/>

// Przy zapisie:
if (masterPassword) {
  await encrypt(apiKey, masterPassword)
} else {
  obfuscate(apiKey) // fallback
}
```

### **2. Session-only mode:**
```typescript
// Zamiast localStorage:
sessionStorage.setItem('anthropic_api_key', apiKey)
// Klucz znika po zamknięciu karty
```

### **3. Warning banner w Settings:**
```tsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
  <h3>⚠️ Security Notice</h3>
  <p>
    API keys are obfuscated in browser storage but NOT fully encrypted.
    For production use, store keys on backend server only.
  </p>
</div>
```

---

## 🎓 **Edukacja użytkownika:**

W SettingsPage dodaj:

```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <h3>🔒 How are my keys protected?</h3>
  <ul className="text-sm space-y-2">
    <li>✅ Keys are obfuscated (XOR + Base64) in localStorage</li>
    <li>✅ Not visible in plain text when inspecting browser storage</li>
    <li>⚠️ Still accessible to JavaScript running on this page</li>
    <li>💡 For production: store keys on backend server instead</li>
  </ul>
</div>
```

---

## 🚀 **Production Migration Path:**

```typescript
// Frontend (current - local):
const apiKey = getAnthropicAPIKey() // from localStorage
axios.post('/api/generate', { apiKey, ...data })

// Backend passes to Python service:
pythonService.generate({ apiKey, ...data })

// ↓↓↓ MIGRATE TO ↓↓↓

// Frontend (production):
// NO API KEY IN FRONTEND!
axios.post('/api/generate', { ...data }, {
  headers: { Authorization: `Bearer ${userToken}` }
})

// Backend:
router.post('/generate', authenticateUser, async (req, res) => {
  // Get API key from environment or database (per user/org)
  const apiKey = await getAPIKeyForUser(req.user.id)

  // Use backend's key
  pythonService.generate({ apiKey, ...data })
})
```

---

**✅ CURRENT STATUS: Basic obfuscation implemented**
**📋 NEXT STEPS: User education + warning banners**
**🎯 LONG TERM: Backend-only API keys for production**
