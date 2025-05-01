-- DropView
DROP VIEW review_years;

-- CreateView
CREATE VIEW review_years AS
SELECT 
    CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total
FROM 
    transactions
GROUP BY 
    year
ORDER BY
    year DESC;

-- DropView
DROP VIEW review_months;

-- CreateView
CREATE VIEW review_months AS
SELECT 
    CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
    CAST(strftime('%m', date, 'unixepoch') as DECIMAL) AS month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total
FROM 
    transactions
GROUP BY 
    year, month
ORDER BY
    year DESC, month DESC;

-- CreateView
CREATE VIEW review_category_months AS
SELECT 
    CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
    CAST(strftime('%m', date, 'unixepoch') as DECIMAL) AS month,
    categories.name AS category_name,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total
FROM 
    transactions
    LEFT JOIN categories ON transactions.category_id = categories.id
GROUP BY 
    year, month, category_id
ORDER BY
    year DESC, month DESC