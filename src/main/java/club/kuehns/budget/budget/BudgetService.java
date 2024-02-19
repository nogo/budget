package club.kuehns.budget.budget;

import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Service
public class BudgetService {
  private final BudgetRepository budgetRepository;

  public BudgetService(BudgetRepository budgetRepository) {
    this.budgetRepository = budgetRepository;
  }

  public Flux<Budget> stream() {
    return this.budgetRepository.findAll();
  }

  public Flux<Budget> stream(String dateFilter) {
    if (dateFilter == null || dateFilter.isEmpty()) {
      return Flux.empty();
    }

    try {
      YearMonth yearMonth = YearMonth.parse(dateFilter, DateTimeFormatter.ofPattern("yyyy-MM"));
      return this.budgetRepository.byDate(yearMonth.atDay(1));
    } catch (DateTimeParseException ex) {
      return Flux.empty();
    }
  }

  public Mono<Budget> add(BudgetItem item) {
    Budget budget = new Budget();
    budget.setAmount(item.amount());
    budget.setCategoryId(item.categoryId());
    budget.setType(item.convertToBudgetType().orElse(BudgetType.spend));
    budget.setDate(item.date().atTime(LocalTime.now()));
    budget.setDescription(item.description());
    return this.budgetRepository.save(budget);
  }

  public Mono<Budget> update(long id, BudgetItem item) {
    return this.budgetRepository
      .findById(id)
      .flatMap(budget -> {
        budget.setCategoryId(item.categoryId());
        budget.setAmount(item.amount());
        budget.setType(item.convertToBudgetType().orElse(BudgetType.spend));
        budget.setDate(item.date().atTime(LocalTime.now()));
        budget.setDescription(item.description());

        return this.budgetRepository.save(budget);
      })
      .switchIfEmpty(Mono.error(new ItemNotFoundException("Budget with ID " + id + " not found")))
      ;
  }

  public Mono<Void> remove(long id) {
    return this.budgetRepository.deleteById(id);
  }
}
