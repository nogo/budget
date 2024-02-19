package club.kuehns.budget.budget;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

  @Mock
  private BudgetRepository budgetRepository;

  @InjectMocks
  private BudgetService budgetService;

  @Test
  public void testUpdateBudget() {
//    String existingBudgetId = "existingId";
//    Budget existingBudget = new Budget(existingBudgetId, "Alice", 30);
//
//    Budget updatedBudget = new Budget(existingBudgetId, "Alice Updated", 35);
//
//    when(budgetRepository.findById(existingBudgetId)).thenReturn(Mono.just(existingBudget));
//    when(budgetRepository.save(existingBudget)).thenReturn(Mono.just(updatedBudget));
//
//    StepVerifier.create(budgetService.update(existingBudgetId, updatedBudget))
//      .expectNextMatches(budget -> budget.getName().equals("Alice Updated") && budget.getAge() == 35)
//      .verifyComplete();
//
//    verify(budgetRepository, times(1)).findById(existingBudgetId);
//    verify(budgetRepository, times(1)).save(existingBudget);
  }

  @Test
  public void testDeleteBudget() {
    long existingBudgetId = 1;

    when(budgetRepository.deleteById(existingBudgetId)).thenReturn(Mono.empty());

    StepVerifier.create(budgetService.remove(existingBudgetId)).verifyComplete();

    verify(budgetRepository, times(1)).deleteById(existingBudgetId);
  }

}