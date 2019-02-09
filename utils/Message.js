function getAllTabs () {
  return new Promise(resolve => chrome.tabs.query({}, tabs => resolve(tabs)))
}
const listeners = {}
chrome.runtime.onMessage.addListener(
  ({ name, payload }, sender, sendResponse) => {
    if (!listeners[name]) return
    listeners[name].callback(payload, sender, sendResponse)
    return true
  }
)

export function listen (name, callback = (payload, sender, sendResponse) => {}) { // 콜백이 있을 경우 콜백으로 응답
  let cb = callback
  listeners[name] = {
    callback (payload, sender, sendResponse) {
      cb(payload, sender, sendResponse)
    }
  }
  return {
    callback (callback) {
      cb = callback
    }
  }
}

export function send (name, payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ name, payload }, response => resolve(response))
  })
}

export function sendTab (name, tabId, payload) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { name, payload }, response => resolve(response))
  })
}
export async function sendAllTabs (name, payload) {
  const tabs = await getAllTabs()
  return Promise.all(tabs.map(tab => sendTab(name, tab.id, payload)))
}
export async function sendActiveTab (name, payload) {
  const tabs = await getAllTabs()
  return Promise.all(tabs.filter(tab => tab.active).forEach(tab => sendTab(name, tab.id, payload)))
}

export default {
  listen,
  send,
  sendTab,
  sendAllTabs,
  sendActiveTab
}
