package club.kuehns.budget.category;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

  private final CategoryRepository categoryRepository;

  @Autowired
  public CategoryController(CategoryRepository categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
  Flux<CategoryItem> listCategories() {
    return this.categoryRepository
      .findAll()
      .map(c -> new CategoryItem(c.getId(), c.getName(), c.isWithDescription() ? 1 : 0))
      ;
  }

}
