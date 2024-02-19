import m from 'mithril'
import moment from 'moment'

export const dateFormat = 'YYYY-MM'

export function nextMonth (date) {
  return moment(date, dateFormat)
    .startOf('month')
    .add(1, 'month')
    .format(dateFormat)
}

export function lastMonth (date) {
  return moment(date, dateFormat)
    .startOf('month')
    .subtract(1, 'month')
    .format(dateFormat)
}

export default function navigationView (date) {
  const next = nextMonth(date)
  const last = lastMonth(date)
  return m('.row', [
    m('.col.s6',
      m('a.btn.grey', { href: '/' + last, config: m.route }, [
        m('i.material-icons.left', 'arrow_back'), last
      ])),
    m('.col.s6.right-align',
      m('a.btn.grey', { href: '/' + next, config: m.route }, [
        m('i.material-icons.right', 'arrow_forward'), next
      ]))
  ])
}
