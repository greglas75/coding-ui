# 🧠 Prompt History Rule (Full Auto-Save + Versioning)

Whenever a chat or prompt session ends, automatically save it as a Markdown file inside `/prompt-history/`.

---

## 📦 File Structure
Each saved file must include:
- The project name (from the current workspace folder name)
- The model used
- The date and time (YYYY-MM-DD_HH-MM)
- An incremental session number (e.g., `_session_01`)

**Example filename:**
coding-ui_2025-10-08_10-15_GPT-5_session_01.md

---

## 📝 File Content Format
Each file must include:

# 💬 Prompt History — {projectName}

**Model:** {modelName}  
**Session:** {sessionNumber}  
**Timestamp:** {YYYY-MM-DD HH:MM}

---

## 🧑 User
{all user prompts concatenated}

---

## 🤖 Assistant
{all AI responses concatenated}

---

*Auto-saved from Background Agent.*

---

## ⚙️ Behavior
- Save to: `/workspace/prompt-history/`
- Skip empty sessions
- Increment session number per day
- Ensure filename uniqueness
- Append all conversations from a single chat until it's closed
- Log all activity in `/workspace/prompt-history/agent-log.txt`
- If agent inactive, show a warning but don’t stop execution

---

## 🧩 Example Output
**File:**
coding-ui_2025-10-08_10-45_GPT-5_session_03.md

**Contents:**
# 💬 Prompt History — coding-ui
**Model:** GPT-5  
**Session:** 03  
**Timestamp:** 2025-10-08 10:45

---

## 🧑 User
test save — checking auto-save system  

---

## 🤖 Assistant
✅ Auto-save and versioning working correctly.

---

*Auto-saved from Background Agent.*