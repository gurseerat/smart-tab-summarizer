const port = chrome.runtime.connect({ name: 'sidebar' });

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0) return;
    const tabId = tabs[0].id;

    chrome.tabs.sendMessage(tabId, { type: 'GET_TAB_INFO' }, response => {
        if (chrome.runtime.lastError) {
            console.warn('Message failed:', chrome.runtime.lastError.message);
            return;
        }
        if (response && response.payload) {
            const { title, meta, url } = response.payload;
            const summary = meta || title;
            const uniqueId = btoa(url).slice(0, 10);
            renderSummary(title, summary, url, uniqueId);
        }
    });
});

chrome.storage.local.get('currentTabInfo', res => {
    console.log('[Sidebar] currentTabInfo:', res.currentTabInfo);
});

window.addEventListener('DOMContentLoaded', () => {
    const summariesEl = document.getElementById('summaries');
    const clearBtn = document.getElementById('clear-tasks');

// Fetch open tabs and inject contentScript
// async function fetchTabInfo() {
//     const tabs = await chrome.tabs.query({});
//     for (let tab of tabs) {
//         if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
//             chrome.scripting.executeScript({
//                 target: { tabId: tab.id },
//                 files: ['contentScript.js']
//             }).catch(err => console.warn('Script injection failed for', tab.url, err));
//         }
//     }
// }

    chrome.runtime.sendMessage({ type: 'REQUEST_TAB_INFO' });

// Receive messages from contentScript
    chrome.runtime.onMessage.addListener((msg, sender) => {
        if (msg.type === 'TAB_INFO') {
            const tabId = sender.tab?.id;
            const { title, meta, url } = msg.payload;
            const summary = meta || title;
            renderSummary(title, summary, url, tabId);
        }
    });

// Render a summary block with an "Add to Task" button
    function renderSummary(title, summary, url, tabId) {
        const uniqueKey = `${title}-${url}`; // used for matching saved tasks
        const container = document.createElement('div');
        container.classList.add('summary');
        container.dataset.key = uniqueKey;
        container.innerHTML = `
        <div class="inline-flex">
            <div class="summary-details">
                <h3>${title}</h3>
                <div class="inline-flex">
                    <p>${summary}</p>
                    <i class="fa-solid fa-angle-right"></i>
                </div>
            </div>
            <button class="add-btn" title="Add this tab to tasks">
                <i class="fa-solid fa-circle-plus"></i>
            </button>
            <button class="remove-btn" title="Remove this tab from tasks" style="display: none;">
              <i class="fa-solid fa-circle-minus"></i>
            </button>
            <button class="link-btn" title="Open this tab">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </button>
        </div>
    `;
        const addBtn = container.querySelector('.add-btn');
        const removeBtn = container.querySelector('.remove-btn');
        const linkBtn = container.querySelector('.link-btn');

        addBtn.addEventListener('click', () => {
            const task = {
                taskId: `task-${Date.now()}`,
                title,
                summary,
                url,
                tabId,
                key: uniqueKey
            };
            addTask(task);
            toggleButtons(container);
        });

        removeBtn.addEventListener('click', () => {
            removeTask(uniqueKey);
            toggleButtons(container);
        });

        linkBtn.addEventListener('click', () => {
            chrome.tabs.create({ url });
        });

        summariesEl.appendChild(container);
    }

    function toggleButtons(container) {
        const addBtn = container.querySelector('.add-btn');
        const removeBtn = container.querySelector('.remove-btn');

        const isSelected = container.classList.contains('selected');
        addBtn.style.display = isSelected ? 'none' : 'inline-block';
        removeBtn.style.display = isSelected ? 'inline-block' : 'none';
    }

// Add selected task
    function addTask(task) {
        markSelected(task.key);
        saveTask(task);
    }

// Add .selected class to summary
    function markSelected(key) {
        const item = [...document.querySelectorAll('.summary')]
            .find(el => el.dataset.key === key);
        if (item) {
            item.classList.add('selected');
        }
    }

// Save to chrome.storage
    function saveTask(task) {
        chrome.storage.local.get('tasks', (res) => {
            const tasks = res.tasks || [];
            const exists = tasks.some(t => t.key === task.key);
            if (!exists) {
                tasks.push(task);
                chrome.storage.local.set({ tasks });
            }
        });
    }

    function removeTask(taskKey) {
        // 1. Remove "selected" class
        const item = document.querySelector(`[data-key="${taskKey}"]`);
        if (item) item.classList.remove('selected');

        // 2. Remove task from storage
        chrome.storage.local.get('tasks', (res) => {
            let tasks = res.tasks || [];
            tasks = tasks.filter(t => t.key !== taskKey);
            chrome.storage.local.set({ tasks });
        });
    }

// Load and mark previously selected tasks
    function loadTasks() {
        chrome.storage.local.get('tasks', (res) => {
            const tasks = res.tasks || [];
            tasks.forEach(task => {
                markSelected(task.key);
                const el = document.querySelector(`[data-key="${task.key}"]`);
                toggleButtons(el);
            });
        });
    }

// Clear tasks
    clearBtn.addEventListener('click', () => {
        chrome.storage.local.remove('tasks');
        document.querySelectorAll('.summary.selected').forEach(el => {
            el.classList.remove('selected');
            toggleButtons(el);
        });
    });

// Initialize
// fetchTabInfo();
    loadTasks();

});