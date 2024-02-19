package club.kuehns.budget.review;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api")
public class ReviewController {

  private final ReviewMonthlyRepository reviewMonthlyRepository;
  private final ReviewCategoryMonthlyRepository reviewCategoryMonthlyRepository;

  @Autowired
  public ReviewController(
    ReviewMonthlyRepository reviewMonthlyRepository,
    ReviewCategoryMonthlyRepository reviewCategoryMonthlyRepository
  ) {
    this.reviewMonthlyRepository = reviewMonthlyRepository;
    this.reviewCategoryMonthlyRepository = reviewCategoryMonthlyRepository;
  }

  @ResponseStatus(HttpStatus.OK)
  @GetMapping(value = "/review_monthly", produces = MediaType.APPLICATION_JSON_VALUE)
  Flux<ReviewMonthly> listReviewMonthly() {
    return this.reviewMonthlyRepository.findAll();
  }

  @ResponseStatus(HttpStatus.OK)
  @GetMapping(value = "/review_category_monthly", produces = MediaType.APPLICATION_JSON_VALUE)
  Flux<ReviewCategoryMonthly> listReviewCategoryMonthly() {
    return this.reviewCategoryMonthlyRepository.findAll();
  }
}
