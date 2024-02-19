import m from 'mithril'
import moment from 'moment'
import { redirect } from '../helper/route'
import { notify } from '../app/notifier'

let baseUrl = 'api/review_category_monthly'

function sortByDate (a, b) {
  let result = 0
  if (moment(a.date).isAfter(b.date)) {
    result = -1
  } else if (moment(a.date).isBefore(b.date)) {
    result = 1
  }
  return result
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

export default {
  fetch: fetch
}
