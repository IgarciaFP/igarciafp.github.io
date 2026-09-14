from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator
import os
import time

archivos_origen = [
    'ciclos/diw/u01_es.html',
    'ciclos/dwec/u01_es.html',
    'ciclos/ssii/u01_es.html'
]

translator = GoogleTranslator(source='es', target='en')

for ruta_es in archivos_origen:
    if not os.path.exists(ruta_es):
        continue

    print(f'Procesando: {ruta_es}')
    with open(ruta_es, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    # 1. Extraer los nodos de texto que no estén dentro de script/style
    nodos_texto = [
        elem for elem in soup.find_all(string=True)
        if elem.parent.name not in ['script', 'style'] and elem.strip()
    ]

    if nodos_texto:
        textos_originales = [node.string for node in nodos_texto]
        
        try:
            # 2. Traducir todos los textos del archivo en bloque
            textos_traducidos = translator.translate_batch(textos_originales)
            
            # 3. Reemplazar cada nodo original por su traducción
            for node, traduccion in zip(nodos_texto, textos_traducidos):
                if traduccion:
                    node.replace_with(traduccion)

        except Exception as e:
            print(f'Error traduciendo {ruta_es}: {e}')

    # 4. Guardar archivo traducido
    ruta_en = ruta_es.replace('_es.html', '_en.html')
    with open(ruta_en, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    print(f'Creado con éxito: {ruta_en}')
    time.sleep(1) # Pausa de seguridad entre archivos
