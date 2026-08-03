import os
import re

directory = '/Users/fluke/MapNexus/Fronend'

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                symbols = set(re.findall(r'[^\x00-\x7F\u0E00-\u0E7F\n\r\t]', content))
                allowed = {'“', '”', '‘', '’', '…', '–', '—', ' ', '​', ' ', '·', '•'}
                found_emojis = [s for s in symbols if s not in allowed]
                if found_emojis:
                    print(f"{file}: {' '.join(found_emojis)}")
            except Exception as e:
                pass
