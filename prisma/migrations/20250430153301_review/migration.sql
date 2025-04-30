-- CreateView
CREATE VIEW review_years AS
SELECT 
    CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
    SUM(amount) AS total
FROM 
    transactions
GROUP BY 
    year
ORDER BY
    year DESC;

-- CreateView
CREATE VIEW review_months AS
SELECT 
    CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
    CAST(strftime('%m', date, 'unixepoch') as DECIMAL) AS month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
    SUM(amount) AS total
FROM 
    transactions
GROUP BY 
    year, month
ORDER BY
    year DESC, month DESC;