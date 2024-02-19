import m from 'mithril'
import moment from 'moment'

function parameters () {
  const parameter = m.route.param('param')
  return (parameter) ? parameter.match(/(\d{4}\-\d{2})?\/?(\d+)?/) : []
}

export function routeId () {
  const match = parameters()
  return match[2] ? parseInt(match[2], 10) : 0
}

export function routeDate () {
  const match = parameters()
  return match[1] ? match[1] : moment().format('YYYY-MM')
}

export function routeYear (year) {
  return year && year.match(/(\d{4})/) ? year : moment().format('YYYY')
}

export function redirect () {
  const match = parameters()

  if (match[1]) {
    m.route('/' + match[1])
  } else {
    m.route('/')
  }
}
