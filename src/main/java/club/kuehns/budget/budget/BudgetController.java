package club.kuehns.budget.budget;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {

  private final BudgetService budgetService;

  @Autowired
  public BudgetController(BudgetService budgetService) {
    this.budgetService = budgetService;
  }

  @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
  Flux<Budget> list(@RequestParam(value = "by[date]", required = false) String date) {
    return this.budgetService.stream(date);
  }

  @ResponseStatus(HttpStatus.CREATED)
  @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
  Mono<Budget> create(@RequestBody BudgetItem budgetItem) {
    return this.budgetService.add(budgetItem);
  }

  @PutMapping(value ="/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
  Mono<ResponseEntity<Budget>> update(@PathVariable long id, @RequestBody BudgetItem budgetItem) {
   return this.budgetService
     .update(id, budgetItem)
     .map(ResponseEntity.ok()::body)
     .defaultIfEmpty(ResponseEntity.notFound().build())
     ;
  }

  @DeleteMapping(value ="/{id}")
  Mono<ResponseEntity<Void>> remove(@PathVariable long id) {
    return this.budgetService.remove(id)
      .then(Mono.just(ResponseEntity.ok().<Void>build()))
      .onErrorResume(e -> e instanceof ItemNotFoundException, e -> Mono.just(ResponseEntity.notFound().build()))
      ;
  }

}
