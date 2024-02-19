package club.kuehns.budget.category;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Table("categories")
public class Category {

  @Id
  @Column("id")
  private Long id;

  @Column("name")
  private String name;

  @Column("with_description")
  private boolean withDescription = false;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public boolean isWithDescription() {
    return withDescription;
  }

  public void setWithDescription(boolean withDescription) {
    this.withDescription = withDescription;
  }
}
