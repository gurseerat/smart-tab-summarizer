chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.remove('tabInfoList');
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'TAB_INFO') {
        chrome.storage.local.get('tabInfoList', res => {
            const list = res.tabInfoList || [];

            // Check for duplicate by URL
            const exists = list.find(tab => tab.url === msg.payload.url);
            if (!exists) {
                list.push(msg.payload);
                chrome.storage.local.set({ tabInfoList: list });
            }
        });
    }
});