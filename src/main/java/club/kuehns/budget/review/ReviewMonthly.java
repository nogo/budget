package club.kuehns.budget.review;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import org.springframework.data.relational.core.mapping.Table;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Table(name = "review_monthly")
record ReviewMonthly(String month, double income, double spend, double total) {

}
