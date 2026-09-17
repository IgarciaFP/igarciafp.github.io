from __future__ import annotations

import os
import re
import sys
import time
from pathlib import Path

from bs4 import BeautifulSoup, Comment, Doctype, NavigableString
from deep_translator import GoogleTranslator


ARCHIVOS_ORIGEN = [
    "ciclos/diw/u01_es.html",
    "ciclos/dwec/u01_es.html",
    "ciclos/ssii/u01_es.html",
]

# GoogleTranslator usa un servicio no autenticado y limita la frecuencia.
# Un margen de 0,6 s evita superar las 5 peticiones por segundo indicadas
# por el propio servicio, incluso si el runner comparte la IP con otros jobs.
INTERVALO_MINIMO = 0.6
MAX_INTENTOS = 6
MAX_CARACTERES = 4000
MAX_ELEMENTOS_POR_LOTE = 20
SEPARADOR = "[[[9F3A7C1D]]]"
ETIQUETAS_NO_TRADUCIBLES = {"script", "style", "code", "pre", "kbd", "samp", "noscript"}
ATRIBUTOS_TRADUCIBLES = ("alt", "title", "aria-label", "placeholder")


class TraductorConReintentos:
    def __init__(self) -> None:
        self._translator = GoogleTranslator(source="es", target="en")
        self._ultima_peticion = 0.0
        self._cache: dict[str, str] = {}

    def _esperar_turno(self) -> None:
        espera = INTERVALO_MINIMO - (time.monotonic() - self._ultima_peticion)
        if espera > 0:
            time.sleep(espera)

    def traducir_fragmento(self, texto: str) -> str:
        if texto in self._cache:
            return self._cache[texto]

        for intento in range(1, MAX_INTENTOS + 1):
            self._esperar_turno()
            self._ultima_peticion = time.monotonic()

            try:
                traduccion = self._translator.translate(texto)
                if not traduccion:
                    raise RuntimeError("El servicio devolvió una traducción vacía")
                self._cache[texto] = traduccion
                return traduccion
            except Exception as error:
                if intento == MAX_INTENTOS:
                    raise RuntimeError(
                        f"No se pudo traducir tras {MAX_INTENTOS} intentos: {texto[:80]!r}"
                    ) from error

                espera = min(60, 5 * 2 ** (intento - 1))
                print(
                    f"  Intento {intento}/{MAX_INTENTOS} fallido: {error}. "
                    f"Reintentando en {espera} s...",
                    file=sys.stderr,
                    flush=True,
                )
                time.sleep(espera)

        raise AssertionError("Bucle de reintentos agotado")

    def traducir(self, texto: str) -> str:
        fragmentos = dividir_texto(texto)
        return " ".join(self.traducir_fragmento(fragmento) for fragmento in fragmentos)

    def traducir_lote(self, textos: list[str]) -> list[str]:
        """Agrupa textos en pocas peticiones y conserva la correspondencia 1:1."""
        traducciones = [""] * len(textos)
        pendientes: list[tuple[int, str]] = []

        for indice, texto in enumerate(textos):
            if texto in self._cache:
                traducciones[indice] = self._cache[texto]
            elif len(texto) > MAX_CARACTERES or SEPARADOR in texto:
                traducciones[indice] = self.traducir(texto)
            else:
                pendientes.append((indice, texto))

        lote: list[tuple[int, str]] = []
        longitud = 0

        def procesar_lote() -> None:
            nonlocal lote, longitud
            if not lote:
                return

            originales = [texto for _, texto in lote]
            if len(originales) == 1:
                traducidos = [self.traducir_fragmento(originales[0])]
            else:
                entrada = SEPARADOR.join(originales)
                salida = self.traducir_fragmento(entrada)
                traducidos = [parte.strip() for parte in salida.split(SEPARADOR)]

                # Si el servicio altera el separador, se prioriza la integridad
                # del documento y se repite el lote elemento a elemento.
                if len(traducidos) != len(originales):
                    print(
                        "  El servicio alteró el separador; repitiendo el lote "
                        "elemento a elemento.",
                        file=sys.stderr,
                        flush=True,
                    )
                    traducidos = [self.traducir(texto) for texto in originales]

            for (indice, original), traduccion in zip(lote, traducidos):
                self._cache[original] = traduccion
                traducciones[indice] = traduccion

            lote = []
            longitud = 0

        for pendiente in pendientes:
            _, texto = pendiente
            longitud_candidata = longitud + len(texto)
            if lote:
                longitud_candidata += len(SEPARADOR)

            if lote and (
                len(lote) >= MAX_ELEMENTOS_POR_LOTE
                or longitud_candidata > MAX_CARACTERES
            ):
                procesar_lote()

            lote.append(pendiente)
            longitud += len(texto) + (len(SEPARADOR) if len(lote) > 1 else 0)

        procesar_lote()
        return traducciones


def dividir_texto(texto: str) -> list[str]:
    """Divide textos largos sin superar el máximo por petición."""
    if len(texto) <= MAX_CARACTERES:
        return [texto]

    oraciones = re.split(r"(?<=[.!?])\s+", texto)
    fragmentos: list[str] = []
    actual = ""

    for oracion in oraciones:
        if len(oracion) > MAX_CARACTERES:
            if actual:
                fragmentos.append(actual)
                actual = ""
            while len(oracion) > MAX_CARACTERES:
                corte = oracion.rfind(" ", 0, MAX_CARACTERES + 1)
                if corte < MAX_CARACTERES // 2:
                    corte = MAX_CARACTERES
                fragmentos.append(oracion[:corte].strip())
                oracion = oracion[corte:].strip()

        candidato = f"{actual} {oracion}".strip()
        if actual and len(candidato) > MAX_CARACTERES:
            fragmentos.append(actual)
            actual = oracion
        else:
            actual = candidato

    if actual:
        fragmentos.append(actual)

    return fragmentos


def nodo_traducible(nodo: NavigableString) -> bool:
    if isinstance(nodo, (Comment, Doctype)) or not nodo.strip():
        return False
    if not any(caracter.isalpha() for caracter in nodo):
        return False

    for padre in nodo.parents:
        if getattr(padre, "name", None) in ETIQUETAS_NO_TRADUCIBLES:
            return False
        if getattr(padre, "attrs", {}).get("translate") == "no":
            return False
    return True


def restaurar_espacios(texto: str, traduccion: str) -> str:
    prefijo = texto[: len(texto) - len(texto.lstrip())]
    sufijo = texto[len(texto.rstrip()) :]
    return f"{prefijo}{traduccion}{sufijo}"


def configurar_documento_ingles(soup: BeautifulSoup, ruta_es: Path) -> None:
    if soup.html:
        soup.html["lang"] = "en"

    selector_idioma = soup.select_one("a.language-switch")
    if not selector_idioma:
        return

    selector_idioma["href"] = ruta_es.name
    selector_idioma["hreflang"] = "es"
    selector_idioma["lang"] = "es"
    selector_idioma["aria-label"] = "Leer esta página en español"

    textos = [
        hijo
        for hijo in selector_idioma.children
        if isinstance(hijo, NavigableString) and hijo.strip()
    ]
    if textos:
        textos[-1].replace_with(" Español")
    else:
        selector_idioma.append(" Español")


def traducir_archivo(ruta_es: Path, traductor: TraductorConReintentos) -> None:
    if not ruta_es.exists():
        raise FileNotFoundError(f"No existe el archivo de origen: {ruta_es}")

    print(f"Procesando: {ruta_es}", flush=True)
    soup = BeautifulSoup(ruta_es.read_text(encoding="utf-8"), "html.parser")

    nodos = [nodo for nodo in soup.find_all(string=True) if nodo_traducible(nodo)]
    print(f"  Nodos de texto: {len(nodos)}", flush=True)

    originales = [str(nodo).strip() for nodo in nodos]
    traducciones = traductor.traducir_lote(originales)
    if originales and not any(
        original != traduccion
        for original, traduccion in zip(originales, traducciones)
    ):
        raise RuntimeError(f"El servicio no tradujo ningún texto de {ruta_es}")

    for nodo, traduccion in zip(nodos, traducciones):
        nodo.replace_with(restaurar_espacios(str(nodo), traduccion))

    print(f"  Traducidos: {len(nodos)}/{len(nodos)}", flush=True)

    referencias_atributos: list[tuple[object, str]] = []
    valores_atributos: list[str] = []
    for etiqueta in soup.find_all(True):
        if any(
            getattr(ancestro, "name", None) in ETIQUETAS_NO_TRADUCIBLES
            or getattr(ancestro, "attrs", {}).get("translate") == "no"
            for ancestro in [etiqueta, *etiqueta.parents]
        ):
            continue
        for atributo in ATRIBUTOS_TRADUCIBLES:
            valor = etiqueta.get(atributo)
            if isinstance(valor, str) and valor.strip() and any(c.isalpha() for c in valor):
                referencias_atributos.append((etiqueta, atributo))
                valores_atributos.append(valor.strip())

    for (etiqueta, atributo), traduccion in zip(
        referencias_atributos, traductor.traducir_lote(valores_atributos)
    ):
        etiqueta[atributo] = traduccion

    configurar_documento_ingles(soup, ruta_es)

    ruta_en = Path(str(ruta_es).replace("_es.html", "_en.html"))
    ruta_temporal = ruta_en.with_suffix(f"{ruta_en.suffix}.tmp")
    ruta_temporal.write_text(str(soup), encoding="utf-8")
    os.replace(ruta_temporal, ruta_en)
    print(f"Creado con éxito: {ruta_en}", flush=True)


def main() -> None:
    rutas = [Path(ruta) for ruta in (sys.argv[1:] or ARCHIVOS_ORIGEN)]
    traductor = TraductorConReintentos()
    for ruta in rutas:
        traducir_archivo(ruta, traductor)


if __name__ == "__main__":
    main()
