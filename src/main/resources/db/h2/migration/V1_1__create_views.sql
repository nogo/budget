CREATE VIEW budget_monthly as
SELECT FORMATDATETIME(date, 'yyyy-MM') as `month`, type, sum(amount) as amount
FROM budget
GROUP BY type, `month`;

CREATE VIEW review_monthly as
SELECT spend.`month`,
       COALESCE(income.amount, 0)                               as income,
       COALESCE(spend.amount, 0)                                as spend,
       (COALESCE(income.amount, 0) - COALESCE(spend.amount, 0)) as total
FROM budget_monthly as spend
       LEFT JOIN budget_monthly as income ON (spend.`month` = income.`month`)
WHERE spend.type = 'spend'
  AND income.type = 'income'
ORDER BY spend.`month` DESC;

CREATE VIEW budget_category_spend as
SELECT FORMATDATETIME(date, 'yyyy-MM') as `month`,
       category_id,
       amount                          as amount
FROM BUDGET
WHERE type = 'spend'
ORDER BY CATEGORY_ID, `month`;

CREATE VIEW budget_category_income as
SELECT FORMATDATETIME(date, 'yyyy-MM') as `month`,
       category_id,
       amount                          as amount
FROM BUDGET
WHERE type = 'income'
ORDER BY CATEGORY_ID, `month`;


CREATE VIEW budget_category_monthly_spend as
SELECT CONCAT(`month`, '_', category_id) as joiner,
       `month`,
       category_id,
       sum(amount)                       as amount
FROM budget_category_spend
GROUP BY `month`, category_id;

CREATE VIEW budget_category_monthly_income as
SELECT CONCAT(`month`, '_', category_id) as joiner,
       `month`,
       category_id,
       sum(amount)                       as amount
FROM budget_category_income
GROUP BY `month`, category_id;

CREATE VIEW review_category_monthly as
SELECT spend.`month`,
       spend.category_id,
       COALESCE(income.amount, 0)                               as income,
       COALESCE(spend.amount, 0)                                as spend,
       (COALESCE(income.amount, 0) - COALESCE(spend.amount, 0)) as total
FROM budget_category_monthly_spend as spend
       LEFT JOIN budget_category_monthly_income as income ON (spend.joiner = income.joiner)
ORDER BY spend.`month` DESC;
