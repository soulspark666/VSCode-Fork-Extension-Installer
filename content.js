function modifyInstallLinks() {
    // Correct selector based on the provided HTML structure from the marketplace
    const installContainers = document.querySelectorAll('.ux-oneclick-install-button-container');

    if (installContainers.length === 0) {
        // console.log('No install containers found yet.'); // Optional logging for debugging
        return false; // Containers not found yet
    }

    // Use chrome.storage.sync.get to get the preferred fork
    chrome.storage.sync.get({ fork: 'codium' }, function(data) {
        const targetFork = data.fork;
        // Define the list of valid forks
        const validForks = ['codium', 'code-oss', 'theia', 'trae', 'windsurf', 'cursor', 'positron', 'marscode'];

        if (!validForks.includes(targetFork)) {
            // console.log(`Invalid fork: ${targetFork}`); // Optional logging
            return; // Exit if fork is invalid
        }

        // Generate the display name for the fork (e.g., Codium)
        const forkDisplayName = targetFork.charAt(0).toUpperCase() + targetFork.slice(1);
        // Define the expected text for the button
        const expectedText = `Install on ${forkDisplayName}`;
        // Define the expected href prefix based on the target fork
        const expectedHrefPrefix = `${targetFork}:extension/`;
        // Define the original href prefix used by VS Code
        const originalHrefPrefix = 'vscode:extension/';

        // console.log(`Target fork: ${targetFork}, Expected text: "${expectedText}"`); // Optional logging

        installContainers.forEach(container => {
            // Find the anchor tag within the container that has an href containing ":extension/"
            const link = container.querySelector('a[href*=":extension/"]');
            if (!link) {
                // console.log('No link found in container.'); // Optional logging
                return; // Skip if no link found
            }

            const currentHref = link.getAttribute('href') || '';
            // Find the text element (ms-Button-label) or use the link itself as a fallback
            const textElement = link.querySelector('.ms-Button-label') || link;
            const currentText = textElement.textContent || '';

            // console.log(`Found link: ${currentHref}, Current text: "${currentText}"`); // Optional logging

            // Check if modification is needed for the href
            const needsHrefUpdate = currentHref.startsWith(originalHrefPrefix);
            // Check if the text is not already the expected text
            const needsTextUpdate = currentText.trim() !== expectedText; // Use trim() to handle potential whitespace

            if (needsHrefUpdate || needsTextUpdate) {
                // console.log(`Modification needed for link: ${currentHref}`); // Optional logging
                if (needsHrefUpdate) {
                    // Replace the original href prefix with the expected one
                    const newHref = currentHref.replace(originalHrefPrefix, expectedHrefPrefix);
                    link.setAttribute('href', newHref);
                    // Add a custom data attribute to mark this link as modified by our script
                    link.setAttribute('data-modified-by-script', 'true');
                    // console.log(`Href updated to: ${newHref}`); // Optional logging
                }
                // Always set the text to the expected text if it's not already correct
                if (needsTextUpdate) {
                     textElement.textContent = expectedText;
                     // console.log(`Text updated to: "${expectedText}"`); // Optional logging
                }
            } else {
                 // console.log('No modification needed.'); // Optional logging
            }

            // Apply styles consistently - keep this part as it was to make the button visually distinct
            link.style.border = '2px solid #4CAF50';
            link.style.padding = '2px 5px';
            // console.log('Styles applied.'); // Optional logging
        });
    });
    // console.log('modifyInstallLinks finished.'); // Optional logging
    return true; // Indicate links were processed
}

// MutationObserver to detect changes in the DOM
const observer = new MutationObserver((mutationsList, observer) => {
    let relevantMutation = false;
    // Define selectors for the target container, link, and text element
    const targetContainerSelector = '.ux-oneclick-install-button-container';
    const targetLinkSelector = `${targetContainerSelector} a[href*=":extension/"]`;
    const targetTextSelector = `${targetLinkSelector} .ms-Button-label`; // Target the label within the link

    for (const mutation of mutationsList) {
        // Check for added nodes that match the container or contain the container
        if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches(targetContainerSelector) || node.querySelector(targetContainerSelector)) {
                        // console.log('Relevant mutation: Added container or element containing container.'); // Optional logging
                        relevantMutation = true;
                        break;
                    }
                    // Also check if added nodes are the link or text elements within a container
                     if (node.matches(targetLinkSelector) || node.matches(targetTextSelector) || node.closest(targetContainerSelector)) {
                         // console.log('Relevant mutation: Added link, text element, or element within container.'); // Optional logging
                         relevantMutation = true;
                         break;
                     }
                }
            }
            if (relevantMutation) break;
        }

        // Check for attribute changes on the link or container
        if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
             if (mutation.target.matches(targetLinkSelector) || mutation.target.matches(targetContainerSelector)) {
                 // Check if href, style, or class changed on the target link or container
                 if (mutation.attributeName === 'href' || mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                     // console.log(`Relevant mutation: Attribute change (${mutation.attributeName}) on target link or container.`); // Optional logging
                     relevantMutation = true;
                     break;
                 }
                 // Check if our data attribute was removed from the link (indicating potential external modification)
                 if (mutation.target.matches(targetLinkSelector) && mutation.attributeName === 'data-modified-by-script' && !mutation.target.hasAttribute('data-modified-by-script')) {
                      // console.log('Relevant mutation: Data attribute removed from target link.'); // Optional logging
                      relevantMutation = true;
                      break;
                 }
             }
        }

        // Check for character data changes within the text element
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
            // Check if the parent element of the text node matches the target text selector
            if (mutation.target.parentElement && mutation.target.parentElement.matches(targetTextSelector)) {
                 // console.log('Relevant mutation: Character data change in target text element.'); // Optional logging
                 relevantMutation = true;
                 break;
            }
        }
    }

    // If a relevant mutation was detected, re-run the modification function
    if (relevantMutation) {
        // console.log('Relevant mutation detected, running modifyInstallLinks.'); // Optional logging
        modifyInstallLinks();
    }
});

// Observe the entire document body for changes with a comprehensive configuration
observer.observe(document.body, {
    childList: true, // Observe direct children being added or removed
    subtree: true,   // Observe all descendants of the target (document.body)
    attributes: true, // Observe attribute changes
    attributeFilter: ['href', 'style', 'class', 'data-modified-by-script'], // Only observe these specific attributes for efficiency
    characterData: true // Observe changes to text content within elements
});

// Run the modification function once the initial HTML document has been completely loaded and parsed
document.addEventListener('DOMContentLoaded', () => {
    // console.log('DOMContentLoaded event fired, running modifyInstallLinks.'); // Optional logging
    modifyInstallLinks();
});

// Also run the modification function immediately when the script is executed.
// This handles cases where the target elements might already be present in the DOM
// before the DOMContentLoaded event fires or before the observer is attached.
// console.log('Initial script execution, running modifyInstallLinks.'); // Optional logging
modifyInstallLinks();

// Removed setInterval as the MutationObserver is a more efficient and reliable way
// to detect and respond to dynamic changes in the DOM.