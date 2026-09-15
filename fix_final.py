import os

path = r'c:\Users\moune\art\frontend\src\components\guide-hand\AnimatedHand.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("ease: 'easeInOut'", "ease: 'easeInOut' as any")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = r'c:\Users\moune\art\frontend\src\pages\artisan\ArtisanHome.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('GuidanceWorkflow, ', '').replace(', GuidanceWorkflow', '').replace('GuidanceWorkflow', '')

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed remaining TS errors')
