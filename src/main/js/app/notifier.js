import m from 'mithril'
import moment from 'moment'

let notifications = []

export function notifyItemView (item) {
  let attr = {}
  let itemClass = ''
  switch (item.type) {
    case 'error':
      itemClass = '.red-text'
      break
    default:
      itemClass = '.black-text'
  }
  return m('div.collection-item.list-item' + itemClass, attr, item.message)
}

function notifyView (ctrl) {
  if (notifications.length <= 0) {
    return m('')
  }

  return m('div.collection', notifications.map(item => notifyItemView(item)))
}

export function notify (msg, type) {
  if (!msg) return

  notifications.push({
    'message': msg,
    'type': type || 'info',
    'date': moment()
  })
}

export default {
  view: notifyView
}
