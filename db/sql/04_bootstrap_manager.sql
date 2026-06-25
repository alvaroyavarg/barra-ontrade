-- Key 3 — usuario Manager bootstrap (para poder entrar antes del import de planillas).
-- Correr DESPUÉS de run_all.sql. Cambia la clave luego.
-- Correo: alvaroyavarg@gmail.com  ·  Clave temporal: Key3-OnTrade-2026
insert into users (email, name, role, password_hash, active)
values ('alvaroyavarg@gmail.com', 'Álvaro (Manager)', 'manager', '$2b$10$0qNHaoyR/DYYka3qtclz3OcNvCQNjwA9dEFsRhKVhfwCVun5.rove', true)
on conflict (email) do update
  set password_hash = excluded.password_hash, role = 'manager', active = true;
