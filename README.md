# Colonia de hormigas · orden emergente

Simulación de hormigas que, siguiendo cada una **reglas locales muy simples y sin
ningún conocimiento del mapa**, encuentran la comida sorteando un muro y un terreno
lento, y **optimizan la ruta más rápida** hacia ella. La ruta no la decide nadie:
**emerge** del refuerzo colectivo de feromonas.

Es un sistema agente-a-agente en mundo continuo, de la familia de los foraging
clásicos (estilo Sebastian Lague): dos feromonas, depósito decreciente, evaporación.

![captura](screenshot.png)

## Cómo ejecutar

Abre `index.html` en el navegador. No necesita servidor ni dependencias.

```
xdg-open index.html
```

## La escena

- **Nido** a la izquierda, **comida** a la derecha.
- Un **muro** en medio: hay que rodearlo por arriba o por abajo.
- El rodeo de **arriba es terreno lento (barro)**; el de **abajo es rápido**. Miden
  casi lo mismo, pero la colonia converge al de abajo: optimiza por **velocidad**.

Puedes pintar muros, barro y comida con el ratón y ver cómo re-optimiza en vivo.

## El modelo (reglas locales, nada global)

Dos feromonas y hormigas "tontas" que solo huelen y andan:

- **Dos rastros**: `toFood` (lo dejan las que vuelven con comida) y `toHome` (lo dejan
  las que salen del nido). Cada hormiga **huele solo el de su meta** e ignora el otro:
  la exploradora sigue `toFood` hacia la comida, la cargada sigue `toHome` hacia casa.
  Va hacia donde **más huele**, con 3 antenas de radio amplio.

- **Carga decreciente (estilo Lague)**: cada hormiga arranca con una "carga" llena al
  salir del nido o al coger comida, y **deposita menos en cada paso** según se gasta.
  Eso crea el **gradiente** (el rastro es más fuerte cerca de su origen), que es lo que
  le da el sentido al seguir "lo más fuerte". El depósito se escala por la velocidad,
  así el barro no acumula de más solo por dar más pasos.

- **El muro tapa el olfato**: una antena cuyo camino cruza un muro no detecta nada, así
  que el radio amplio sirve para atajar curvas en abierto pero nunca a través del muro.

- **Olfato local de la meta**: si la cargada **ve el nido** de cerca (o la exploradora
  **ve la comida**), va directa, por encima de las feromonas. Evita que se queden dando
  vueltas pegadas a casa o a la comida.

- **Repulsión de las exploradoras al rastro a casa**: se apartan un poco del `toHome`,
  lo que las empuja a explorar hacia afuera (y hace que el rastro arranque fiable).

- **Evaporación + difusión**: el `toFood` evapora rápido (la ruta lenta se desvanece y
  solo sobrevive la que se repinta mucho, la rápida) y el `toHome` lento (persiste, así
  las cargadas siempre tienen camino de vuelta). Las hormigas se sueltan **poco a poco**
  (no en oleada), para un flujo continuo y un rastro estable.

Por qué emerge la ruta rápida: se recorre más veces por minuto, recibe más feromona
antes de evaporarse y se refuerza; la lenta se repasa menos y se apaga. Bola de nieve.

## Validación

`headless-test.js` ejecuta el **mismo `core.js`** sin navegador y mide a lo largo del
tiempo la feromona en el rodeo lento (arriba) frente al rápido (abajo):

```
node headless-test.js
```

Resultado típico: la colonia converge a la **ruta rápida (~99%)** de forma consistente,
con rastro fuerte y estable y entregas sostenidas.

## Archivos

- `core.js` — toda la simulación (sin DOM). Se usa igual en el navegador y en el test.
- `sim.js` — render en canvas (rastro a comida en verde, a casa en azul) e interfaz.
- `index.html` / `style.css` — página y estilos.
- `headless-test.js` — validación por línea de comandos.

## Nota

Como en las colonias reales, hay algo de azar (ruptura de simetría). La asimetría de
terreno inclina la balanza hacia la ruta rápida de forma fiable, pero el sistema es
estocástico, no determinista al 100%.
