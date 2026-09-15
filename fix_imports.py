import os
import glob
files = glob.glob(r'c:\Users\moune\art\frontend\src\components\guide-hand\*.tsx')
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    if len(lines) > 0 and lines[0].startswith("import ") and "from 'react';" in lines[0]:
        if "{" in lines[0]:
            lines[0] = lines[0].replace("import  {", "import {")
        else:
            lines.pop(0)
            
    with open(path, 'w', encoding='utf-8') as f:
        f.write(''.join(lines))
print('Fixed imports')
