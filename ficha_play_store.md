# Drunkolution — Ficha de Play Store y lista de lanzamiento (prueba cerrada)

## 1. Textos de la ficha (copiar y pegar)

**Nombre de la app (29/30):**
Drunkolution: The Drunken Ape

**Descripción corta (71/80):**
Un mono viaja por la historia sin soltar la fruta. Humor, jefes y caos.

**Descripción completa:**
🐵🍌 ¿Y si la historia de la humanidad fuera culpa de un mono con debilidad por la fruta fermentada?

Drunkolution es un juego de saltos infinitos, caricaturesco y muy gracioso, inspirado en la «hipótesis del mono borracho» del biólogo Robert Dudley. Ciencia dudosa, comedia garantizada.

✨ QUÉ TE ESPERA
• Elige mono o mona y sube por la historia: Prehistoria, Edad de Hielo, Mesopotamia, Antiguo Egipto, China, Grecia, Roma, Vikingos, Edad Media, Renacimiento, Piratas y más épocas en las próximas actualizaciones.
• Un jefe al final de cada época, cada vez más difícil. Pisa su cabeza cuando quede aturdido.
• Seis estados de ebriedad cómicos: de sobrio a blackout, con visión borrosa, hipo y controles al revés.
• Frutas con nombre y chiste, trajes de época para tu mono y obstáculos distintos en cada era.
• Criaturas que sirven de plataforma, hongos trampolín y saltos dobles con fruta fresca.
• Logros secretos, frases absurdas y comentarios del mono que cambian en cada partida.
• 3 vidas, puntos de reinicio por época y revancha contra el jefe.
• Funciona sin conexión.

⚠️ AVISO DE CONTENIDO
Comedia caricaturesca con referencias humorísticas a la fruta fermentada y al alcohol. No fomenta su consumo. No recomendado para menores de 13 años.

🧪 VERSIÓN DE PRUEBA
Estás probando una de las primeras versiones. Tus comentarios nos ayudan a mejorar el juego.

**English (optional) — Short:** A monkey travels through history and never lets go of the fruit.

---

## 2. Archivos gráficos
- Ícono: `icono_512.png` (512×512)
- Gráfico de funciones: `grafico_de_funciones_1024x500.png`
- Capturas de pantalla: **toma 4 a 8 desde tu teléfono** (mínimo 2). Sugeridas: intro, elegir mono/mona, partida, un jefe, el blackout y el vómito, cambio de época.

## 3. Política de privacidad
- Archivo: `privacy.html` (ya está en el paquete).
- Cuando lo publiques en GitHub Pages, la URL será: `https://artjmarcos.github.io/Drunkolution/privacy.html`
- Pégala en Play Console → Contenido de la app → Política de privacidad.
- Si quieres, agrega un correo de contacto en ese archivo además de Instagram.

## 4. Declaraciones de contenido (Play Console → Contenido de la app)
- **Anuncios:** No contiene anuncios (en esta versión).
- **Acceso a la app:** Todo el contenido es accesible sin cuenta.
- **Público objetivo:** mi recomendación es 13 años o más (no incluir menores de 13 por el tema del alcohol).
- **Clasificación de contenido (cuestionario IARC):** responde con honestidad. Marca referencias a alcohol (caricaturescas) y violencia de dibujos animados leve (proyectiles, pisar al jefe). No hay apuestas, ni contenido generado por usuarios, ni ubicación. La calificación final la decide el cuestionario.
- **Seguridad de los datos:** no se recopilan ni comparten datos; no hay cuenta, análisis ni SDK de terceros. Si más adelante agregas anuncios o compras, hay que actualizar esta sección y la política.
- **Categoría:** Juegos → Arcade (o Casual). **Gratis.**

## 5. Pasos para publicar (en orden)
1. **GitHub:** repositorio público `Drunkolution` → sube los 8 archivos del paquete, todos en la raíz → Settings → Pages → rama `main`, carpeta raíz.
2. **Comprobar el PWA:** abre `https://artjmarcos.github.io/Drunkolution/` en Chrome del teléfono → menú → Instalar app. Revisa que abra a pantalla completa y sin conexión.
3. **PWABuilder:** pega la URL → Package for stores → Google Play. Datos sugeridos:
   - Package ID: `com.artejmarcos.drunkolution`
   - App name: Drunkolution: The Drunken Ape · Launcher name: Drunkolution
   - Version: 1.0.0 · Version code: 1
   - Orientación: vertical · Facturación de Google Play: desactivada
   - Clave de firma: crear nueva y **guardar el archivo y las contraseñas**.
4. **assetlinks.json:** comparten dominio con Mahjong, así que es **un solo archivo** con **dos entradas**. No lo reemplaces, agrégale esta (o la plantilla completa de abajo):
   - Debe quedar en `https://artjmarcos.github.io/.well-known/assetlinks.json`
   - En el repo `artjmarcos.github.io` agrega `.nojekyll` o `include: [.well-known]` en `_config.yml`.
   - Después de subir el `.aab`, copia la huella SHA-256 de Play Console → Configuración → Integridad de la app y pégala.
5. **Play Console:** crea la app → rellena ficha y declaraciones → Pruebas → Prueba cerrada → crea la pista, agrega testers (lista de correos o grupo de Google) → sube el `.aab` → envía a revisión.
6. **Testers:** manda el enlace de participación. Si la cuenta lo exige, 12 testers deben quedarse 14 días seguidos. Pídeles comentarios.
7. **Actualizaciones:** para sumar épocas o arreglos, sube el `index.html` nuevo a GitHub y cambia `drunkolution-v2` por `v3` en `sw.js`. No hace falta un nuevo `.aab`, salvo cambios nativos.

### Plantilla de assetlinks.json (dos apps)
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "PAQUETE_DE_MAHJONG",
      "sha256_cert_fingerprints": ["HUELLA_MAHJONG"]
    }
  },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.artejmarcos.drunkolution",
      "sha256_cert_fingerprints": ["HUELLA_DRUNKOLUTION"]
    }
  }
]
```

## 6. Antes de subir: revisión rápida
- [ ] El link carga y la intro sale.
- [ ] Se puede instalar y abre a pantalla completa.
- [ ] Funciona sin internet después de la primera carga.
- [ ] Jugaste hasta un jefe y pudiste derrotarlo.
- [ ] La política de privacidad abre en su URL.
- [ ] Guardaste la clave de firma y las contraseñas.
