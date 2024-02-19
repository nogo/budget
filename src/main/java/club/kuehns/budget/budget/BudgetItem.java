package club.kuehns.budget.budget;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.LocalDate;
import java.util.Optional;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record BudgetItem(Long id, double amount, long categoryId, LocalDate date, String type, String description) {

  Optional<BudgetType> convertToBudgetType() {
    try {
      return Optional.of(BudgetType.valueOf(type));
    } catch (IllegalArgumentException ex) {
      return Optional.empty();
    }
  }
}
