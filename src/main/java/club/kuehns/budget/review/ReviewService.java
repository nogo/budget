package club.kuehns.budget.review;

import club.kuehns.budget.budget.BudgetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ReviewService {

  private final BudgetRepository budgetRepository;

  @Autowired
  public ReviewService(BudgetRepository budgetRepository) {
    this.budgetRepository = budgetRepository;
  }

//  public Flux<ReviewCategoryMonthly> reviewCategoryMonthly() {
//
//
//    this.budgetRepository
//      .findAll()
//      .mapNotNull()
//      .toStream()
//      .
//
//  }

}
