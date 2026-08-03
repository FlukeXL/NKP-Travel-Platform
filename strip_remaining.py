import os
import re

directory = '/Users/fluke/MapNexus/Fronend'

emojis_to_remove = [
    '✨', '🎇', '🥇', '🥈', '🥉', '👥', '🖼', '💧', '⚗', '🌫', '🏭', '🔥', '💨', '📈', '👁', '☀', '🌧', '📊', '🌡', '🧭',
    '▶', '📷', '💛', '🗨', '🎉', '🌐', '🙈', '⛔', '🏛', '🛍', '🛠', '📜', '📌', '⏳', '❤', '⭐', '📢', '🗺', '✏', '🗑', '🔒',
    '📝', '✎', '🔗', '🌊', '☕', '🍜', '🛕', '🙏', '🌿', '🏃', '🎭', '🛍️', '📍', '✏️', '🚪', '📅', '💬', '😅', '🗺️', '🌫️', '☀️', '🌡️', '🎬', '❤️'
]

# We should also clean up any double spaces or spaces before punctuation caused by removing emojis
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                for emoji in emojis_to_remove:
                    content = content.replace(emoji + ' ', '')
                    content = content.replace(emoji, '')
                    
                    content = content.replace('\uFE0F ', '')
                    content = content.replace('\uFE0F', '')

                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Removed emojis from: {filepath}")
            except Exception as e:
                pass
print("Done")
