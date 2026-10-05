import tempfile
import unittest
from pathlib import Path

from bs4 import BeautifulSoup

import traducir


class FakeTranslator(traducir.TraductorOffline):
    def __init__(self, responses=None):
        self._cache = {}
        self.responses = iter(responses) if responses is not None else None
        self.calls = []

    def _dividir_texto(self, texto):
        return [texto]

    def _generar_traducciones(self, lote, *, num_beams=2):
        self.calls.append((list(lote), num_beams))
        if self.responses is not None:
            return next(self.responses)
        return ['English: ' + texto for texto in lote]


class TranslationTests(unittest.TestCase):
    def test_empty_item_is_retried_without_losing_order(self):
        translator = FakeTranslator([['Hello', '', 'Memory'], ['Computer']])
        self.assertEqual(
            translator._traducir_fragmentos(['Hola', 'Ordenador', 'Memoria']),
            ['Hello', 'Computer', 'Memory'],
        )
        self.assertEqual(translator.calls[-1], (['Ordenador'], 1))

    def test_persistent_empty_item_reports_the_input(self):
        translator = FakeTranslator([[''], ['']])
        with self.assertRaisesRegex(RuntimeError, 'La memoria principal'):
            translator._traducir_fragmentos(['La memoria principal'])

    def test_missing_batch_output_is_not_silently_dropped(self):
        translator = FakeTranslator([['Hello']])
        with self.assertRaisesRegex(RuntimeError, 'se esperaban 2'):
            translator._traducir_fragmentos(['Hola', 'Ordenador'])

    def test_line_breaks_share_the_same_translation_cache(self):
        translator = FakeTranslator()
        result = translator.traducir_lote(['Memoria\n principal', 'Memoria principal'])
        self.assertEqual(result, ['English: Memoria principal'] * 2)
        self.assertEqual(translator.calls, [(['Memoria principal'], 2)])

    def test_ascii_codes_symbols_and_opt_out_are_preserved(self):
        soup = BeautifulSoup('''<svg><title>Tabla ASCII</title>
            <text>SI</text><text>CAN</text><text>é</text><text>FE</text>
            <text>ASCII estándar</text></svg><p>α</p>
            <pre>Memoria principal</pre><p translate="no">HOLA</p>''', 'html.parser')
        translatable = [str(node).strip() for node in soup.find_all(string=True)
                        if traducir.nodo_traducible(node)]
        self.assertEqual(translatable, ['Tabla ASCII', 'ASCII estándar'])

    def test_html_preserves_codes_links_and_translates_css_labels(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'u01_es.html'
            source.write_text('''<!DOCTYPE html><html lang="es"><head>
                <style>.x::before {content: "\\f0eb CURIOSIDAD";} /* CURIOSIDAD */</style>
                </head><body><a class="language-switch" href="u01_en.html">English</a>
                <h1 id="sec1">Memoria principal</h1>
                <svg><title>Tabla ASCII</title><text>SI</text><text>é</text>
                <text>FE</text></svg><a href="#sec1">Memoria</a>
                <code>LOAD R1</code></body></html>''', encoding='utf-8')
            traducir.traducir_archivo(source, FakeTranslator())
            output = source.with_name('u01_en.html')
            html = output.read_text(encoding='utf-8')
            soup = BeautifulSoup(html, 'html.parser')
            self.assertEqual(soup.html['lang'], 'en')
            self.assertEqual(soup.h1['id'], 'sec1')
            self.assertEqual(soup.select_one('a.language-switch')['href'], 'u01_es.html')
            self.assertEqual([node.text for node in soup.select('svg text')], ['SI', 'é', 'FE'])
            self.assertEqual(soup.code.text, 'LOAD R1')
            self.assertIn('\\f0eb DID YOU KNOW?', html)
            self.assertIn('/* CURIOSIDAD */', html)
            self.assertFalse(output.with_suffix('.html.tmp').exists())

    def test_failed_translation_does_not_overwrite_existing_page(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'u01_es.html'
            source.write_text('<html><p>Memoria principal</p></html>', encoding='utf-8')
            target = source.with_name('u01_en.html')
            target.write_text('Reviewed English page', encoding='utf-8')
            with self.assertRaisesRegex(RuntimeError, 'Memoria principal'):
                traducir.traducir_archivo(source, FakeTranslator([[''], ['']]))
            self.assertEqual(target.read_text(encoding='utf-8'), 'Reviewed English page')


if __name__ == '__main__':
    unittest.main()
