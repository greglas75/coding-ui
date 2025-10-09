# 📂 File Data Coding - Documentation

## 🎯 Overview

The **File Data Coding** feature allows bulk import of answer data from CSV or Excel files for automatic coding. This streamlines the process of importing large datasets into the coding system.

---

## ✨ Key Features

### 1. **File Upload Support**
- ✅ **CSV files** (.csv)
- ✅ **Excel files** (.xlsx, .xls)
- ✅ Drag-and-drop or file picker
- ✅ Real-time file validation
- ✅ File size display

### 2. **Category Assignment**
- Select target category from dropdown
- All imported answers assigned to selected category
- Category list loaded dynamically from Supabase

### 3. **Data Validation**
- Validates file structure (2-4 columns required)
- Checks for required fields (id, text)
- Handles optional fields (language, country)
- Clear error messages for invalid data

### 4. **Progress Feedback**
- Loading spinner during upload
- Success/error messages with details
- Record count display
- Visual feedback throughout process

---

## 📋 File Structure Requirements

### Required Columns

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| 1 (id) | string | ✅ Yes | Unique identifier | "1", "resp_001" |
| 2 (text) | string | ✅ Yes | Answer text to be coded | "Nike shoes are great" |
| 3 (language) | string | ❌ Optional | Language code (ISO 639-1) | "en", "pl", "es" |
| 4 (country) | string | ❌ Optional | Country name | "Poland", "USA" |

### Important Notes

⚠️ **No header row** - Start directly with data
⚠️ **Comma-separated** - Use commas as delimiters (CSV)
⚠️ **Unique IDs** - Each row must have a unique identifier
⚠️ **Empty optional fields** - Leave blank or omit trailing commas

---

## 📄 Example Files

### CSV Example

```csv
1,Nike shoes are great,en,Poland
2,Adidas running gear,en,USA
3,Gucci bag expensive,,Vietnam
4,Dior perfume smells good,en
5,Chanel makeup quality,en,France
```

### Excel Example

| A | B | C | D |
|---|---|---|---|
| 1 | Nike shoes are great | en | Poland |
| 2 | Adidas running gear | en | USA |
| 3 | Gucci bag expensive | | Vietnam |
| 4 | Dior perfume smells good | en | |
| 5 | Chanel makeup quality | en | France |

---

## 🚀 How to Use

### Step 1: Navigate to File Data Coding
- Open the app navigation menu
- Click **"📂 File Import"** in the header
- Or navigate to `/file-data-coding`

### Step 2: Select Category
1. Click the **Category** dropdown
2. Choose the target category for imported data
3. All imported answers will be assigned to this category

### Step 3: Upload File
1. Click **"Upload File"** button or drag-and-drop
2. Select your CSV or Excel file
3. File name and size will be displayed

### Step 4: Submit
1. Click **"Send to Coding"** button
2. Wait for processing (spinner will appear)
3. Success message shows number of imported records

### Step 5: Start Coding
- Navigate to **Coding** view
- Select the category you imported to
- All imported answers will have status "uncategorized"
- Begin coding as normal

---

## 🔄 What Happens During Import

### 1. File Parsing
```typescript
// CSV: Uses FileReader + manual parsing
// Excel: Uses xlsx library (imported dynamically)
```

### 2. Data Validation
- Each row must have at least 2 columns (id, text)
- Invalid rows are skipped with error message
- Empty lines are ignored

### 3. Database Insert
```sql
INSERT INTO answers (
  answer_text,
  language,
  country,
  category_id,
  general_status,
  created_at
)
VALUES (
  'Nike shoes are great',
  'en',
  'Poland',
  1,
  'uncategorized',
  NOW()
);
```

### 4. Status Assignment
- All imported answers: `general_status = 'uncategorized'`
- Ready for manual or AI-assisted coding
- Appears in Coding view immediately

---

## 🎨 UI Components

### Main Form
```tsx
<FileDataCodingPage>
  <CategoryDropdown />
  <FileInput accept=".csv,.xlsx,.xls" />
  <UploadButton />
  <ResultMessage />
</FileDataCodingPage>
```

### Features
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark mode support
- ✅ Loading states and animations
- ✅ Error handling and validation
- ✅ Success/error toasts (Sonner)
- ✅ Breadcrumb navigation

---

## 📊 Statistics Dashboard

The page displays quick stats:

| Stat | Description |
|------|-------------|
| **Total Categories** | Number of available categories |
| **Supported Formats** | CSV, XLSX |
| **Max Columns** | 4 (id, text, language, country) |

---

## 🐛 Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid file type" | Wrong file extension | Use .csv or .xlsx only |
| "File is empty" | No data in file | Add at least one row |
| "Invalid format" | Missing columns | Ensure id and text columns |
| "Upload failed" | Database error | Check Supabase connection |
| "Category required" | No category selected | Select a category first |

### Error Display
- ❌ Red banner with error icon
- Clear error message
- Suggested action
- Retry option available

---

## 🔧 Technical Implementation

### Dependencies
```json
{
  "xlsx": "^0.18.5"
}
```

### Key Files
```
src/
├── pages/
│   └── FileDataCodingPage.tsx      ← Main component
├── components/
│   ├── AppHeader.tsx                ← Navigation link
│   └── layout/MainLayout.tsx        ← Page wrapper
└── App.tsx                          ← Routing
```

### Database Schema
```sql
-- Answers table (existing)
CREATE TABLE answers (
  id BIGSERIAL PRIMARY KEY,
  answer_text TEXT NOT NULL,
  language TEXT,
  country TEXT,
  category_id BIGINT REFERENCES categories(id),
  general_status TEXT DEFAULT 'uncategorized',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 Use Cases

### 1. **Survey Import**
Import survey responses from Google Forms or Typeform:
```csv
1,I love Nike shoes,en,USA
2,Adidas is my favorite brand,en,UK
3,Gucci bags are expensive,,France
```

### 2. **Customer Feedback**
Import customer reviews from CSV export:
```csv
rev_001,Great product quality!,en,Poland
rev_002,Fast shipping,en,USA
rev_003,Excellent service,,Germany
```

### 3. **Social Media Data**
Import social media mentions:
```csv
tweet_123,@Nike shoes are amazing!,en
post_456,Love my new @Gucci bag,en,Italy
comment_789,@Dior perfume smells great,en
```

### 4. **Research Data**
Import research survey data:
```csv
1,Participant response text,en,Poland
2,Another participant response,pl,Poland
3,International response,en,USA
```

---

## 📈 Performance

### Optimization
- ✅ **Lazy loading** - xlsx library loaded only when needed
- ✅ **Batch insert** - All rows inserted in single query
- ✅ **Client-side parsing** - No server overhead
- ✅ **Progress feedback** - User knows status at all times

### Recommended Limits
- **File size:** < 10 MB
- **Row count:** < 10,000 rows per file
- **For larger datasets:** Split into multiple files

---

## 🔒 Security

### Validation
- ✅ File type validation (client-side)
- ✅ File size check
- ✅ SQL injection prevention (Supabase parameterized queries)
- ✅ User authentication required
- ✅ Category access control

---

## 🎨 UI/UX Features

### Visual Feedback
1. **Info banner** - Blue background with instructions
2. **File preview** - Shows file name and size
3. **Success message** - Green banner with checkmark
4. **Error message** - Red banner with alert icon
5. **Loading spinner** - Animated during processing

### Responsive Design
- **Mobile:** Single column, stacked buttons
- **Tablet:** Two columns, side-by-side buttons
- **Desktop:** Full width, all features visible

### Dark Mode
- ✅ Full dark mode support
- ✅ Consistent color scheme
- ✅ Readable text on all backgrounds

---

## 📚 Related Documentation

- [Category Management Guide](./CATEGORY_MANAGEMENT_GUIDE.md)
- [Coding Workflow Guide](./CODING_WORKFLOW_GUIDE.md)
- [API Server Guide](./API_SERVER_GUIDE.md)
- [Database Schema](../docs/sql/README.md)

---

## ✅ Testing Checklist

### Before Using
- [ ] Install xlsx package: `npm install xlsx`
- [ ] Verify Supabase connection
- [ ] Check categories exist in database
- [ ] Prepare test CSV file

### During Testing
- [ ] Upload valid CSV file
- [ ] Upload valid Excel file
- [ ] Test with missing optional columns
- [ ] Test error handling (invalid file)
- [ ] Verify data in Supabase
- [ ] Check Coding view for imported data

### After Import
- [ ] Navigate to Coding view
- [ ] Verify all records imported
- [ ] Check status = "uncategorized"
- [ ] Verify category assignment
- [ ] Test manual coding workflow

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Drag-and-drop file upload
- [ ] File preview before upload
- [ ] Progress bar for large files
- [ ] Duplicate detection
- [ ] Auto-mapping columns
- [ ] Template download
- [ ] Batch category assignment
- [ ] Import history log

---

## 📞 Support

### Issues?
1. Check file format matches requirements
2. Verify category is selected
3. Check browser console for errors
4. Verify Supabase connection
5. Contact development team

### Common Questions

**Q: Can I upload multiple files at once?**
A: Not yet - upload one file at a time

**Q: What's the maximum file size?**
A: Recommended < 10 MB (soft limit)

**Q: Can I undo an import?**
A: Use bulk delete in Coding view by status filter

**Q: Do I need headers in my CSV?**
A: No - headers will cause first row to be treated as data

---

## 🎉 Success!

Your File Data Coding feature is ready to use! 

**Next Steps:**
1. Navigate to `/file-data-coding`
2. Select a category
3. Upload your first file
4. Start coding!

---

*Last updated: 2025-10-07*

