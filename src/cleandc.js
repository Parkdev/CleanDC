import { Message, Observer, Element, sleep } from '../utils'
import * as functions from './functions'
import _ from 'lodash'
const options = Message.send('requestOptions')
const { selectors: sel } = Element
const c = process.env.NODE_ENV === 'development' ? e => console.error(e) : () => {}

function injectHelper () {
  const script = document.createElement('script')
  $(document.body).append(script)
  script.onload = async function () {
    if (!$(sel.editor).length) return // 에디터일때 helper/gjjal과 통신
    window.postMessage({ gjjal: await Message.send('requestGjjal') })
  }
  script.src = chrome.extension.getURL('helper.js')
}

const lifecycle = {
  async head () {
    const head = await Observer.wait(document.documentElement, 'head')
    _.invokeMap(functions, 'head', head, options)
  },
  async body () {
    const body = await Observer.wait(document.documentElement, 'body')
    _.invokeMap(functions, 'body', body, options)
    this.list(body).catch(c)
    this.article(body).catch(c)
  },
  async list (body) {
    const list = await Observer.wait(body, sel.list)
    _.invokeMap(functions, 'listCreated', list, options) // v73.0.3683.86 또 여기서 들어오고 아래 와치 안탐
    Observer.watch(list, function (mutations) {
      this.disconnect() // 크롬 v73.0 첫 mutation때 글 목록들이 모두 들어와짐. 6배 스로틀링 걸어도 동일
      _.invokeMap(functions, 'list', list, options)
    })
  },
  async article (body) {
    const article = await Observer.wait(body, sel.article)
    await sleep()
    _.invokeMap(functions, 'article', article, options)
    this.comments(article).catch(c)
    this.attachment(article).catch(c)
  },
  async attachment (article) {
    const attachment = await Observer.wait(article, sel.attachment)
    _.invokeMap(functions, 'attachment', attachment, options)
  },
  async comments (article) {
    const comments = await Observer.wait(article.parent(), sel.comments)
    Observer.watch(comments, () => _.invokeMap(functions, 'comments', comments, options))
  },
  async ready () {
    await new Promise(resolve => $(document).ready(resolve))
    injectHelper()
    _.invokeMap(functions, 'ready', options)
  },
  update () {
    Message.listen('optionsUpdated', options => {
      _.invokeMap(functions, 'update', options)
    }, false)
  }
}

lifecycle.head()
lifecycle.body()
lifecycle.ready()
lifecycle.update()
