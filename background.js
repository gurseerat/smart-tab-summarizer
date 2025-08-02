// chrome.runtime.onInstalled.addListener(() => {
//     console.log('Smart Tab Summarizer installed');
// });

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'sidebar') {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const tab = tabs[0];
            if (!tab || !tab.id || tab.url.startsWith('chrome://')) return;

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['contentScript.js']
            }).catch(err => console.warn('Script injection failed:', err));
        });
    }
});