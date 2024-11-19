chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get({blockedSites: []}, function(result) {
      updateBlockingRules(result.blockedSites);
    });
  });
  
  function updateBlockingRules(blockedSites) {
    const rules = blockedSites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { url: chrome.runtime.getURL('blocked.html') } },
      condition: { urlFilter: site, resourceTypes: ['main_frame'] }
    }));
  
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: Array.from({ length: rules.length }, (_, i) => i + 1)
    });
  }
  