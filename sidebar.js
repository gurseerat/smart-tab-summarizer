window.addEventListener('DOMContentLoaded', () => {
    const summariesEl = document.getElementById('summaries');
    const clearBtn = document.getElementById('clear-tasks');

    /**
     * Render notes for a specific task
     * @param task
     * @param id
     * @param listContainer
     */
    function renderNotesForTask(task, id, listContainer) {
        // Ensure notes is an array of objects: { text, checked }
        let notes = Array.isArray(task?.notes) ? task?.notes : [];

        // Create or select the notes list container
        let notesList = listContainer.querySelector('.notes-list');
        if (!notesList) {
            notesList = document.createElement('ul');
            notesList.className = 'notes-list';
            notesList.style.paddingLeft = '16px';
            listContainer.appendChild(notesList);
        }
        notesList.innerHTML = '';
        // Render each note as a list item
        notes.forEach((note, idx) => {
            createNoteItem(note, idx, id, listContainer);
        });
    }

    /**
     * Creates a note item with checkbox and input field
     * @param note
     * @param idx
     * @param id
     * @param listContainer
     */
    function createNoteItem(note, idx, id, listContainer) {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';

        // Checkbox for marking note as checked/unchecked
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = note.checked || false;
        checkbox.style.marginRight = '8px';

        // Text input for the note
        const input = document.createElement('input');
        input.type = 'text';
        input.value = note.text;
        input.placeholder = '+ Add item'
        if (note.checked) input.classList.add('strikethrough');

        // Only show checkbox for non-empty notes
        if (note.text && note.text.trim() !== '') {
            // Toggle strikethrough on checkbox change
            checkbox.addEventListener('change', () => {
                chrome.storage.local.get('tasks', res => {
                    const tasks = res.tasks || [];
                    const tabIdx = tasks.findIndex(t => t.id === id);
                    if (tabIdx === -1) return;
                    const notes = tasks[tabIdx].notes || [];
                    notes[idx] = typeof notes[idx] === 'string'
                        ? { text: notes[idx], checked: false }
                        : notes[idx];
                    notes[idx].checked = checkbox.checked;
                    tasks[tabIdx].notes = notes;
                    chrome.storage.local.set({ tasks }, () => {
                        if (checkbox.checked) {
                            input.classList.add('strikethrough');
                        } else {
                            input.classList.remove('strikethrough');
                        }
                    });
                });
            });
            li.appendChild(checkbox);
        } else {
            // Hide checkbox for empty input
            checkbox.style.display = 'none';
        }

        const notesList = listContainer.querySelector('.notes-list');
        let tasks = [];
        let tabIdx;

        // Save note text on input change
        input.addEventListener('input', () => {
            chrome.storage.local.get('tasks', res => {
                tasks = res.tasks || [];
                tabIdx = tasks.findIndex(t => t.id === id);
                if (tabIdx === -1) return;
                let notes = Array.isArray(tasks[tabIdx].notes) ? tasks[tabIdx].notes : [];
                notes = notes
                    .map(note => typeof note === 'string' ? { text: note, checked: false } : note)
                    .filter(note => note.text && note.text.trim() !== '');
                // If editing the last (empty) input and it's not empty, add it to notes
                if (idx === notes.length && input.value.trim() !== '') {
                    notes.push({ text: input.value, checked: false });
                } else if (idx < notes.length) {
                    notes[idx] = { ...notes[idx], text: input.value };
                }
                tasks[tabIdx].notes = notes;
            });
        });

        // Handle Enter and Backspace key events
        input.addEventListener('keydown', e => {
            // On Enter: add a new empty note and focus it
            if (e.key === 'Enter' && input.value.trim() !== '') {
                chrome.storage.local.set({ tasks }, () => {
                    renderNotesForTask(tasks[tabIdx], id, listContainer);
                });
                chrome.storage.local.get('tasks', res => {
                    const tasks = res.tasks || [];
                    const tabIdx = tasks.findIndex(t => t.id === id);
                    if (tabIdx === -1) return;
                    let notes = Array.isArray(tasks[tabIdx].notes) ? tasks[tabIdx].notes : [];
                    notes = notes
                        .map(note => typeof note === 'string' ? { text: note, checked: false } : note)
                        .filter(note => note.text && note.text.trim() !== '');
                    notes.push({ text: '', checked: false }); // Always add empty note
                    tasks[tabIdx].notes = notes;
                    chrome.storage.local.set({ tasks }, () => {
                        renderNotesForTask(tasks[tabIdx], id, listContainer);
                        setTimeout(() => {
                            const notesList = listContainer.querySelector('.notes-list');
                            const lastInput = notesList?.lastChild?.querySelector('input[type="text"]');
                            if (lastInput) lastInput.focus();
                        }, 0);
                    });
                });
            }

            // On Backspace: if input is empty and more than one li, delete this note and focus previous/next
            if (
                e.key === 'Backspace' &&
                input.value === '' &&
                notesList.children.length > 1
            ) {
                e.preventDefault();
                chrome.storage.local.get('tasks', res => {
                    const tasks = res.tasks || [];
                    const tabIdx = tasks.findIndex(t => t.id === id);
                    if (tabIdx === -1) return;
                    let notes = Array.isArray(tasks[tabIdx].notes) ? tasks[tabIdx].notes : [];
                    notes = notes
                        .map(note => typeof note === 'string' ? { text: note, checked: false } : note)
                        .filter(note => note.text && note.text.trim() !== '');
                    notes.splice(idx, 1);
                    tasks[tabIdx].notes = notes;
                    chrome.storage.local.set({ tasks }, () => {
                        renderNotesForTask(tasks[tabIdx], id, listContainer);
                        setTimeout(() => {
                            const notesList = listContainer.querySelector('.notes-list');
                            let focusIdx = idx - 1 >= 0 ? idx - 1 : 0;
                            const nextInput = notesList?.children[focusIdx]?.querySelector('input[type="text"]');
                            if (nextInput) nextInput.focus();
                        }, 0);
                    });
                });
            }
        });

        li.appendChild(input);
        notesList.appendChild(li);
    }

    /**
     * Renders a summary card for a tab/task
     * @param title
     * @param summary
     * @param url
     * @param index
     * @param id
     * @param isClosed
     * @param tabId
     */
    function renderSummary(title, summary, url, index, id, isClosed, tabId) {
        const summaryContainer = document.createElement('div');
        summaryContainer.classList.add('summary-container');
        const container = document.createElement('div');
        container.setAttribute('data-tabId', tabId);
        container.classList.add('summary');
        if (isClosed) container.classList.add('closed');
        container.id = id;

        // Shorten summary if too long
        const maxLength = 70;
        let isTrimmed = summary.length > maxLength;
        const shortSummary = isTrimmed ? summary.slice(0, maxLength) + '...' : summary;

        // Card HTML
        container.innerHTML = `
        <div class="badge">${index !== undefined ? index + 1 : 'Closed'}</div>
        <div class="inline-flex">
            <div class="summary-details">
              <h4>${title}</h4>
              <p class="summary-text">${shortSummary}</p>
              ${isTrimmed ? `<button class="read-more-btn">Read more</button>` : ''}
            </div>
            <button class="add-btn" title="Add Task">
                <i class="fa fa-plus-circle"></i>
            </button>
            <button class="bookmark-btn" title="Add Bookmark">
                <i class="fa-regular fa-bookmark"></i>
            </button>
            <button class="remove-bookmark-btn" title="Remove Bookmark" style="display: none;">
                <i class="fa-solid fa-bookmark"></i>
            </button>
            <button class="link-btn" title="Open this tab" style="display: none;">
                <i class="fa-solid fa-square-arrow-up-right"></i>
            </button>
            <button class="close-btn" title="Close Tab">
                <i class="fa-solid fa-circle-xmark"></i>
            </button>
        </div>
    `;

        // Button references
        const addBtn = container.querySelector('.add-btn');
        const bookmarkBtn = container.querySelector('.bookmark-btn');
        const removeBookmarkBtn = container.querySelector('.remove-bookmark-btn');
        const linkBtn = container.querySelector('.link-btn');
        const closeBtn = container.querySelector('.close-btn');
        const readMoreBtn = container.querySelector('.read-more-btn');
        const summaryTextEl = container.querySelector('.summary-text');

        // Bookmark button logic
        bookmarkBtn.addEventListener('click', () => {
            container.classList.add('selected');
            bookmarkBtn.style.display = 'none';
            removeBookmarkBtn.style.display = 'inline-block';
            saveBookmark({title, summary, url, id, tabId});
        });

        // Remove bookmark logic
        removeBookmarkBtn.addEventListener('click', () => {
            container.classList.remove('selected');
            bookmarkBtn.style.display = 'inline-block';
            removeBookmarkBtn.style.display = 'none';
            removeBookmark(id);
        });

        // Open tab in new window
        linkBtn.addEventListener('click', () => {
            chrome.tabs.create({url});
        });

        // Close tab logic
        closeBtn.addEventListener('click', () => {
            closeTab(id);
        });

        // Read more/less toggle
        if (readMoreBtn) {
            readMoreBtn.addEventListener('click', () => {
                if (readMoreBtn.textContent === 'Read more') {
                    summaryTextEl.textContent = summary;
                    readMoreBtn.textContent = 'Show less';
                } else {
                    summaryTextEl.textContent = shortSummary;
                    readMoreBtn.textContent = 'Read more';
                }
            });
        }

        // Notes list container for this summary
        const listContainer = document.createElement('div');
        listContainer.classList.add('task-list');
        listContainer.id = `notes_${id}`;

        // Always render notes for this summary/task
        chrome.storage.local.get('tasks', res => {
            const tasks = res.tasks || [];
            const task = tasks.find(t => t.id === id);
            renderNotesForTask(task, id, listContainer);
        });

        // Add button: add a new empty note and focus it
        addBtn.addEventListener('click', async () => {
            container.classList.add('selected');
            bookmarkBtn.style.display = 'none';
            removeBookmarkBtn.style.display = 'inline-block';
            await saveBookmark({title, summary, url, id, tabId});

            // Add a new empty note if none exist
            setTimeout(() => {
                chrome.storage.local.get('tasks', res => {
                    const tasks = res.tasks || [];
                    let tabIdx = tasks.findIndex(t => t.id === id);
                    const notes = Array.isArray(tasks[tabIdx]?.notes) ? tasks[tabIdx].notes : [];

                    if (notes.length === 0) {
                        tasks[tabIdx].notes = [];
                        notes.push({text: '', checked: false});
                    }

                    tasks[tabIdx].notes = notes;
                    chrome.storage.local.set({tasks}, () => {
                        renderNotesForTask(tasks[tabIdx], id, listContainer);
                        setTimeout(() => {
                            const notesList = listContainer.querySelector('.notes-list');
                            const lastInput = notesList?.lastChild?.querySelector('input[type="text"]');
                            if (lastInput) lastInput.focus();
                        }, 0);
                    });
                });
            }, 200)
        });

        // Add summary and notes to the DOM
        summariesEl.appendChild(summaryContainer);
        summaryContainer.appendChild(container);
        container.appendChild(listContainer);
    }

    /**
     * Saves a task (bookmark) to local storage if it doesn't already exist
     * @param task
     */
    function saveBookmark(task) {
        chrome.storage.local.get('tasks', res => {
            const tasks = res.tasks || [];
            const exists = tasks.find(t => t.id === task.id);
            if (!exists) {
                tasks.push(task);
                chrome.storage.local.set({tasks});
            }
        });
    }

    /**
     * Removes a bookmark by id from the storage
     * @param id
     */
    function removeBookmark(id) {
        chrome.storage.local.get('tasks', res => {
            const tasks = res.tasks || [];
            const updated = tasks.filter(t => t.id !== id);
            chrome.storage.local.set({tasks: updated});
        });
    }

    /**
     * Closes a tab by its id
     * @param id
     */
    function closeTab(id) {
        const el = document.getElementById(id);
        if (el) {
            const tabId = Number(el.getAttribute('data-tabId'));
            chrome.tabs.remove(tabId, function () {
                if (chrome.runtime.lastError) {
                    console.error("Error closing tab:", chrome.runtime.lastError.message);
                } else {
                    console.log("Tab closed successfully.");
                }
            });
        }
    }

    /**
     * Fetches all open tabs, retrieves their info via content script,
     */
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
                const {url, id, index} = tab;
                // Skip non-http(s) tabs
                if (!url.startsWith('http') || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('devtools://')) {
                    received++;
                    checkDone();
                    return;
                }

                // Inject content script to get tab info
                chrome.scripting.executeScript({
                    target: {tabId: id},
                    func: (index, id) => {
                        window._tabIndex = index;
                        window._tabId = id;
                    },
                    args: [index, id]
                }, () => {
                    chrome.scripting.executeScript({
                        target: {tabId: id},
                        files: ['./contentScript.js']
                    }).catch(() => {
                        received++;
                        checkDone();
                    });
                });
            });

            /**
             * Checks if all expected responses have been received and render summaries
             */
            function checkDone() {
                if (responses && received === expected) {
                    chrome.runtime.onMessage.removeListener(handler);

                    // Get tasks and split into closed/open
                    chrome.storage.local.get('tasks', res => {
                        const tasks = res.tasks || [];
                        const closedTasks = tasks.filter(task => !openUrls.includes(task.url));
                        // Render closed tasks first
                        closedTasks.forEach(task => {
                            renderSummary(task.title, task.summary, task.url, undefined, task.id, true, task.tabId);
                            const el = document.getElementById(task.id);
                            if (el) {
                                el.classList.add('selected');
                                el.querySelector('.bookmark-btn').style.display = 'none';
                                el.querySelector('.remove-bookmark-btn').style.display = 'inline-block';
                                el.querySelector('.link-btn').style.display = 'inline-block';
                                el.setAttribute('data-tabId', task.tabId);
                            }
                        });

                        // Now render open tab tasks (sorted by tab order)
                        responses.sort((a, b) => a.index - b.index);
                        responses.forEach(task => {
                            const id = createId(task.title, task.url);
                            renderSummary(task.title, task.meta, task.url, task.index, id, false, task.tabId);
                            // Mark as selected if it's a saved task
                            const saved = tasks.find(t => t.id === id);
                            if (saved) {
                                const el = document.getElementById(id);
                                if (el) {
                                    el.classList.add('selected');
                                    el.querySelector('.bookmark-btn').style.display = 'none';
                                    el.querySelector('.remove-bookmark-btn').style.display = 'inline-block';
                                }
                            }
                        });
                    });

                    // Highlight the current tab's summary card
                    setTimeout(() => {
                        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
                            if (tabs.length > 0) {
                                const currentTab = tabs[0];
                                const currentId = createId(currentTab.title, currentTab.url);
                                const currentCard = document.getElementById(currentId);
                                if (currentCard) {
                                    currentCard.classList.add('current');
                                }
                            }
                        });
                    }, 200)
                }
            }
        });
    }

    // Initial render of all tabs and summaries
    fetchTabsAndRender();

    // Clear all tasks/bookmarks
    clearBtn.addEventListener('click', () => {
        chrome.storage.local.remove('tasks', () => {
            document.querySelectorAll('.summary').forEach(el => {
                el.classList.remove('selected');
                el.querySelector('.bookmark-btn').style.display = 'inline-block';
                el.querySelector('.remove-bookmark-btn').style.display = 'none';
            });
        });
    });
});

/**
 * Refreshes the sidebar to refresh the list of tabs and tasks
 */
function refreshTabs() {
    location.reload();
}

/**
 * Creates a unique ID for a task based on its title and URL
 * @param title
 * @param url
 * @returns {string}
 */
function createId(title, url) {
    return `title-${title}_url-${url}`;
}

// Listen for tab open/close and refresh sidebar
chrome.tabs.onCreated.addListener(refreshTabs);
chrome.tabs.onRemoved.addListener(refreshTabs);
// Listen for tab updates (e.g. URL or title changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        refreshTabs();
    }
});