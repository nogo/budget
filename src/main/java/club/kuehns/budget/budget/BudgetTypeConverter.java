package club.kuehns.budget.budget;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BudgetTypeConverter implements AttributeConverter<BudgetType, String> {
  @Override
  public String convertToDatabaseColumn(BudgetType attribute) {
    if (attribute == null) return null;

    return attribute.name().toLowerCase();
  }

  @Override
  public BudgetType convertToEntityAttribute(String dbData) {
    if (dbData == null) return null;

    return BudgetType.spend;
  }
}
