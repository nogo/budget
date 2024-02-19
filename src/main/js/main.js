import m from 'mithril'
import categories from './api/categories.js'
import budget from './api/budget.js'
import formComponent from './app/form.js'
import budgetComponent from './app/list.js'
import notiferComponent from './app/notifier.js'
import reviewComponent from './app/review.js'
import reviewCategoryComponent from './app/review_category.js'
import navigation from './app/navigation.js'
import { routeDate } from './helper/route.js'

const mainComponent = {
  controller: function () {
    this.categoryList = categories.fetch()
    this.budgetList = budget.fetch(routeDate())
  },
  view: function (ctrl) {
    return m('div.row', [
      m('div.col.s12.m5.l4',
        m.component(formComponent, {
          budget: ctrl.budgetList(),
          categories: ctrl.categoryList()
        })
      ),
      m('div.col.s12.m7.l8', [
        m.component(notiferComponent),
        m.component(budgetComponent, {
          budget: ctrl.budgetList(),
          categories: ctrl.categoryList()
        }),
        navigation(routeDate())
      ])
    ])
  }
}

m.route.mode = 'hash'
m.route(document.getElementById('app'), '/', {
  '/': mainComponent,
  '/review': reviewComponent,
  '/review/categories': reviewCategoryComponent,
  '/review/:year/categories': reviewCategoryComponent,
  '/:param...': mainComponent
})
