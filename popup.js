document.addEventListener('DOMContentLoaded', function() {
    const forkSelect = document.getElementById('forkSelect');
    const saveButton = document.getElementById('saveButton');
    const status = document.getElementById('status');
    
    chrome.storage.sync.get({ fork: 'codium' }, function(data) {
        forkSelect.value = data.fork;
    });
    
    saveButton.addEventListener('click', function() {
        const selectedFork = forkSelect.value;
        chrome.storage.sync.set({ fork: selectedFork }, function() {
            status.textContent = `Saved: Extensions will install on ${selectedFork}.`;
            setTimeout(() => status.textContent = '', 3000);
        });
    });
});