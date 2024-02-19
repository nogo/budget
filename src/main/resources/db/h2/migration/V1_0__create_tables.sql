CREATE TABLE categories
(
  id               IDENTITY     NOT NULL PRIMARY KEY,
  name             varchar(255) NOT NULL,
  with_description BOOLEAN      NOT NULL DEFAULT FALSE,
  CONSTRAINT pk_categories PRIMARY KEY (id),
  CONSTRAINT uq_categories_name UNIQUE (name)
);

INSERT INTO CATEGORIES
VALUES (1, 'Bäcker', 0),
       (2, 'Mittag', 0),
       (3, 'Lebensmittel', 0),
       (4, 'Unterhaltung', 1),
       (5, 'Fahrtkosten', 1),
       (6, 'Kinder', 1),
       (7, 'sonstiges', 1),
       (8, 'Urlaub', 1),
       (9, 'Kleidung', 1),
       (10, 'Business', 1),
       (11, 'Krankheit', 1),
       (12, 'Haushalt', 1),
       (13, 'Versicherung', 1),
       (14, 'Telekom/Internet', 1),
       (15, 'Subscription', 1);

CREATE TABLE budget
(
  id          IDENTITY       NOT NULL PRIMARY KEY,
  category_id BIGINT                  DEFAULT NULL,
  type        varchar(255)   NOT NULL DEFAULT 'spend',
  date        datetime       NOT NULL,
  amount      decimal(15, 2) NOT NULL,
  special     BOOLEAN        NOT NULL DEFAULT FALSE,
  description varchar(255)            DEFAULT NULL,
  CONSTRAINT pk_budget PRIMARY KEY (id),
  CONSTRAINT fk_budget_id FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT ck_budget_type CHECK type in ('spend', 'income')
);
