import m from 'mithril'
import moment from 'moment'
import { redirect } from '../helper/route'
import { notify } from '../app/notifier'

let baseUrl = 'api/budget'

function sortByDate (a, b) {
  let result = 0
  if (moment(a.date).isAfter(b.date)) {
    result = -1
  } else if (moment(a.date).isBefore(b.date)) {
    result = 1
  }
  return result
}

export function create () {
  return {
    type: 'spend',
    date: moment().format('YYYY-MM-DD')
  }
}

export function fetch (date) {
  let data = {}
  if (date) {
    data['by'] = {
      'date': date
    }
  }
  return m.request({
    method: 'GET',
    url: baseUrl,
    data: data,
    initialValue: []
  }).then(
    list => list.sort(sortByDate),
    error => {
      notify('404 - ' + error.message, 'error')
      return []
    }
  )
}

export function persist (item) {
  if (!item || !item.amount) {
    return false
  }

  let method = 'POST'
  let url = baseUrl
  if (item.id) {
    method = 'PUT'
    url += '/' + item.id
  }

  return m.request({
    method: method,
    url: url,
    data: item
  }).then(data => redirect())
}

export function remove (item) {
  if (!item || !item.id) {
    return
  }

  return m.request({
    method: 'DELETE',
    url: baseUrl + '/' + item.id
  }).then(data => redirect())
}

export default {
  create: create,
  fetch: fetch,
  persist: persist,
  remove: remove
}
