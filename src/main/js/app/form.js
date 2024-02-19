import m from 'mithril'
import moment from 'moment'
import budget from '../api/budget.js'
import { routeId } from '../helper/route.js'

function formDescription (budgetItem, category) {
  if (!category || !category.with_description || category.with_description !== 1) {
    return ''
  }

  return m('.row',
    m('.col.s12', [
      m('label', { for: 'description' }, 'Beschreibung'),
      m('input#description.text-input', {
        type: 'text',
        name: 'description',
        placeholder: 'Bemerkung',
        oninput: m.withAttr('value', (value) => { budgetItem.description = value }),
        value: (budgetItem && budgetItem.description) ? budgetItem.description : ''
      })
    ])
  )
}

function formDeleteButton (budgetItem) {
  if (!budgetItem || !budgetItem.id) {
    return ''
  }

  return m('button.btn-floating.btn-large.red', {
    onclick: (e) => {
      if (e) e.preventDefault()
      return budget.remove(budgetItem)
    }
  }, m('i.large.material-icons', 'delete'))
}

function formCtrl (args) {
  const currentId = routeId()
  let scope = {}

  scope.findCategory = function (id) {
    return args.categories.find(item => item.id === id)
  }

  scope.budgetItem = args.budget.find(item => item.id === currentId)
  if (!scope.budgetItem) {
    scope.budgetItem = budget.create()
    if (args.categories && args.categories[0]) {
      scope.budgetItem.category_id = args.categories[0].id
    }
  }

  const category = scope.findCategory(scope.budgetItem.category_id)

  scope.categoryOptions = args.categories.map(item => {
    let attr = { value: item.id }
    if (category && item.id === category.id) {
      attr.selected = 'selected'
    }
    return m('option', attr, item.name)
  })

  scope.save = function (e) {
    if (e) e.preventDefault()

    budget.persist(scope.budgetItem)
    return true
  }
  return scope
}

function formView (ctrl) {
  return m('div.row.card-panel',
    m('form.col.s12', { onsubmit: ctrl.save }, [
      m('div.row',
        m('.col.s12', [
          m('label', { for: 'amount' }, 'Betrag'),
          m('input#amount', {
            type: 'number',
            name: 'amount',
            placeholder: 'Wie ist der Betrag?',
            autofocus: '',
            required: '',
            step: 0.01,
            min: 0,
            onchange: m.withAttr('value', (value) => { ctrl.budgetItem.amount = parseFloat(value, 10) }),
            value: ctrl.budgetItem.amount ? ctrl.budgetItem.amount : ''
          })
        ])
      ),
      m('div.row', m('.col.s12', [
        m('label', { for: 'category' }, 'Kategorie'),
        m('select#category.browser-default', {
          name: 'category_id',
          onchange: (e) => {
            if (e) e.preventDefault()
            ctrl.budgetItem.category_id = parseInt(e.target.value, 10)
            return false
          }
        }, ctrl.categoryOptions)
      ])),
      formDescription(ctrl.budgetItem, ctrl.findCategory(ctrl.budgetItem.category_id)),
      m('div.row',
        m('.col.s12', [
          m('label', { for: 'date' }, 'Datum'),
          m('input#date', {
            type: 'date',
            name: 'date',
            onchange: m.withAttr('value', (value) => { ctrl.budgetItem.date = moment(value).format('YYYY-MM-DD') }),
            value: moment(ctrl.budgetItem.date).format('YYYY-MM-DD')
          })
        ])
      ),
      m('.row', [
        m('.col.s6', [
          m('input#type-spend', {
            type: 'radio',
            name: 'type',
            value: 'spend',
            onchange: m.withAttr('value', (value) => { ctrl.budgetItem.type = value }),
            checked: (ctrl.budgetItem.type === 'spend')
          }),
          m('label', { for: 'type-spend' }, 'Ausgabe')
        ]),
        m('.col.s6', [
          m('input#type-income', {
            type: 'radio',
            name: 'type',
            value: 'income',
            onchange: m.withAttr('value', (value) => { ctrl.budgetItem.type = value }),
            checked: (ctrl.budgetItem.type === 'income')
          }),
          m('label', { for: 'type-income' }, 'Einnahme')
        ])
      ]),
      m('div', [
        formDeleteButton(ctrl.budgetItem),
        m('.right', m('button.btn-floating.btn-large.green', { type: 'submit' }, m('i.large.material-icons', 'done')))
      ])
    ])
  )
}

export default {
  controller: formCtrl,
  view: formView
}
