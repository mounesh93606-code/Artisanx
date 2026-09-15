import os
import glob
files = glob.glob(r'c:\Users\moune\art\frontend\src\components\guide-hand\*.tsx')
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("import , {", "import {")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
print('Fixed imports')
