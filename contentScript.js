// Extract page title and selected text or meta description
(() => {
    const isBlocked = location.protocol === 'chrome:' || location.protocol === 'chrome-extension:';
    if (isBlocked) return; // Skip chrome:// and chrome-extension:// URLs

    const title = document.title;
    const meta = document.querySelector('meta[name="description"]')?.content || '';
    chrome.runtime.sendMessage({
        type: 'TAB_INFO',
        payload: { title, meta, url: location.href }
    });
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_TAB_INFO') {
        const title = document.title || '';
        const meta = document.querySelector('meta[name="description"]')?.content || '';
        const url = location.href;

        sendResponse({
            payload: { title, meta, url }
        });
    }
});