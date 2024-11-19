document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    document.getElementById('block-sites-tab').addEventListener('click', function() {
      showTab('block-sites');
    });
    document.getElementById('focus-mode-tab').addEventListener('click', function() {
      showTab('focus-mode');
    });
  
    // Initialize Block Sites Tab
    document.getElementById('block-button').addEventListener('click', addSiteToBlockList);
    document.getElementById('site-url').addEventListener('input', suggestSites);
    updateBlockedSitesList();
  
    // Initialize Focus Mode Tab
    document.getElementById('focus-block-button').addEventListener('click', startFocusMode);
    document.getElementById('focus-site-url').addEventListener('input', suggestSites);
    updateFocusBlockedSitesList();
  
    // Load current Focus Mode status
    checkFocusModeStatus();
  });
  
  function showTab(tabId) {
    document.getElementById('block-sites').style.display = 'none';
    document.getElementById('focus-mode').style.display = 'none';
  
    document.getElementById('block-sites-tab').classList.remove('active');
    document.getElementById('focus-mode-tab').classList.remove('active');
  
    document.getElementById(tabId).style.display = 'block';
    document.getElementById(`${tabId}-tab`).classList.add('active');
  }
  
  function addSiteToBlockList() {
    const siteUrl = document.getElementById('site-url').value.trim();
    if (siteUrl) {
      chrome.storage.sync.get({blockedSites: []}, function(result) {
        let blockedSites = result.blockedSites || [];
        if (!blockedSites.includes(siteUrl)) {
          blockedSites.push(siteUrl);
          chrome.storage.sync.set({blockedSites: blockedSites}, function() {
            console.log('Blocked Sites:', blockedSites);
            document.getElementById('status-message').innerText = `${siteUrl} is now blocked.`;
            updateBlockingRules(blockedSites);
            updateBlockedSitesList();
            document.getElementById('site-url').value = ''; // Clear the input field
          });
        } else {
          document.getElementById('status-message').innerText = `${siteUrl} is already blocked.`;
        }
      });
    }
  }
  
  function unblockSite(siteUrl) {
    chrome.storage.sync.get({blockedSites: []}, function(result) {
      let blockedSites = result.blockedSites || [];
      const index = blockedSites.indexOf(siteUrl);
      if (index > -1) {
        blockedSites.splice(index, 1);
        chrome.storage.sync.set({blockedSites: blockedSites}, function() {
          console.log('Blocked Sites:', blockedSites);
          document.getElementById('status-message').innerText = `${siteUrl} has been unblocked.`;
          updateBlockingRules(blockedSites);
          updateBlockedSitesList();
        });
      }
    });
  }
  
  function updateBlockingRules(blockedSites) {
    const rules = blockedSites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { url: chrome.runtime.getURL('blocked.html') } },
      condition: { urlFilter: site, resourceTypes: ['main_frame'] }
    }));
  
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: rules.map(rule => rule.id)
    });
  }
  
  function updateBlockedSitesList() {
    chrome.storage.sync.get({blockedSites: []}, function(result) {
      const blockedSites = result.blockedSites || [];
      console.log('Updating Blocked Sites List:', blockedSites);
      const blockedSitesList = document.getElementById('blocked-sites-list');
      blockedSitesList.innerHTML = ''; // Clear the list
      blockedSites.forEach(site => {
        const listItem = document.createElement('li');
        listItem.textContent = site;
        listItem.addEventListener('click', function() {
          if (confirm(`Unblock ${site}?`)) {
            unblockSite(site);
          }
        });
        blockedSitesList.appendChild(listItem);
      });
    });
  }
  
  function startFocusMode() {
    const siteUrl = document.getElementById('focus-site-url').value.trim();
    const focusTime = parseInt(document.getElementById('focus-time').value);
    if (!siteUrl || isNaN(focusTime) || focusTime <= 0) {
      document.getElementById('focus-status-message').innerText = 'Please enter a valid URL and time.';
      return;
    }
  
    chrome.storage.sync.get({focusBlockedSites: []}, function(result) {
      let focusBlockedSites = result.focusBlockedSites || [];
      if (!focusBlockedSites.includes(siteUrl)) {
        focusBlockedSites.push(siteUrl);
        const focusEndTime = Date.now() + focusTime * 60000;
        chrome.storage.sync.set({focusBlockedSites: focusBlockedSites, focusModeActive: true, focusEndTime: focusEndTime}, function() {
          document.getElementById('focus-status-message').innerText = `Focus Mode is active for ${focusTime} minutes.`;
          updateFocusBlockingRules(focusBlockedSites);
          updateFocusBlockedSitesList();
          startCountdown(focusEndTime);
          document.getElementById('focus-site-url').value = ''; // Clear the input field
          document.getElementById('focus-time').value = ''; // Clear the input field
        });
      } else {
        document.getElementById('focus-status-message').innerText = `${siteUrl} is already blocked in Focus Mode.`;
      }
    });
  }
  
  function unblockFocusSite(siteUrl) {
    chrome.storage.sync.get({focusBlockedSites: []}, function(result) {
      let focusBlockedSites = result.focusBlockedSites || [];
      const index = focusBlockedSites.indexOf(siteUrl);
      if (index > -1) {
        focusBlockedSites.splice(index, 1);
        chrome.storage.sync.set({focusBlockedSites: focusBlockedSites}, function() {
          console.log('Focus Blocked Sites:', focusBlockedSites);
          document.getElementById('focus-status-message').innerText = `${siteUrl} has been unblocked in Focus Mode.`;
          updateFocusBlockingRules(focusBlockedSites);
          updateFocusBlockedSitesList();
        });
      }
    });
  }
  
  function updateFocusBlockingRules(focusBlockedSites) {
    const rules = focusBlockedSites.map((site, index) => ({
      id: index + 1 + 1000, // Offset ID for focus mode
      priority: 1,
      action: { type: 'redirect', redirect: { url: chrome.runtime.getURL('blocked.html') } },
      condition: { urlFilter: site, resourceTypes: ['main_frame'] }
    }));
  
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: rules.map(rule => rule.id)
    });
  }
  
  function updateFocusBlockedSitesList() {
    chrome.storage.sync.get({focusBlockedSites: []}, function(result) {
      const focusBlockedSites = result.focusBlockedSites || [];
      console.log('Updating Focus Blocked Sites List:', focusBlockedSites);
      const focusBlockedSitesList = document.getElementById('focus-blocked-sites-list');
      focusBlockedSitesList.innerHTML = ''; // Clear the list
      focusBlockedSites.forEach(site => {
        const listItem = document.createElement('li');
        listItem.textContent = site;
        listItem.addEventListener('click', function() {
          if (confirm(`Unblock ${site} from Focus Mode?`)) {
            unblockFocusSite(site);
          }
        });
        focusBlockedSitesList.appendChild(listItem);
      });
    });
  }
  
  function startCountdown(endTime) {
    const timerElement = document.getElementById('timer');
  
    function updateTimer() {
      const now = Date.now();
      const distance = endTime - now;
  
      if (distance < 0) {
        chrome.storage.sync.set({focusModeActive: false}, function() {
          document.getElementById('focus-status-message').innerText = 'Focus Mode has ended.';
          timerElement.innerText = '';
          chrome.storage.sync.get({focusBlockedSites: []}, function(result) {
            let focusBlockedSites = result.focusBlockedSites || [];
            focusBlockedSites.forEach(site => {
              unblockFocusSite(site);
            });
          });
        });
        return;
      }
  
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  
      timerElement.innerText = `Time left: ${days}d ${hours}h ${minutes}m ${seconds}s`;
  
      setTimeout(updateTimer, 1000);
    }
  
    updateTimer();
  }
  
  function checkFocusModeStatus() {
    chrome.storage.sync.get(['focusModeActive', 'focusEndTime'], function(result) {
      if (result.focusModeActive && result.focusEndTime > Date.now()) {
        startCountdown(result.focusEndTime);
      }
    });
  }
  
  function suggestSites(event) {
    const inputElement = event.target;
    const query = inputElement.value.toLowerCase();
  
    // Fetch URL suggestions based on user input
    fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${query}`)
      .then(response => response.json())
      .then(data => {
        const suggestions = data.map(item => item.domain);
        const dataList = document.getElementById(inputElement.getAttribute('list'));
        dataList.innerHTML = ''; // Clear previous suggestions
        suggestions.forEach(site => {
          const option = document.createElement('option');
          option.value = site;
          dataList.appendChild(option);
        });
      })
      .catch(error => console.error('Error fetching suggestions:', error));
  }
  
  