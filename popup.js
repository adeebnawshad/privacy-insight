/**
 * ============================================
 * Privacy Insight - Popup Script
 * ============================================
 *
 * This script runs when the user opens the extension popup.
 * It:
 * 1. Gets the currently active tab
 * 2. Requests tracker information from the background service worker
 * 3. Displays tracker count, risk level, detected trackers, and explanation
 */


/**
 * Request tracker information for the currently active tab
 */
function getTrackerData() {
  // Find the currently active tab in the current browser window
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      showError('Could not get current tab');
      return;
    }

    const activeTab = tabs[0];
    const tabId = activeTab.id;

    // Ask the background service worker for tracker info for this tab
    chrome.runtime.sendMessage(
      { action: 'getTrackerInfo', tabId: tabId },
      (response) => {
        // Handle communication errors
        if (chrome.runtime.lastError) {
          showError('Error communicating with background worker');
          return;
        }

        // Handle missing or malformed response
        if (!response) {
          showError('No tracker data available');
          return;
        }

        // Render tracker data in the popup
        displayTrackerData(response);
      }
    );
  });
}


/**
 * Display tracker information in the popup UI
 */
function displayTrackerData(data) {
  // Update tracker count
  const countElement = document.getElementById('trackerCount');
  countElement.textContent = data.count;

  // Update privacy risk label and color
  const riskElement = document.getElementById('riskLevel');
  riskElement.textContent = data.riskLevel.level;
  riskElement.style.color = data.riskLevel.color;
  riskElement.style.fontWeight = 'bold';

  // Render detected trackers
  const listElement = document.getElementById('trackersList');
  listElement.innerHTML = '';

  if (data.count === 0) {
    listElement.innerHTML = '<p class="no-trackers">✓ No trackers detected on this page</p>';
  } else {
    const trackerHTML = data.trackers
      .map(
        (tracker) => `
        <div class="tracker-item">
          <span class="tracker-domain">${escapeHtml(tracker.domain)}</span>
          <span class="tracker-description">${escapeHtml(tracker.description)}</span>
        </div>
      `
      )
      .join('');

    listElement.innerHTML = trackerHTML;
  }

  // Update plain-language explanation based on tracker count and risk level
  updateExplanation(data.count, data.riskLevel.level);
}


/**
 * Update the explanation text shown to the user
 */
function updateExplanation(count, riskLevel) {
  const explanationElement = document.getElementById('explanation');

  let explanationText = '';

  if (count === 0) {
    explanationText = `
      <p><strong>Good news!</strong> No known trackers were detected on this page.</p>
      <p>This suggests the page is not loading any tracker domains from the extension's current tracker list.</p>
    `;
  } else if (riskLevel === 'Medium') {
    explanationText = `
      <p><strong>Medium Risk:</strong> This page includes some tracking activity.</p>
      <p>A small number of tracker domains were detected. These services may collect browsing behavior, engagement data, or advertising information.</p>
    `;
  } else if (riskLevel === 'High') {
    explanationText = `
      <p><strong>High Risk:</strong> This page includes significant tracking activity.</p>
      <p>Multiple tracker domains were detected. This may allow several third-party services to collect information about your browsing behavior and interests.</p>
    `;
  } else {
    // Fallback explanation in case risk logic changes later
    explanationText = `
      <p><strong>Privacy Insight:</strong> Tracker information was detected for this page.</p>
      <p>The current page may include third-party services that collect browsing or engagement data.</p>
    `;
  }

  explanationElement.innerHTML = explanationText;
}


/**
 * Display an error message in the popup
 */
function showError(message) {
  const countElement = document.getElementById('trackerCount');
  const riskElement = document.getElementById('riskLevel');
  const listElement = document.getElementById('trackersList');
  const explanationElement = document.getElementById('explanation');

  countElement.textContent = '—';
  riskElement.textContent = '—';
  riskElement.style.color = '';
  listElement.innerHTML = `<p class="error">${escapeHtml(message)}</p>`;
  explanationElement.innerHTML = `<p class="error">${escapeHtml(message)}</p>`;
}


/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}


/**
 * Start loading tracker data as soon as the popup opens
 */
document.addEventListener('DOMContentLoaded', getTrackerData);