import m from 'mithril'
import moment from 'moment'
import { routeDate } from '../helper/route.js'
import { dateFormat } from './navigation.js'

export function budgetItemView (title, item, currentDate) {
  title = title || 'Unbekannt'

  let result = [m('span.title', title)]
  let attr = {}
  let itemClass = ''

  if (item) {
    if (item.id && currentDate) {
      attr.href = '/' + currentDate + '/' + item.id
      attr.config = m.route
    }

    switch (item.type) {
      case 'income':
        itemClass = '.green-text'
        break
      case 'spend':
        itemClass = '.red-text'
        break
      default:
        itemClass = '.black-text'
    }

    if (item.description) {
      result.push(m('span.description', item.description))
    }

    if (item.amount) {
      result.push(m('span.secondary-content.amount' + itemClass, item.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })))
    }
  }

  return m('a.collection-item.list-item' + itemClass, attr, result)
}

function total (list) {
  return list
    .map(item => (item.type === 'spend' ? -1 : 1) * parseFloat(item.amount))
    .reduce((prev, curr) => (prev || 0) + curr)
}

function listCtrl (args) {
  const date = routeDate()
  return {
    date: date,
    list: args.budget.filter(item => date === moment(item.date).format(dateFormat)),
    categoryName: function (id) {
      let title = 'Nicht definiert'
      let category = args.categories.find(c => c.id === id)
      if (category) {
        title = category.name
      }
      return title
    }
  }
}

function listView (ctrl) {
  let header
  if (!ctrl.list || ctrl.list.length <= 0) {
    return m('div.collection.with-header', [
      m('div.collection-header.center-align', ctrl.date),
      budgetItemView('Keine Einträge gefunden.')
    ])
  }

  var items = []
  ctrl.list.forEach(item => {
    if (!header || header !== item.date) {
      header = item.date
      items.push(m('div.collection-header', moment(header).format('DD.MM.YYYY')))
    }

    items.push(budgetItemView(ctrl.categoryName(item.category_id), item, ctrl.date))
  })

  return m('div.collection.with-header', [
    m('div.collection-header.center-align', ctrl.date),
    budgetItemView('Gesamt', { amount: total(ctrl.list) }),
    items
  ])
}

export default {
  controller: listCtrl,
  view: listView,
  itemView: budgetItemView
}
