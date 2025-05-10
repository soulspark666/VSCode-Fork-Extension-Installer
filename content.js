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

                    // NEW: Use Object.defineProperty to prevent React from changing the href
                    try {
                        // Save the original setAttribute method
                        if (!link._originalSetAttribute) {
                            link._originalSetAttribute = link.setAttribute;

                            // Override setAttribute to intercept any attempts to change href back to vscode:
                            link.setAttribute = function(name, value) {
                                if (name === 'href' && value && value.startsWith(originalHrefPrefix)) {
                                    // Intercept and modify the value before setting it
                                    const modifiedValue = value.replace(originalHrefPrefix, expectedHrefPrefix);
                                    return this._originalSetAttribute.call(this, name, modifiedValue);
                                }
                                // For all other attributes, use the original method
                                return this._originalSetAttribute.call(this, name, value);
                            };
                        }

                        // Also try to define a property to intercept direct property access
                        const hrefDescriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href');
                        if (hrefDescriptor && hrefDescriptor.configurable) {
                            Object.defineProperty(link, 'href', {
                                get: function() {
                                    return this.getAttribute('href');
                                },
                                set: function(value) {
                                    if (value && value.startsWith(originalHrefPrefix)) {
                                        this.setAttribute('href', value.replace(originalHrefPrefix, expectedHrefPrefix));
                                    } else {
                                        this.setAttribute('href', value);
                                    }
                                },
                                configurable: true
                            });
                        }
                    } catch (e) {
                        // If property definition fails, fall back to our regular approach
                        console.error('Error setting up href protection:', e);
                    }
                }

                // Always set the text to the expected text if it's not already correct
                if (needsTextUpdate) {
                    textElement.textContent = expectedText;
                    // console.log(`Text updated to: "${expectedText}"`); // Optional logging

                    // NEW: Try to protect the text content from being changed back
                    try {
                        if (!textElement._originalTextContent && Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').configurable) {
                            // Save the original textContent property
                            const originalDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');

                            // Define a custom property for this specific element
                            Object.defineProperty(textElement, 'textContent', {
                                get: function() {
                                    return expectedText;
                                },
                                set: function(value) {
                                    // If React tries to set it back to something else, force our text
                                    if (value !== expectedText) {
                                        originalDescriptor.set.call(this, expectedText);
                                    } else {
                                        originalDescriptor.set.call(this, value);
                                    }
                                },
                                configurable: true
                            });
                        }
                    } catch (e) {
                        // If property definition fails, fall back to our regular approach
                        console.error('Error setting up textContent protection:', e);
                    }
                }
            } else {
                // console.log('No modification needed.'); // Optional logging
            }

            // Apply styles consistently - keep this part as it was to make the button visually distinct
            link.style.border = '2px solid #4CAF50';
            link.style.padding = '2px 5px';
            // console.log('Styles applied.'); // Optional logging

            // NEW: Try to protect the style from being changed back
            try {
                if (!link._styleObserver) {
                    link._styleObserver = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            if (mutation.attributeName === 'style') {
                                // Re-apply our styles if they were changed
                                link.style.border = '2px solid #4CAF50';
                                link.style.padding = '2px 5px';
                            }
                        }
                    });

                    link._styleObserver.observe(link, {
                        attributes: true,
                        attributeFilter: ['style']
                    });
                }
            } catch (e) {
                console.error('Error setting up style protection:', e);
            }

            // Add a MutationObserver specifically for this link to ensure our changes persist
            // even if React re-renders the component
            setupLinkObserver(link, textElement, expectedText, expectedHrefPrefix, originalHrefPrefix);
        });
    });
    // console.log('modifyInstallLinks finished.'); // Optional logging
    return true; // Indicate links were processed
}

// Function to set up a dedicated observer for a specific link
function setupLinkObserver(link, textElement, expectedText, expectedHrefPrefix, originalHrefPrefix) {
    // Create a new MutationObserver instance specifically for this link
    const linkObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // If the href attribute was changed
            if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
                const currentHref = link.getAttribute('href') || '';
                if (currentHref.startsWith(originalHrefPrefix)) {
                    // React has reverted our change, fix it again
                    const newHref = currentHref.replace(originalHrefPrefix, expectedHrefPrefix);
                    link.setAttribute('href', newHref);
                    link.setAttribute('data-modified-by-script', 'true');
                }
            }

            // If the text content was changed (either directly or via child nodes)
            if (mutation.type === 'childList' ||
                (mutation.type === 'characterData' && mutation.target === textElement.firstChild)) {
                const currentText = textElement.textContent || '';
                if (currentText.trim() !== expectedText) {
                    // React has reverted our text change, fix it again
                    textElement.textContent = expectedText;
                }
            }

            // If our custom data attribute was removed
            if (mutation.type === 'attributes' &&
                mutation.attributeName === 'data-modified-by-script' &&
                !link.hasAttribute('data-modified-by-script')) {
                // Re-add our marker
                link.setAttribute('data-modified-by-script', 'true');

                // Also check if other attributes need to be fixed
                const currentHref = link.getAttribute('href') || '';
                if (currentHref.startsWith(originalHrefPrefix)) {
                    const newHref = currentHref.replace(originalHrefPrefix, expectedHrefPrefix);
                    link.setAttribute('href', newHref);
                }

                // Re-apply styles that might have been removed
                link.style.border = '2px solid #4CAF50';
                link.style.padding = '2px 5px';
            }
        }
    });

    // Start observing the link with all necessary options
    linkObserver.observe(link, {
        attributes: true,
        attributeFilter: ['href', 'data-modified-by-script', 'style', 'class'],
        childList: true,
        characterData: true,
        subtree: true // To catch changes to child elements like the text label
    });
}

// Debounce function to limit the rate at which a function can fire.
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// MutationObserver to detect changes in the DOM
const observer = new MutationObserver((mutationsList) => {
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
        debouncedModifyInstallLinks();
    }
});

// Create a debounced version of modifyInstallLinks
const debouncedModifyInstallLinks = debounce(modifyInstallLinks, 300); // 300ms delay

// Observe the entire document body for changes with a comprehensive configuration
observer.observe(document.body, {
    childList: true, // Observe direct children being added or removed
    subtree: true,   // Observe all descendants of the target (document.body)
    attributes: true, // Observe attribute changes
    attributeFilter: ['href', 'style', 'class', 'data-modified-by-script'], // Only observe these specific attributes for efficiency
    characterData: true // Observe changes to text content within elements
});

// Instead of running on DOMContentLoaded, we'll wait for the page to be fully loaded
// and for React to finish its initial rendering cycle
window.addEventListener('load', () => {
    console.log('Window load event fired, waiting for React to stabilize before modifying links.');

    // Wait a bit longer to ensure React has finished its initial rendering
    setTimeout(() => {
        // Check if the page has stabilized by looking for the install button
        const checkPageStability = () => {
            const installContainers = document.querySelectorAll('.ux-oneclick-install-button-container');
            if (installContainers.length > 0) {
                console.log('Found install containers, page appears stable. Modifying links.');
                modifyInstallLinks();

                // Set up a mutation observer to detect when React makes changes to the DOM
                setupReactChangeDetection();
            } else {
                // If no install containers found yet, check again after a short delay
                console.log('No install containers found yet, checking again soon.');
                setTimeout(checkPageStability, 500);
            }
        };

        // Start checking for page stability
        checkPageStability();
    }, 1500); // Wait 1.5 seconds after load to start checking
});

// Function to set up detection of React changes to the DOM
function setupReactChangeDetection() {
    // Create a flag to track if we're currently processing a batch of mutations
    let processingMutations = false;

    // Create a debounced version of modifyInstallLinks that only runs once per batch of mutations
    const debouncedModify = debounce(() => {
        if (!processingMutations) {
            processingMutations = true;
            console.log('React appears to have updated the DOM, reapplying modifications.');
            modifyInstallLinks();
            setTimeout(() => {
                processingMutations = false;
            }, 100);
        }
    }, 200);

    // Create a mutation observer to detect when React makes changes to the DOM
    const reactObserver = new MutationObserver((mutations) => {
        // Look for mutations that might indicate React has updated the DOM
        let reactUpdateDetected = false;

        for (const mutation of mutations) {
            // Check for added nodes that might be React components
            if (mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is a button container or contains one
                        if (node.classList &&
                            (node.classList.contains('ux-oneclick-install-button-container') ||
                             node.querySelector('.ux-oneclick-install-button-container'))) {
                            reactUpdateDetected = true;
                            break;
                        }

                        // Check for React root elements
                        if (node.hasAttribute &&
                            (node.hasAttribute('data-reactroot') ||
                             (node.querySelector && node.querySelector('[data-reactroot]')))) {
                            reactUpdateDetected = true;
                            break;
                        }
                    }
                }
            }

            // Check for attribute changes on install buttons or their containers
            if (mutation.type === 'attributes') {
                const target = mutation.target;
                if (target.nodeType === Node.ELEMENT_NODE) {
                    // Check if this is a button or contains a button
                    if ((target.classList && target.classList.contains('ux-oneclick-install-button-container')) ||
                        (target.closest && target.closest('.ux-oneclick-install-button-container')) ||
                        (target.querySelector && target.querySelector('.ux-oneclick-install-button-container'))) {
                        reactUpdateDetected = true;
                        break;
                    }

                    // Check for href changes on links
                    if (mutation.attributeName === 'href' &&
                        target.getAttribute &&
                        target.getAttribute('href') &&
                        target.getAttribute('href').includes('vscode:extension/')) {
                        reactUpdateDetected = true;
                        break;
                    }
                }
            }

            if (reactUpdateDetected) break;
        }

        // If we detected a React update, reapply our modifications
        if (reactUpdateDetected) {
            debouncedModify();
        }
    });

    // Start observing the entire document for changes
    reactObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href', 'class', 'style', 'data-reactroot']
    });

    console.log('React change detection set up.');
}

// Polling mechanism to ensure our changes persist after React rendering cycles
function startPollingForReactRenders() {
    // Initial delay before starting the polling (give React time to initialize)
    setTimeout(() => {
        // Check specifically for the line 1294 React rendering function mentioned by the user
        // This polling targets the period after React's lf() function has run
        const pollInterval = setInterval(() => {
            const installContainers = document.querySelectorAll('.ux-oneclick-install-button-container');
            if (installContainers.length > 0) {
                // Check if any container has an unmodified button
                let needsModification = false;

                installContainers.forEach(container => {
                    const link = container.querySelector('a[href*=":extension/"]');
                    if (link && !link.hasAttribute('data-modified-by-script')) {
                        needsModification = true;
                    }
                });

                if (needsModification) {
                    // console.log('Polling detected unmodified buttons after React render, reapplying modifications'); // Optional logging
                    modifyInstallLinks();
                }
            }
        }, 500); // Check every 500ms

        // Stop polling after 30 seconds to avoid unnecessary resource usage
        setTimeout(() => {
            clearInterval(pollInterval);
            // console.log('Polling for React renders stopped after timeout'); // Optional logging
        }, 30000);
    }, 1000); // Wait 1 second before starting the polling
}

// The MutationObserver is still useful for detecting changes in the DOM,
// but the polling mechanism above specifically targets React's rendering cycle

// Add a more aggressive approach to intercept React's rendering cycle
// This specifically targets the rendering process mentioned in line 1294 of modifybutton.js
function interceptReactRendering() {
    // Wait for the page to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptReactRendering);
        return;
    }

    try {
        // Try to intercept React's rendering by monitoring for specific DOM changes
        // that occur after React renders components
        const targetNode = document.body;

        // Create a special observer that runs at a higher priority than our regular observer
        const reactRenderObserver = new MutationObserver((mutations) => {
            // Look for specific patterns that indicate React has just rendered components
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any of the added nodes are related to the install button
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Look for React root elements or containers that might contain our target
                            if (node.hasAttribute('data-reactroot') ||
                                node.querySelector('[data-reactroot]')) {
                                // React has just rendered something, check for our buttons
                                setTimeout(modifyInstallLinks, 0); // Run on next tick
                                break;
                            }

                            // Also check for our specific target containers
                            if (node.classList &&
                                (node.classList.contains('ux-oneclick-install-button-container') ||
                                 node.querySelector('.ux-oneclick-install-button-container'))) {
                                setTimeout(modifyInstallLinks, 0); // Run on next tick
                                break;
                            }
                        }
                    }
                }
            }
        });

        // Start observing with a configuration focused on React rendering
        reactRenderObserver.observe(targetNode, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        // console.log('React rendering interception set up'); // Optional logging
    } catch (error) {
        // console.error('Error setting up React rendering interception:', error); // Optional logging
    }
}

// Start the React rendering interception
interceptReactRendering();

// Add a direct interception for the specific mutation functions mentioned by the user
// These are the functions that are adding new buttons back after lf() removes them
function interceptMutationFunctions() {
    try {
        // Create a more aggressive observer that specifically targets the mutation functions
        // mentioned by the user: appendChild, insertBefore, removeChild, etc.
        const mutationFunctionsObserver = new MutationObserver((mutations) => {
            // Track if we've seen patterns matching the mutation functions
            let hasSeenAppendChild = false;
            let hasSeenInsertBefore = false;
            let hasSeenRemoveChild = false;
            let hasSeenCommitUpdate = false;

            // Look for patterns that match the mutation functions
            for (const mutation of mutations) {
                // appendChild and appendChildToContainer
                if (mutation.type === 'childList' && mutation.addedNodes.length === 1 &&
                    mutation.removedNodes.length === 0) {
                    hasSeenAppendChild = true;
                }

                // insertBefore and insertInContainerBefore
                if (mutation.type === 'childList' && mutation.addedNodes.length === 1 &&
                    mutation.previousSibling !== null) {
                    hasSeenInsertBefore = true;
                }

                // removeChild and removeChildFromContainer
                if (mutation.type === 'childList' && mutation.removedNodes.length === 1 &&
                    mutation.addedNodes.length === 0) {
                    hasSeenRemoveChild = true;
                }

                // commitUpdate (attribute changes)
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'href' || mutation.attributeName === 'class')) {
                    hasSeenCommitUpdate = true;
                }
            }

            // If we've seen any of the mutation functions in action
            if (hasSeenAppendChild || hasSeenInsertBefore || hasSeenRemoveChild || hasSeenCommitUpdate) {
                // Check if there are any install buttons that need modification
                const installContainers = document.querySelectorAll('.ux-oneclick-install-button-container');
                if (installContainers.length > 0) {
                    // Apply our modifications immediately
                    modifyInstallLinks();

                    // Also set up a series of delayed checks to catch any subsequent React updates
                    setTimeout(modifyInstallLinks, 50);
                    setTimeout(modifyInstallLinks, 150);
                    setTimeout(modifyInstallLinks, 300);
                }
            }
        });

        // Start observing with a configuration that catches all the mutation functions
        mutationFunctionsObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'class', 'style', 'data-reactroot']
        });
    } catch (error) {
        // console.error('Error intercepting mutation functions:', error); // Optional logging
    }
}

// Start the mutation functions interception
interceptMutationFunctions();

// Add a specific monitor for React's rendering function mentioned in line 1294
// This targets the specific function that's causing our button to revert
function monitorReactRenderingFunction() {
    try {
        // Wait a short time for React to be fully initialized
        setTimeout(() => {
            // Set up direct interception for the lf() function mentioned by the user
            // This function is responsible for clearing and rebuilding DOM elements
            setupLfFunctionInterception();

            // Also set up our button state monitor as a fallback
            setupButtonStateMonitor();

            // Try to intercept the specific lf() function mentioned by the user
            interceptLfFunction();
        }, 1500);
    } catch (error) {
        // console.error('Error in monitorReactRenderingFunction:', error); // Optional logging
    }
}

// Function to directly intercept the lf() function mentioned by the user
function interceptLfFunction() {
    try {
        // Create a MutationObserver that specifically watches for the pattern of the lf() function
        // which removes all children and then adds a new element with data-reactroot
        const lfPatternObserver = new MutationObserver((mutations) => {
            // Look for the specific pattern: multiple node removals followed by adding a node with data-reactroot
            let hasRemovedMultipleNodes = false;
            let hasAddedReactRoot = false;

            // Check for multiple node removals (characteristic of lf function)
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 1) {
                    hasRemovedMultipleNodes = true;
                    break;
                }
            }

            // If we detected multiple node removals, check for React root additions
            if (hasRemovedMultipleNodes) {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.hasAttribute('data-reactroot') ||
                                 node.querySelector('[data-reactroot]'))) {
                                hasAddedReactRoot = true;
                                break;
                            }
                        }
                    }
                    if (hasAddedReactRoot) break;
                }
            }

            // If we detected the exact pattern of lf() function execution
            if (hasRemovedMultipleNodes && hasAddedReactRoot) {
                // console.log('Detected exact lf() function execution pattern'); // Optional logging

                // Wait for React to finish rendering, then check for install buttons
                setTimeout(() => {
                    const installContainers = document.querySelectorAll('.ux-oneclick-install-button-container');
                    if (installContainers.length > 0) {
                        // console.log('Found install containers after lf() execution, modifying links'); // Optional logging
                        modifyInstallLinks();

                        // Also set up a series of checks to ensure our modifications persist
                        // after any subsequent React rendering cycles
                        setTimeout(modifyInstallLinks, 50);
                        setTimeout(modifyInstallLinks, 200);
                        setTimeout(modifyInstallLinks, 500);
                    }
                }, 0);
            }
        });

        // Start observing the document body for the lf() function pattern
        lfPatternObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    } catch (error) {
        // console.error('Error intercepting lf() function:', error); // Optional logging
    }
}

// Function to intercept the lf() function that's removing elements
function setupLfFunctionInterception() {
    try {
        // Create a MutationObserver specifically targeting the pattern of lf() function
        // which removes all children and then adds a new element with data-reactroot
        const lfObserver = new MutationObserver((mutations) => {
            let nodeRemovalDetected = false;
            let reactRootAddedAfterRemoval = false;

            // First pass: look for node removals (characteristic of lf function)
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    nodeRemovalDetected = true;
                    break;
                }
            }

            // Second pass: look for data-reactroot additions after removals
            if (nodeRemovalDetected) {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.hasAttribute('data-reactroot') ||
                                 node.querySelector('[data-reactroot]'))) {
                                reactRootAddedAfterRemoval = true;
                                break;
                            }
                        }
                    }
                    if (reactRootAddedAfterRemoval) break;
                }
            }

            // If we detected the pattern of lf() function (remove all + add reactroot)
            if (nodeRemovalDetected && reactRootAddedAfterRemoval) {
                // console.log('Detected lf() function pattern: node removal followed by React root addition'); // Optional logging
                // Wait a tiny bit for React to finish rendering, then modify links
                setTimeout(() => {
                    modifyInstallLinks();
                    // Also check again after a short delay to catch any mutation functions
                    // that might run right after lf() completes
                    setTimeout(modifyInstallLinks, 100);
                }, 0);
            }
        });

        // Start observing with a configuration focused on the lf() function pattern
        lfObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also set up interception for the mutation functions that add new buttons
        setupMutationFunctionInterception();
    } catch (error) {
        // console.error('Error setting up lf function interception:', error); // Optional logging
    }
}

// Function to intercept the mutation functions that are adding new buttons
function setupMutationFunctionInterception() {
    try {
        // Create a MutationObserver specifically targeting button additions
        const mutationFunctionObserver = new MutationObserver((mutations) => {
            let buttonAdded = false;
            let hrefChanged = false;

            for (const mutation of mutations) {
                // Check for new nodes being added (appendChild, insertBefore, etc.)
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if this is a button container or contains one
                            if (node.classList && node.classList.contains('ux-oneclick-install-button-container') ||
                                node.querySelector('.ux-oneclick-install-button-container')) {
                                buttonAdded = true;
                                break;
                            }

                            // Also check for links with vscode:extension/ href
                            if (node.tagName === 'A' && node.getAttribute('href') &&
                                node.getAttribute('href').includes('vscode:extension/')) {
                                buttonAdded = true;
                                break;
                            }

                            // Check for any element containing such links
                            if (node.querySelector('a[href*="vscode:extension/"]')) {
                                buttonAdded = true;
                                break;
                            }
                        }
                    }
                    if (buttonAdded) break;
                }

                // Check for attribute changes (commitUpdate, commitTextUpdate)
                if (mutation.type === 'attributes') {
                    if (mutation.attributeName === 'href') {
                        const target = mutation.target;
                        if (target.getAttribute('href') &&
                            target.getAttribute('href').includes('vscode:extension/')) {
                            hrefChanged = true;
                            break;
                        }
                    }
                }
            }

            if (buttonAdded || hrefChanged) {
                // console.log('Detected button addition or href change from mutation functions'); // Optional logging
                // Immediately modify the links
                modifyInstallLinks();
                // Also check again after a short delay to ensure all buttons are modified
                setTimeout(modifyInstallLinks, 50);
                // And again after a longer delay to catch any subsequent React updates
                setTimeout(modifyInstallLinks, 200);
            }
        });

        // Start observing with a configuration focused on button additions and attribute changes
        mutationFunctionObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'class', 'style']
        });

        // Also set up a specific observer for text content changes (commitTextUpdate function)
        const textChangeObserver = new MutationObserver((mutations) => {
            let textChanged = false;

            for (const mutation of mutations) {
                if (mutation.type === 'characterData') {
                    // Check if this text node is within or near a button container
                    let node = mutation.target;
                    while (node && node.parentNode) {
                        if (node.parentNode.querySelector &&
                            node.parentNode.querySelector('.ux-oneclick-install-button-container')) {
                            textChanged = true;
                            break;
                        }
                        node = node.parentNode;
                    }
                    if (textChanged) break;
                }
            }

            if (textChanged) {
                // console.log('Detected text change near button container'); // Optional logging
                // Apply our modifications
                modifyInstallLinks();
            }
        });

        // Start observing text content changes
        textChangeObserver.observe(document.body, {
            characterData: true,
            subtree: true
        });
    } catch (error) {
        // console.error('Error setting up mutation function interception:', error); // Optional logging
    }
}

// Set up a dedicated monitor for the button state
function setupButtonStateMonitor() {
    // Create a persistent interval that checks for button state
    const buttonStateInterval = setInterval(() => {
        const installContainers = document.querySelectorAll('.ux-oneclick-install-button-container');
        if (installContainers.length > 0) {
            let allButtonsModified = true;

            installContainers.forEach(container => {
                const link = container.querySelector('a[href*=":extension/"]');
                if (link) {
                    // Check if this button has our modifications
                    if (!link.hasAttribute('data-modified-by-script')) {
                        allButtonsModified = false;
                        // Button found without our modifications, reapply
                        modifyInstallLinks();
                        return false; // Break the forEach loop
                    }

                    // Double-check the href attribute
                    const href = link.getAttribute('href') || '';
                    if (href.startsWith('vscode:extension/')) {
                        allButtonsModified = false;
                        // Button href has been reverted, reapply
                        modifyInstallLinks();
                        return false; // Break the forEach loop
                    }
                }
            });

            // If all buttons are properly modified for 10 consecutive checks,
            // we can reduce the check frequency
            if (allButtonsModified) {
                if (!window._modifiedButtonsStableCount) {
                    window._modifiedButtonsStableCount = 1;
                } else {
                    window._modifiedButtonsStableCount++;
                }

                // If stable for a while, reduce check frequency
                if (window._modifiedButtonsStableCount >= 10) {
                    clearInterval(buttonStateInterval);
                    // Set up a less frequent check
                    setInterval(modifyInstallLinks, 2000);
                    // console.log('Button state appears stable, reducing check frequency'); // Optional logging
                }
            } else {
                // Reset the stable count if we had to modify buttons
                window._modifiedButtonsStableCount = 0;
            }
        }
    }, 300); // Check every 300ms initially

    // Return the interval ID so it can be cleared if needed
    return buttonStateInterval;
}

// Start monitoring for React's rendering function
monitorReactRenderingFunction();

// A more aggressive approach to intercept React's rendering cycle
function monkeyPatchReactFunctions() {
    // We'll wait for the page to be fully loaded before attempting to patch React functions
    window.addEventListener('load', () => {
        console.log('Window loaded, setting up React function interception');

        // Function to inject our interception code
        const injectInterception = () => {
            try {
                // First, try to find the lf() function that's causing our issues
                if (typeof window.lf === 'function') {
                    const originalLf = window.lf;

                    // Create our modified version of the function and store it globally
                    window._ourModifiedLf = function(a, b) {
                        console.log('lf() function intercepted');

                        // Store references to any modified buttons before they're removed
                        const containers = document.querySelectorAll('.ux-oneclick-install-button-container');
                        const modifiedButtons = [];

                        containers.forEach(container => {
                            const link = container.querySelector('a[href*=":extension/"]');
                            if (link && link.hasAttribute('data-modified-by-script')) {
                                // Save the current state of this button
                                modifiedButtons.push({
                                    href: link.getAttribute('href'),
                                    text: link.querySelector('.ms-Button-label')?.textContent || link.textContent,
                                    container: container
                                });
                            }
                        });

                        // Call the original function with the original arguments
                        const result = originalLf.apply(this, [a, b]);

                        // After React has rebuilt the DOM, restore our modifications
                        setTimeout(() => {
                            console.log('lf() function completed, restoring modifications');

                            // First try to find the containers again
                            const newContainers = document.querySelectorAll('.ux-oneclick-install-button-container');

                            if (newContainers.length > 0) {
                                // If we have containers, apply our modifications
                                modifyInstallLinks();
                            } else {
                                console.log('No containers found after lf() execution, will check again');
                                // Check again after a short delay
                                setTimeout(modifyInstallLinks, 500);
                            }
                        }, 0);

                        return result;
                    };

                    // Replace the original function with our modified version
                    window.lf = window._ourModifiedLf;
                    console.log('Successfully intercepted lf() function with preservation logic');
                }

                // Also set up a periodic check to ensure our interception is still in place
                // (in case the page redefines the lf function)
                const lfCheckInterval = setInterval(() => {
                    if (typeof window.lf === 'function' && window.lf !== window._ourModifiedLf) {
                        console.log('lf function changed, reapplying interception');
                        // Store a reference to our modified function
                        window._ourModifiedLf = window.lf;
                    }
                }, 5000); // Check every 5 seconds

                // Store the interval ID so we can clear it if needed
                window._lfCheckIntervalId = lfCheckInterval;
            } catch (error) {
                console.error('Error in injectInterception:', error);
            }
        };

        // Wait a bit to ensure React is fully initialized, then inject our interception
        setTimeout(() => {
            try {
                // Execute our interception
                injectInterception();

                // Next, try to find the mutation object
                if (window.mutation && typeof window.mutation === 'object') {
                    // We'll focus on the key functions that affect our button
                    const functionsToIntercept = [
                        'appendChild',
                        'appendChildToContainer',
                        'insertBefore',
                        'insertInContainerBefore',
                        'commitUpdate',
                        'commitTextUpdate'
                    ];

                    // Keep track of which functions we've successfully intercepted
                    const intercepted = [];

                    // Intercept each function
                    functionsToIntercept.forEach(funcName => {
                        if (typeof window.mutation[funcName] === 'function') {
                            const originalFunc = window.mutation[funcName];

                            window.mutation[funcName] = function(...args) {
                                // Call the original function
                                const result = originalFunc.apply(this, args);

                                // Check if this operation might have affected our button
                                // by looking at the arguments
                                let mightAffectButton = false;

                                // For appendChild and insertBefore, check if the node being added
                                // is or contains a button
                                if (funcName.includes('Child') && args.length > 0) {
                                    const node = args[0];
                                    if (node && node.nodeType === Node.ELEMENT_NODE) {
                                        if (node.classList &&
                                            (node.classList.contains('ux-oneclick-install-button-container') ||
                                             (node.querySelector && node.querySelector('.ux-oneclick-install-button-container')))) {
                                            mightAffectButton = true;
                                        }
                                    }
                                }

                                // For commitUpdate, check if the element being updated is a button
                                if (funcName === 'commitUpdate' && args.length > 0) {
                                    const element = args[0];
                                    if (element && element.nodeType === Node.ELEMENT_NODE) {
                                        if (element.classList &&
                                            (element.classList.contains('ux-oneclick-install-button-container') ||
                                             element.closest && element.closest('.ux-oneclick-install-button-container') ||
                                             (element.querySelector && element.querySelector('.ux-oneclick-install-button-container')))) {
                                            mightAffectButton = true;
                                        }

                                        // Also check if it's a link with vscode:extension/ href
                                        if (element.tagName === 'A' &&
                                            element.getAttribute &&
                                            element.getAttribute('href') &&
                                            element.getAttribute('href').includes('vscode:extension/')) {
                                            mightAffectButton = true;
                                        }
                                    }
                                }

                                // If this operation might have affected our button, wait for React
                                // to finish rendering, then apply our modifications
                                if (mightAffectButton) {
                                    // Use requestAnimationFrame to wait for the browser to finish rendering
                                    requestAnimationFrame(() => {
                                        // Then wait a bit more to ensure React has finished
                                        setTimeout(() => {
                                            console.log(`${funcName} affected button, applying modifications after render`);
                                            modifyInstallLinks();
                                        }, 100);
                                    });
                                }

                                return result;
                            };

                            intercepted.push(funcName);
                        }
                    });

                    if (intercepted.length > 0) {
                        console.log(`Successfully intercepted mutation functions: ${intercepted.join(', ')}`);
                    }
                }

                // Set up a more focused MutationObserver that specifically watches for
                // changes to the install button
                setupFocusedButtonObserver();

            } catch (error) {
                console.error('Error in monkeyPatchReactFunctions:', error);
            }
        }, 2000); // Wait 2 seconds to ensure React is fully initialized
    });
}

// Set up a focused observer that specifically watches for changes to the install button
function setupFocusedButtonObserver() {
    // Create a debounced version of modifyInstallLinks
    const debouncedModify = debounce(() => {
        console.log('Button change detected, applying modifications');
        modifyInstallLinks();
    }, 200);

    // Function to observe a specific button
    const observeButton = (button) => {
        if (button._isObserved) return; // Don't observe the same button twice

        // Mark this button as being observed
        button._isObserved = true;

        // Create an observer for this specific button
        const buttonObserver = new MutationObserver((mutations) => {
            let needsModification = false;

            for (const mutation of mutations) {
                // Check for attribute changes
                if (mutation.type === 'attributes') {
                    if (mutation.attributeName === 'href') {
                        const href = button.getAttribute('href');
                        if (href && href.includes('vscode:extension/')) {
                            needsModification = true;
                            break;
                        }
                    }
                }

                // Check for text content changes
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const textElement = button.querySelector('.ms-Button-label');
                    if (textElement) {
                        const text = textElement.textContent;
                        if (text && text.includes('Install') && !text.includes('Install on ')) {
                            needsModification = true;
                            break;
                        }
                    }
                }
            }

            if (needsModification) {
                debouncedModify();
            }
        });

        // Observe the button with all necessary options
        buttonObserver.observe(button, {
            attributes: true,
            attributeFilter: ['href', 'class', 'style'],
            childList: true,
            characterData: true,
            subtree: true
        });

        console.log('Set up focused observer for button');
    };

    // Function to find and observe all install buttons
    const findAndObserveButtons = () => {
        const containers = document.querySelectorAll('.ux-oneclick-install-button-container');
        containers.forEach(container => {
            const button = container.querySelector('a[href*=":extension/"]');
            if (button) {
                observeButton(button);
            }
        });
    };

    // Set up an observer to detect when new buttons are added to the page
    const pageObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any of the added nodes are or contain install buttons
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is a button container
                        if (node.classList && node.classList.contains('ux-oneclick-install-button-container')) {
                            const button = node.querySelector('a[href*=":extension/"]');
                            if (button) {
                                observeButton(button);
                            }
                        }

                        // Check if this contains a button container
                        const containers = node.querySelectorAll ?
                            node.querySelectorAll('.ux-oneclick-install-button-container') : [];

                        for (const container of containers) {
                            const button = container.querySelector('a[href*=":extension/"]');
                            if (button) {
                                observeButton(button);
                            }
                        }
                    }
                }
            }
        }
    });

    // Start observing the page for new buttons
    pageObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Find and observe any existing buttons
    findAndObserveButtons();

    console.log('Focused button observer set up');
}

// Start the monkey patching process
monkeyPatchReactFunctions();