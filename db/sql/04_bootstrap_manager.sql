-- Key 3 — usuario Manager bootstrap (para poder entrar antes del import de planillas).
-- Correr DESPUÉS de run_all.sql. Cambia la clave luego.
-- Correo: alvaro.yavar@diageo.com  ·  Clave temporal: Diageo2026
insert into users (email, name, role, password_hash, active)
values ('alvaro.yavar@diageo.com', 'Álvaro Yávar', 'manager', '$2b$10$pq/.vAoi0klHZSOmkWIdmexlQSkHMbx//hUtzizRzX0p8KOLkyRI2', true)
on conflict (email) do update
  set password_hash = excluded.password_hash, name = excluded.name, role = 'manager', active = true;
