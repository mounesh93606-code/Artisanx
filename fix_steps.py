import os
import re

files = [
    r'c:\Users\moune\art\frontend\src\components\product\Step1Photo.tsx',
    r'c:\Users\moune\art\frontend\src\components\product\Step2Voice.tsx',
    r'c:\Users\moune\art\frontend\src\components\product\Step3ReviewAI.tsx',
    r'c:\Users\moune\art\frontend\src\components\product\Step4Materials.tsx',
    r'c:\Users\moune\art\frontend\src\components\product\Step5Pricing.tsx',
    r'c:\Users\moune\art\frontend\src\components\product\Step6Publish.tsx'
]

for path in files:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace const { t } = useTranslation(); with const { t: tGlobal } = useTranslation();
        content = content.replace('const { t } = useTranslation();', 'const { t: tGlobal } = useTranslation();')
        
        # Fix the t('...') calls to tGlobal('...')
        content = re.sub(r"t\('([^']+)'\)", r"tGlobal('\1')", content)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

print('Fixed Step components')
