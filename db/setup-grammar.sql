-- Placement grammar ladder. One ladder per language; rows are keyed by (language, rung).
-- '___' in a prompt marks the blank. Options are stored in display order.
-- "I don't know" is not stored: the app adds it to every item and scores it as wrong.

DROP TABLE IF EXISTS grammar_options;
DROP TABLE IF EXISTS grammar_items;
DROP TABLE IF EXISTS grammar_rungs;

CREATE TABLE grammar_rungs (
  id                  INTEGER PRIMARY KEY,
  language            TEXT    NOT NULL,            -- ISO 639-1, e.g. 'es'
  rung                INTEGER NOT NULL,            -- 1 = easiest
  topic               TEXT    NOT NULL,            -- English
  cefr                TEXT    NOT NULL CHECK (cefr IN ('A1','A2','B1','B2')),  -- level reached by passing this rung
  speaking_path_start INTEGER NOT NULL DEFAULT 0,  -- 1 = where "I want to practice speaking" starts
  UNIQUE (language, rung)
);

CREATE TABLE grammar_items (
  id       INTEGER PRIMARY KEY,
  rung_id  INTEGER NOT NULL REFERENCES grammar_rungs (id),
  position INTEGER NOT NULL,
  prompt   TEXT    NOT NULL,
  UNIQUE (rung_id, position)
);

CREATE TABLE grammar_options (
  item_id    INTEGER NOT NULL REFERENCES grammar_items (id),
  position   INTEGER NOT NULL,
  text       TEXT    NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, position)
);

-- es

-- Rung 1: Present tense, regular -ar/-er/-ir
INSERT INTO grammar_rungs VALUES (1, 'es', 1, 'Present tense, regular -ar/-er/-ir', 'A1', 0);
INSERT INTO grammar_items VALUES (1, 1, 1, 'Nosotros ___ arroz.');
INSERT INTO grammar_options VALUES (1, 1, 'cocinan', 0), (1, 2, 'cocinamos', 1), (1, 3, 'cocinas', 0), (1, 4, 'cocino', 0);
INSERT INTO grammar_items VALUES (2, 1, 2, 'Ella ___ en Madrid.');
INSERT INTO grammar_options VALUES (2, 1, 'vive', 1), (2, 2, 'vivo', 0), (2, 3, 'vives', 0), (2, 4, 'viven', 0);
INSERT INTO grammar_items VALUES (3, 1, 3, 'Yo ___ un libro cada semana.');
INSERT INTO grammar_options VALUES (3, 1, 'lee', 0), (3, 2, 'lees', 0), (3, 3, 'leemos', 0), (3, 4, 'leo', 1);

-- Rung 2: ser vs. estar
INSERT INTO grammar_rungs VALUES (2, 'es', 2, 'ser vs. estar', 'A1', 0);
INSERT INTO grammar_items VALUES (4, 2, 1, 'Mi hermana ___ cansada hoy.');
INSERT INTO grammar_options VALUES (4, 1, 'es', 0), (4, 2, 'está', 1), (4, 3, 'estoy', 0), (4, 4, 'son', 0);
INSERT INTO grammar_items VALUES (5, 2, 2, 'Nosotros ___ de México.');
INSERT INTO grammar_options VALUES (5, 1, 'estamos', 0), (5, 2, 'son', 0), (5, 3, 'somos', 1), (5, 4, 'están', 0);
INSERT INTO grammar_items VALUES (6, 2, 3, 'El café ___ en la mesa.');
INSERT INTO grammar_options VALUES (6, 1, 'está', 1), (6, 2, 'es', 0), (6, 3, 'son', 0), (6, 4, 'estás', 0);

-- Rung 3: Present tense, irregular and stem-changing
INSERT INTO grammar_rungs VALUES (3, 'es', 3, 'Present tense, irregular and stem-changing', 'A2', 0);
INSERT INTO grammar_items VALUES (7, 3, 1, 'Yo no ___ la respuesta.');
INSERT INTO grammar_options VALUES (7, 1, 'sabo', 0), (7, 2, 'sé', 1), (7, 3, 'sabe', 0), (7, 4, 'sabes', 0);
INSERT INTO grammar_items VALUES (8, 3, 2, 'Ellos ___ a casa a las ocho.');
INSERT INTO grammar_options VALUES (8, 1, 'volven', 0), (8, 2, 'vuelvo', 0), (8, 3, 'volvemos', 0), (8, 4, 'vuelven', 1);
INSERT INTO grammar_items VALUES (9, 3, 3, '¿Tú ___ ir al cine?');
INSERT INTO grammar_options VALUES (9, 1, 'quieres', 1), (9, 2, 'queres', 0), (9, 3, 'quiere', 0), (9, 4, 'quieren', 0);

-- Rung 4: Near future: ir a + infinitive
INSERT INTO grammar_rungs VALUES (4, 'es', 4, 'Near future: ir a + infinitive', 'A2', 0);
INSERT INTO grammar_items VALUES (10, 4, 1, 'Mañana yo ___ estudiar.');
INSERT INTO grammar_options VALUES (10, 1, 'vas a', 0), (10, 2, 'voy a', 1), (10, 3, 'voy', 0), (10, 4, 'ir a', 0);
INSERT INTO grammar_items VALUES (11, 4, 2, 'Ellos ___ comer pizza esta noche.');
INSERT INTO grammar_options VALUES (11, 1, 'va a', 0), (11, 2, 'van', 0), (11, 3, 'van a', 1), (11, 4, 'vamos a', 0);
INSERT INTO grammar_items VALUES (12, 4, 3, '¿Qué ___ hacer tú el sábado?');
INSERT INTO grammar_options VALUES (12, 1, 'vas a', 1), (12, 2, 'va a', 0), (12, 3, 'voy a', 0), (12, 4, 'vas', 0);

-- Rung 5: gustar and object pronouns
INSERT INTO grammar_rungs VALUES (5, 'es', 5, 'gustar and object pronouns', 'B1', 1);
INSERT INTO grammar_items VALUES (13, 5, 1, 'A ellos ___ gusta el café.');
INSERT INTO grammar_options VALUES (13, 1, 'le', 0), (13, 2, 'los', 0), (13, 3, 'se', 0), (13, 4, 'les', 1);
INSERT INTO grammar_items VALUES (14, 5, 2, 'A mí me ___ las manzanas.');
INSERT INTO grammar_options VALUES (14, 1, 'gusta', 0), (14, 2, 'gustan', 1), (14, 3, 'gusto', 0), (14, 4, 'gustas', 0);
INSERT INTO grammar_items VALUES (15, 5, 3, '¿Ves a María? Sí, ___ veo todos los días.');
INSERT INTO grammar_options VALUES (15, 1, 'la', 1), (15, 2, 'le', 0), (15, 3, 'lo', 0), (15, 4, 'me', 0);

-- Rung 6: Preterite
INSERT INTO grammar_rungs VALUES (6, 'es', 6, 'Preterite', 'B1', 0);
INSERT INTO grammar_items VALUES (16, 6, 1, 'Ayer nosotros ___ al cine y vimos una película.');
INSERT INTO grammar_options VALUES (16, 1, 'fueron', 0), (16, 2, 'vamos', 0), (16, 3, 'fuimos', 1), (16, 4, 'iremos', 0);
INSERT INTO grammar_items VALUES (17, 6, 2, 'El año pasado yo ___ a Madrid.');
INSERT INTO grammar_options VALUES (17, 1, 'viajé', 1), (17, 2, 'viajo', 0), (17, 3, 'viajaré', 0), (17, 4, 'viajó', 0);
INSERT INTO grammar_items VALUES (18, 6, 3, 'Anoche ellos no ___ la cena.');
INSERT INTO grammar_options VALUES (18, 1, 'comen', 0), (18, 2, 'comimos', 0), (18, 3, 'comerán', 0), (18, 4, 'comieron', 1);

-- Rung 7: Preterite vs. imperfect
INSERT INTO grammar_rungs VALUES (7, 'es', 7, 'Preterite vs. imperfect', 'B2', 0);
INSERT INTO grammar_items VALUES (19, 7, 1, 'Cuando era niño, ___ en el parque todos los días.');
INSERT INTO grammar_options VALUES (19, 1, 'jugué', 0), (19, 2, 'jugaba', 1), (19, 3, 'juego', 0), (19, 4, 'jugaré', 0);
INSERT INTO grammar_items VALUES (20, 7, 2, 'Ayer, mientras yo ___, sonó el teléfono.');
INSERT INTO grammar_options VALUES (20, 1, 'dormí', 0), (20, 2, 'duermo', 0), (20, 3, 'dormía', 1), (20, 4, 'dormiré', 0);
INSERT INTO grammar_items VALUES (21, 7, 3, 'Anoche ella ___ una carta y después se acostó.');
INSERT INTO grammar_options VALUES (21, 1, 'escribió', 1), (21, 2, 'escribía', 0), (21, 3, 'escribe', 0), (21, 4, 'escribirá', 0);

-- Rung 8: Present subjunctive
INSERT INTO grammar_rungs VALUES (8, 'es', 8, 'Present subjunctive', 'B2', 0);
INSERT INTO grammar_items VALUES (22, 8, 1, 'Quiero que tú ___ mañana.');
INSERT INTO grammar_options VALUES (22, 1, 'vienes', 0), (22, 2, 'vendrás', 0), (22, 3, 'venir', 0), (22, 4, 'vengas', 1);
INSERT INTO grammar_items VALUES (23, 8, 2, 'Es importante que nosotros ___ temprano.');
INSERT INTO grammar_options VALUES (23, 1, 'llegamos', 0), (23, 2, 'lleguemos', 1), (23, 3, 'llegar', 0), (23, 4, 'llegaremos', 0);
INSERT INTO grammar_items VALUES (24, 8, 3, 'Espero que ellos ___ bien.');
INSERT INTO grammar_options VALUES (24, 1, 'están', 0), (24, 2, 'estar', 0), (24, 3, 'estén', 1), (24, 4, 'estarán', 0);
