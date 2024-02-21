package club.kuehns.budget.budget;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Table("budget")
public class Budget {

  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  @Column("id")
  private Long id;

  @Column("category_id")
  private Long categoryId;

  @Column("type")
  private BudgetType type = BudgetType.spend;

  @Column("date")
  private LocalDateTime date;

  @Column("amount")
  private Double amount;

  @Column("special")
  private boolean special = false;

  @Column("description")
  private String description;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getCategoryId() {
    return categoryId;
  }

  public void setCategoryId(Long categoryId) {
    this.categoryId = categoryId;
  }

  public BudgetType getType() {
    return type;
  }

  public void setType(BudgetType type) {
    this.type = type;
  }

  public LocalDateTime getDate() {
    return date;
  }

  public void setDate(LocalDateTime date) {
    this.date = date;
  }

  public Double getAmount() {
    return amount;
  }

  public void setAmount(Double amount) {
    this.amount = amount;
  }

  public boolean isSpecial() {
    return special;
  }

  public void setSpecial(boolean special) {
    this.special = special;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }
}
