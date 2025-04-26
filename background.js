chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({
        fork: 'codium'
    }, function() {
        console.log('Default fork set to codium.');
    });
});