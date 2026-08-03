import os
import glob

html_files = []
for root, dirs, files in os.walk('/Users/fluke/MapNexus/Fronend'):
    if 'components' in root:
        continue
    for file in files:
        if file.endswith('.html'):
            if file == 'admin.html' and 'pages' in root:
                continue
            html_files.append(os.path.join(root, file))

css_tag = '  <link rel="stylesheet" href="/Fronend/css/ai-tour-guide.css" />\n'
html_script_tags = """  <!-- ================= AI TOUR GUIDE ================= -->
  <div data-include="/Fronend/components/ai-tour-guide.html"></div>
  <script src="/Fronend/js/ai-tour-guide.js"></script>
"""

for file_path in html_files:
    with open(file_path, 'r') as f:
        content = f.read()

    # Skip if already injected
    if 'ai-tour-guide.css' in content or 'ai-tour-guide.html' in content:
        continue

    # Inject CSS before </head>
    if '</head>' in content:
        content = content.replace('</head>', css_tag + '</head>')
    
    # Inject HTML and JS before </body>
    if '</body>' in content:
        content = content.replace('</body>', html_script_tags + '</body>')
    
    with open(file_path, 'w') as f:
        f.write(content)
        
    print(f"Injected into {file_path}")

print("Done")
