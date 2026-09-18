from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import torch
from bs4 import BeautifulSoup, Comment, Doctype, NavigableString
from bs4.element import Tag
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


ARCHIVOS_ORIGEN = [
    "ciclos/diw/u01_es.html",
    "ciclos/dwec/u01_es.html",
    "ciclos/ssii/u01_es.html",
]

MODELO = "Helsinki-NLP/opus-mt-es-en"
REVISION_MODELO = "c96e2c5399ebfae4fc43d9669556b9afa74bb69d"
TAMANO_LOTE = 16
MAX_TOKENS_ENTRADA = 450
MAX_TOKENS_SALIDA = 512
ETIQUETAS_NO_TRADUCIBLES = {"script", "style", "code", "pre", "kbd", "samp", "noscript"}
CLASES_NO_TRADUCIBLES = {"axis-label", "code-number", "glyph", "hex-number"}
ATRIBUTOS_TRADUCIBLES = ("alt", "title", "aria-label", "placeholder")


class TraductorOffline:
    def __init__(self) -> None:
        hilos = max(1, min(os.cpu_count() or 2, 4))
        torch.set_num_threads(hilos)

        print(f"Cargando modelo offline: {MODELO}", flush=True)
        solo_archivos_locales = os.environ.get("HF_HUB_OFFLINE") == "1"
        self._tokenizer = AutoTokenizer.from_pretrained(
            MODELO,
            revision=REVISION_MODELO,
            local_files_only=solo_archivos_locales,
        )
        self._model = AutoModelForSeq2SeqLM.from_pretrained(
            MODELO,
            revision=REVISION_MODELO,
            local_files_only=solo_archivos_locales,
        )
        self._model.eval()
        self._cache: dict[str, str] = {}
        print(f"Modelo cargado; usando {hilos} hilos de CPU.", flush=True)

    def _numero_tokens(self, texto: str) -> int:
        return len(self._tokenizer.encode(texto, add_special_tokens=True))

    def _dividir_por_palabras(self, texto: str) -> list[str]:
        fragmentos: list[str] = []
        actual = ""

        for palabra in texto.split():
            candidato = f"{actual} {palabra}".strip()
            if actual and self._numero_tokens(candidato) > MAX_TOKENS_ENTRADA:
                fragmentos.append(actual)
                actual = palabra
            else:
                actual = candidato

        if actual:
            fragmentos.append(actual)
        return fragmentos

    def _dividir_texto(self, texto: str) -> list[str]:
        if self._numero_tokens(texto) <= MAX_TOKENS_ENTRADA:
            return [texto]

        unidades = re.split(r"(?<=[.!?;:])\s+", texto)
        fragmentos: list[str] = []
        actual = ""

        for unidad in unidades:
            if self._numero_tokens(unidad) > MAX_TOKENS_ENTRADA:
                if actual:
                    fragmentos.append(actual)
                    actual = ""
                fragmentos.extend(self._dividir_por_palabras(unidad))
                continue

            candidato = f"{actual} {unidad}".strip()
            if actual and self._numero_tokens(candidato) > MAX_TOKENS_ENTRADA:
                fragmentos.append(actual)
                actual = unidad
            else:
                actual = candidato

        if actual:
            fragmentos.append(actual)
        return fragmentos

    def _traducir_fragmentos(self, fragmentos: list[str]) -> list[str]:
        traducciones: list[str] = []
        total_lotes = (len(fragmentos) + TAMANO_LOTE - 1) // TAMANO_LOTE

        for inicio in range(0, len(fragmentos), TAMANO_LOTE):
            lote = fragmentos[inicio : inicio + TAMANO_LOTE]
            entradas = self._tokenizer(
                lote,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=MAX_TOKENS_ENTRADA,
            )

            with torch.inference_mode():
                salidas = self._model.generate(
                    **entradas,
                    max_length=MAX_TOKENS_SALIDA,
                    num_beams=2,
                    early_stopping=True,
                )

            traducidas = self._tokenizer.batch_decode(salidas, skip_special_tokens=True)
            if len(traducidas) != len(lote):
                raise RuntimeError(
                    "El modelo offline devolvió un lote con un número incorrecto de resultados: "
                    f"esperados {len(lote)}, recibidos {len(traducidas)}"
                )

            entradas_sin_salida = [
                repr(original)
                for original, traduccion in zip(lote, traducidas)
                if not traduccion.strip()
            ]
            if entradas_sin_salida:
                detalle = ", ".join(entradas_sin_salida[:3])
                raise RuntimeError(
                    f"El modelo offline devolvió traducciones vacías para: {detalle}"
                )
            traducciones.extend(texto.strip() for texto in traducidas)

            numero_lote = inicio // TAMANO_LOTE + 1
            if numero_lote % 10 == 0 or numero_lote == total_lotes:
                print(f"  Lotes traducidos: {numero_lote}/{total_lotes}", flush=True)

        return traducciones

    def traducir_lote(self, textos: list[str]) -> list[str]:
        pendientes = [
            texto for texto in dict.fromkeys(textos)
            if texto not in self._cache
        ]
        fragmentos: list[str] = []
        rangos: dict[str, tuple[int, int]] = {}

        for texto in pendientes:
            partes = self._dividir_texto(texto)
            inicio = len(fragmentos)
            fragmentos.extend(partes)
            rangos[texto] = (inicio, len(fragmentos))

        if fragmentos:
            traducidos = self._traducir_fragmentos(fragmentos)
            for original, (inicio, fin) in rangos.items():
                self._cache[original] = " ".join(traducidos[inicio:fin])

        return [self._cache[texto] for texto in textos]


def elemento_no_traducible(elemento: Tag) -> bool:
    atributos = getattr(elemento, "attrs", {})
    clases = atributos.get("class", [])
    if isinstance(clases, str):
        clases = clases.split()

    return (
        getattr(elemento, "name", None) in ETIQUETAS_NO_TRADUCIBLES
        or atributos.get("translate") == "no"
        or bool(set(clases) & CLASES_NO_TRADUCIBLES)
    )


def nodo_traducible(nodo: NavigableString) -> bool:
    if isinstance(nodo, (Comment, Doctype)) or not nodo.strip():
        return False
    if not any(caracter.isalpha() for caracter in nodo):
        return False
    return not any(elemento_no_traducible(padre) for padre in nodo.parents)


def etiqueta_traducible(etiqueta: Tag) -> bool:
    return not any(
        elemento_no_traducible(ancestro)
        for ancestro in [etiqueta, *etiqueta.parents]
    )


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


def traducir_archivo(ruta_es: Path, traductor: TraductorOffline) -> None:
    if not ruta_es.exists():
        raise FileNotFoundError(f"No existe el archivo de origen: {ruta_es}")
    if not ruta_es.name.endswith("_es.html"):
        raise ValueError(f"El archivo debe terminar en _es.html: {ruta_es}")

    print(f"Procesando: {ruta_es}", flush=True)
    soup = BeautifulSoup(ruta_es.read_text(encoding="utf-8"), "html.parser")

    nodos = [nodo for nodo in soup.find_all(string=True) if nodo_traducible(nodo)]
    originales = [str(nodo).strip() for nodo in nodos]
    print(f"  Nodos de texto: {len(nodos)}", flush=True)

    traducciones = traductor.traducir_lote(originales)
    if originales and not any(
        original.casefold() != traduccion.casefold()
        for original, traduccion in zip(originales, traducciones)
    ):
        raise RuntimeError(f"El modelo no tradujo ningún texto de {ruta_es}")

    for nodo, traduccion in zip(nodos, traducciones):
        nodo.replace_with(restaurar_espacios(str(nodo), traduccion))

    referencias: list[tuple[Tag, str]] = []
    valores: list[str] = []
    for etiqueta in soup.find_all(True):
        if not etiqueta_traducible(etiqueta):
            continue
        for atributo in ATRIBUTOS_TRADUCIBLES:
            valor = etiqueta.get(atributo)
            if isinstance(valor, str) and valor.strip() and any(c.isalpha() for c in valor):
                referencias.append((etiqueta, atributo))
                valores.append(valor.strip())

    for (etiqueta, atributo), traduccion in zip(
        referencias, traductor.traducir_lote(valores)
    ):
        etiqueta[atributo] = traduccion

    configurar_documento_ingles(soup, ruta_es)

    ruta_en = ruta_es.with_name(ruta_es.name.replace("_es.html", "_en.html"))
    ruta_temporal = ruta_en.with_suffix(f"{ruta_en.suffix}.tmp")
    ruta_temporal.write_text(str(soup), encoding="utf-8")
    os.replace(ruta_temporal, ruta_en)
    print(f"Creado con éxito: {ruta_en}", flush=True)


def probar_filtro_html() -> None:
    ejemplo = BeautifulSoup(
        "<svg><title>Tabla de caracteres</title>"
        '<text class="glyph">Σ</text>'
        '<text class="hex-number">E4</text></svg>',
        "html.parser",
    )
    if nodo_traducible(ejemplo.select_one(".glyph").string):
        raise RuntimeError("La prueba del filtro intentó traducir un glifo técnico")
    if nodo_traducible(ejemplo.select_one(".hex-number").string):
        raise RuntimeError("La prueba del filtro intentó traducir un código hexadecimal")
    if not nodo_traducible(ejemplo.title.string):
        raise RuntimeError("La prueba del filtro omitió una leyenda traducible")
    print("Prueba del filtro HTML superada.", flush=True)


def probar_motor() -> None:
    probar_filtro_html()
    traductor = TraductorOffline()
    originales = [
        "Hola, mundo.",
        "Diseño de interfaces web.",
        "Este texto se traduce sin utilizar una API externa.",
    ]
    traducciones = traductor.traducir_lote(originales)

    for original, traduccion in zip(originales, traducciones):
        print(f"{original} -> {traduccion}", flush=True)

    if any(
        not traduccion or original.casefold() == traduccion.casefold()
        for original, traduccion in zip(originales, traducciones)
    ):
        raise RuntimeError("La prueba del modelo offline no produjo traducciones válidas")
    print("Prueba del traductor offline superada.", flush=True)


def main() -> None:
    if sys.argv[1:] == ["--smoke-test"]:
        probar_motor()
        return

    if any(argumento.startswith("-") for argumento in sys.argv[1:]):
        raise ValueError("Argumento no reconocido")

    rutas = [Path(ruta) for ruta in (sys.argv[1:] or ARCHIVOS_ORIGEN)]
    traductor = TraductorOffline()
    for ruta in rutas:
        traducir_archivo(ruta, traductor)


if __name__ == "__main__":
    main()
