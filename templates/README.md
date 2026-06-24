# Carga de datos reales — Key 3

Llena estas planillas con la data real y me las pasas (commiteadas o pegadas en el chat).
Con eso cargo la base. **No usamos datos de prueba.**

## Archivos
- `usuarios.csv` — usuarios (Walkers y Manager)
- `clientes.csv` — cuentas (bares / restaurantes)

Las **rutas** se crean solas a partir de la columna `ruta`. No hay que cargarlas aparte.

---

## usuarios.csv

| columna | obligatorio | valores | nota |
|---|---|---|---|
| `nombre` | sí | texto | nombre completo |
| `email` | sí | email único | es el login |
| `rol` | sí | `walker` / `manager` | el Manager ve todo + administra |
| `ruta` | walker: sí | texto | debe calzar con la ruta de sus clientes |
| `password_inicial` | no | texto | si lo dejas vacío, genero una y se cambia al primer ingreso |

> Incluye al menos **un `manager`** (puede ser tu correo) para poder entrar y administrar.

Ejemplo:
```csv
nombre,email,rol,ruta,password_inicial
Rodrigo Soto,rodrigo@ejemplo.cl,manager,,
Camila Vega,camila@ejemplo.cl,walker,Providencia,
```

---

## clientes.csv

| columna | obligatorio | valores | nota |
|---|---|---|---|
| `nombre` | sí | texto | nombre de la cuenta |
| `direccion` | no | texto | |
| `comuna` | no | texto | |
| `ruta` | sí | texto | agrupa la cartera del walker |
| `tipo_cuenta` | sí | `estandar` / `aacc` | **viene predefinido; el Walker nunca lo edita** |
| `reserve` | no | `si` / `no` | cuenta Reserve → menú adaptado |
| `walker_email` | sí | email | a qué walker se asigna (debe existir en `usuarios.csv`) |
| `contrato` | no | texto | datos de contrato / notas |

Ejemplo:
```csv
nombre,direccion,comuna,ruta,tipo_cuenta,reserve,walker_email,contrato
Siete Negronis,Merced 142,Providencia,Providencia,aacc,no,camila@ejemplo.cl,
Flannery's,Encomenderos 83,Las Condes,Providencia,estandar,no,camila@ejemplo.cl,
```

---

## Cómo enviarlas
- Edítalas en Excel / Google Sheets y exporta como **CSV (UTF-8)**, o
- Pégalas directo en el chat y yo las cargo.

Cuando las tenga, corro la importación y queda la data real lista.
