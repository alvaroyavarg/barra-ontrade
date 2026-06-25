-- Key 3 — seed del framework (config-driven). Correr DESPUÉS del schema.
-- Pilares, ítems, targets por tipo de cuenta, serves, SKU mínimos y settings.

/* ---------- pilares ---------- */
insert into pillars (key, name, description, weight, sort_order) values
  ('staff',      'Staff',      'El equipo del cliente vende mejor nuestras marcas', 30, 1),
  ('menu',       'Menú',       'Ganamos la carta. El foco del negocio',             40, 2),
  ('activacion', 'Activación', 'Activamos al consumidor en el punto de venta',      30, 3);

/* ---------- ítems ---------- */
insert into framework_items (pillar_id, key, label, description, question_type, weight, sort_order)
select p.id, v.key, v.label, v.descr, v.qtype::question_type, 1, v.sort
from (values
  ('staff',      'incentivos',             'Incentivos activos',          'Programa de incentivos vigente (mín. 1 por trimestre)', 'binary',  1),
  ('staff',      'capacitacion_comercial', 'Capacitación comercial',      'Cómo vender, first drink, upselling (la dicta el Walker)', 'binary', 2),
  ('staff',      'capacitacion_marca',     'Capacitación de marca (DBA)',  'Historia y producción de marca (agendada con DBA)',     'binary',  3),
  ('menu',       'share_of_menu',          'Share of menu',                '% de cocktails de autor con Diageo',                    'percent', 1),
  ('menu',       'primera_posicion',       'Primera posición (Top 3)',     'Top 3 cocktails de la carta son Diageo',                'binary',  2),
  ('menu',       'drink_strategy',         'Drink Strategy (4 serves)',    'Los 4 serves presentes en carta',                      'binary',  3),
  ('menu',       'precio_index',           'Índice de precio',             'Índice de precio del serve clave vs referencia',        'numeric', 4),
  ('activacion', 'participar_acciones',    'Participar en acciones',       'Participa en promociones / Happy Hour del cliente',     'binary',  1),
  ('activacion', 'popup_carta',            'Pop-Up en carta',              'Pop-Up presente en la carta',                          'binary',  2),
  ('activacion', 'menu_adaptado',          'Menú adaptado / Table Tent',   'Menú reducido (Reserve) o Table Tent (masivo)',         'binary',  3)
) as v(pillar_key, key, label, descr, qtype, sort)
join pillars p on p.key = v.pillar_key;

/* ---------- targets por tipo de cuenta ---------- */
-- target_value: share 60, precio_index 120; mandatory AACC: share, primera_posicion, drink_strategy.
insert into item_targets (item_id, account_type, applies, target_value, is_mandatory)
select i.id, t.acct::account_type, true, t.target, t.mand
from (values
  ('incentivos',             'estandar', null::numeric, false),
  ('incentivos',             'aacc',     null,          false),
  ('capacitacion_comercial', 'estandar', null,          false),
  ('capacitacion_comercial', 'aacc',     null,          false),
  ('capacitacion_marca',     'estandar', null,          false),
  ('capacitacion_marca',     'aacc',     null,          false),
  ('share_of_menu',          'estandar', 60,            false),
  ('share_of_menu',          'aacc',     60,            true),
  ('primera_posicion',       'estandar', null,          false),
  ('primera_posicion',       'aacc',     null,          true),
  ('drink_strategy',         'estandar', null,          false),
  ('drink_strategy',         'aacc',     null,          true),
  ('precio_index',           'estandar', 120,           false),
  ('precio_index',           'aacc',     120,           false),
  ('participar_acciones',    'estandar', null,          false),
  ('participar_acciones',    'aacc',     null,          false),
  ('popup_carta',            'estandar', null,          false),
  ('popup_carta',            'aacc',     null,          false),
  ('menu_adaptado',          'estandar', null,          false),
  ('menu_adaptado',          'aacc',     null,          false)
) as t(item_key, acct, target, mand)
join framework_items i on i.key = t.item_key;

/* ---------- drink strategy serves ---------- */
insert into serves (name, brand, reference_price_index, sort_order) values
  ('Whiscola',       'Johnnie Walker Red',   120, 1),
  ('Tanqueray G&T',  'Tanqueray',            null, 2),
  ('Paloma',         'Don Julio',            null, 3),
  ('JW Black Sour',  'Johnnie Walker Black', null, 4);

/* ---------- SKU mínimos (portfolio On Trade) ---------- */
insert into skus (name, brand, sort_order) values
  ('JW Red',              'Johnnie Walker', 1),
  ('JW Black',            'Johnnie Walker', 2),
  ('Tanqueray London Dry','Tanqueray',      3),
  ('Tanqueray Sevilla',   'Tanqueray',      4),
  ('Don Julio Blanco',    'Don Julio',      5),
  ('Don Julio Reposado',  'Don Julio',      6),
  ('Gordon''s London Dry','Gordon''s',      7),
  ('Baileys Original',    'Baileys',        8);

-- Estándar: solo los 3 mínimos obligatorios. AACC: portfolio completo.
insert into sku_requirements (sku_id, account_type, required)
select s.id, 'estandar'::account_type,
       (s.name in ('JW Red', 'JW Black', 'Tanqueray London Dry'))
from skus s;

insert into sku_requirements (sku_id, account_type, required)
select s.id, 'aacc'::account_type, true
from skus s;

/* ---------- settings (singleton) ---------- */
insert into settings (photo_required_per_item, allow_na) values (false, true);
