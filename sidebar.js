window.addEventListener('DOMContentLoaded', () => {
    const summariesEl = document.getElementById('summaries');
    const clearBtn = document.getElementById('clear-tasks');

    function renderSummary(title, summary, url, index, id, isClosed) {
        const container = document.createElement('div');
        container.classList.add('summary');
        if (isClosed) container.classList.add('closed');
        container.id = id;
        container.innerHTML = `
        <div class="badge">${index !== undefined ? index + 1 : 'Closed'}</div>
        <div class="inline-flex">
            <div class="summary-details">
              <h4>${title}</h4>
              <p>${summary}</p>
            </div>
            <button class="add-btn" title="Add Task">
                <i class="fa fa-plus-circle"></i>
            </button>
            <button class="remove-btn" title="Remove Task" style="display: none;">
                <i class="fa fa-minus-circle"></i>
            </button>
            <button class="link-btn" title="Open this tab" style="display: none;">
                <i class="fa-solid fa-square-arrow-up-right"></i>
            </button>
        </div>
    `;

        const addBtn = container.querySelector('.add-btn');
        const removeBtn = container.querySelector('.remove-btn');
        const linkBtn = container.querySelector('.link-btn');

        addBtn.addEventListener('click', () => {
            container.classList.add('selected');
            addBtn.style.display = 'none';
            removeBtn.style.display = 'inline-block';
            saveTask({ title, summary, url, id });
        });

        removeBtn.addEventListener('click', () => {
            container.classList.remove('selected');
            addBtn.style.display = 'inline-block';
            removeBtn.style.display = 'none';
            removeTask(id);
        });

        linkBtn.addEventListener('click', () => {
            chrome.tabs.create({ url });
        });

        summariesEl.appendChild(container);
    }

    function saveTask(task) {
        chrome.storage.local.get('tasks', res => {
            const tasks = res.tasks || [];
            const exists = tasks.find(t => t.id === task.id);
            if (!exists) {
                tasks.push(task);
                chrome.storage.local.set({ tasks });
            }
        });
    }

    function removeTask(id) {
        chrome.storage.local.get('tasks', res => {
            const tasks = res.tasks || [];
            const updated = tasks.filter(t => t.id !== id);
            chrome.storage.local.set({ tasks: updated });
        });
    }

    function loadTasks(openUrls, openTabIds) {
        chrome.storage.local.get('tasks', res => {
            const tasks = res.tasks || [];
            const closedTasks = tasks.filter(task => !openUrls.includes(task.url));
            const openTasks = tasks.filter(task => openUrls.includes(task.url));

            // Render closed tasks at the top
            closedTasks.forEach(task => {
                renderSummary(task.title, task.summary, task.url, undefined, task.id, true);
                // Mark as selected
                const el = document.getElementById(task.id);
                if (el) {
                    el.classList.add('selected');
                    el.querySelector('.add-btn').style.display = 'none';
                    el.querySelector('.remove-btn').style.display = 'inline-block';
                    el.querySelector('.link-btn').style.display = 'inline-block';
                }
            });
        });
    }

    function fetchTabsAndRender() {
        summariesEl.innerHTML = '';
        chrome.tabs.query({}, tabs => {
            let responses = [];
            let expected = tabs.length;
            let received = 0;
            const tabIds = tabs.map(tab => tab.id);
            const openUrls = tabs.map(tab => tab.url);

            function handler(msg, sender) {
                if (msg.type === 'TAB_INFO' && tabIds.includes(sender.tab.id)) {
                    responses.push(msg.payload);
                    received++;
                    checkDone();
                }
            }
            chrome.runtime.onMessage.addListener(handler);

            tabs.forEach(tab => {
                const { url, id, index } = tab;
                if (!url.startsWith('http') || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('devtools://')) {
                    received++;
                    checkDone();
                    return;
                }

                chrome.scripting.executeScript({
                    target: { tabId: id },
                    func: index => window._tabIndex = index,
                    args: [index]
                }, () => {
                    chrome.scripting.executeScript({
                        target: { tabId: id },
                        files: ['./contentScript.js']
                    }).catch(() => {
                        received++;
                        checkDone();
                    });
                });
            });

            function checkDone() {
                if (responses && received === expected) {
                    chrome.runtime.onMessage.removeListener(handler);

                    // Get tasks and split into closed/open
                    chrome.storage.local.get('tasks', res => {
                        const tasks = res.tasks || [];
                        const closedTasks = tasks.filter(task => !openUrls.includes(task.url));
                        // Render closed tasks first
                        closedTasks.forEach(task => {
                            renderSummary(task.title, task.summary, task.url, undefined, task.id, true);
                            const el = document.getElementById(task.id);
                            if (el) {
                                el.classList.add('selected');
                                el.querySelector('.add-btn').style.display = 'none';
                                el.querySelector('.remove-btn').style.display = 'inline-block';
                                el.querySelector('.link-btn').style.display = 'inline-block';
                            }
                        });

                        // Now render open tab tasks (sorted by tab order)
                        responses.sort((a, b) => a.index - b.index);
                        responses.forEach(task => {
                            const id = `${task.title}_${task.url}`;
                            renderSummary(task.title, task.meta, task.url, task.index, id, false);
                            // Mark as selected if it's a saved task
                            const saved = tasks.find(t => t.id === id);
                            if (saved) {
                                const el = document.getElementById(id);
                                if (el) {
                                    el.classList.add('selected');
                                    el.querySelector('.add-btn').style.display = 'none';
                                    el.querySelector('.remove-btn').style.display = 'inline-block';
                                }
                            }
                        });
                    });
                }
            }
        });
    }
    fetchTabsAndRender();

    clearBtn.addEventListener('click', () => {
        chrome.storage.local.remove('tasks', () => {
            document.querySelectorAll('.summary').forEach(el => {
                el.classList.remove('selected');
                el.querySelector('.add-btn').style.display = 'inline-block';
                el.querySelector('.remove-btn').style.display = 'none';
            });
        });
    });
});

// Helper to refresh tab list
function refreshTabs() {
    location.reload();
}

// Listen for tab open/close
chrome.tabs.onCreated.addListener(refreshTabs);
chrome.tabs.onRemoved.addListener(refreshTabs);
// Listen for tab updates (e.g. URL or title changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        refreshTabs();
    }
});