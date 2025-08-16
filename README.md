# 🔍 AllTab Summary

**AllTab Summary** is a Chrome extension that opens a side panel and summarizes all open tabs by extracting their titles and meta descriptions. It also allows you to selectively save important tabs as "tasks" for later reference.

---

## 🚀 Features

- ✅ Side panel UI (Chrome Panel API)
- 🔍 Automatically summarizes all open tabs
- 📝 Extracts title and meta description
- 💾 Save and manage tab summaries as tasks
- ❌ Remove tasks individually or all at once
- 📦 Uses `chrome.storage.local` to persist tasks
- ⚡ Clean and responsive UI

---

## 📷 Preview

> *Coming soon...*

---

## 📁 Folder Structure

All-Tab-Summary/
├── background.js
├── contentScript.js
├── manifest.json
├── sidebar.html
├── sidebar.js
├── sidebar.css
└── icons/
├── icon16.png
├── icon48.png
└── icon128.png

---

## ⚙️ Permissions Used

| Permission           | Why it's needed                          |
|----------------------|------------------------------------------|
| `tabs`               | To fetch all open tabs and their data    |
| `scripting`          | To inject content script on each tab     |
| `activeTab`          | To get the current tab if needed         |
| `storage`            | To store and retrieve saved tasks        |
| `sidePanel`          | To open and use the Chrome side panel    |
| `<all_urls>`         | To allow access to all web pages         |

---

## 💡 How It Works

- When the extension icon is clicked, it opens the **side panel**.
- It queries all tabs and injects a `contentScript.js` file into each (excluding restricted URLs).
- The script extracts the **title** and **meta description** of each tab and sends it to `sidebar.js`.
- You can **add/remove** any summary as a **task**.
- All tasks are stored locally and persist even if the panel is closed.

---

## ⚠️ Limitations

- Chrome does **not allow injection** into `chrome://` pages or extension URLs.
- Ensure sites have loaded when injecting scripts or data may be incomplete.

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT License © 2025 [Gurseerat Kaur](https://github.com/gurseerat)

