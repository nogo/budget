-- CreateView: Optimized view for yearly data with categories
CREATE VIEW review_years_with_categories AS
SELECT 
    CAST(strftime('%Y', t.date, 'unixepoch') as DECIMAL) AS year,
    COALESCE(t.category_id, 0) AS category_id,
    c.name as category_name,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS total
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY year, COALESCE(t.category_id, 0), c.name
ORDER BY year DESC, c.name;

-- CreateView: Optimized view for monthly data with categories
CREATE VIEW review_months_with_categories AS
SELECT 
    CAST(strftime('%Y', t.date, 'unixepoch') as DECIMAL) AS year,
    CAST(strftime('%m', t.date, 'unixepoch') as DECIMAL) AS month,
    COALESCE(t.category_id, 0) AS category_id,
    c.name as category_name,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS total
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY year, month, COALESCE(t.category_id, 0), c.name
ORDER BY year DESC, month DESC, c.name;