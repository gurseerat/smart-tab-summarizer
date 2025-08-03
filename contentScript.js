// Extract page title and selected text or meta description
((index) => {
    const isBlocked = location.protocol === 'chrome:' || location.protocol === 'chrome-extension:';
    if (isBlocked) return; // Skip chrome:// and chrome-extension:// URLs

    const title = document.title;
    const meta =
        document.querySelector('meta[name="description"]')?.content ||
        window.getSelection().toString() ||
        document.body.innerText.slice(0, 200);

    console.log('Sending tab info:', { title, meta, url: location.href , index: window._tabIndex});

    chrome.runtime.sendMessage({
        type: 'TAB_INFO',
        payload: { title, meta, url: location.href, index: window._tabIndex }
    });
})(typeof arguments !== 'undefined' ? arguments[0] : null);