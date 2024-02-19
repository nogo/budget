package club.kuehns.budget.budget;

import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

import java.time.LocalDate;

public interface BudgetRepository extends ReactiveCrudRepository<Budget, Long> {

  @Query("SELECT b.* FROM Budget as b WHERE YEAR(b.date) = YEAR(:date) AND MONTH(b.date) = MONTH(:date)")
  Flux<Budget> byDate(@Param("date") LocalDate date);

}
